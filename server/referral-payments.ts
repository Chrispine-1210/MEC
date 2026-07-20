import crypto from "crypto";
import type { Request, Response } from "express";
import Stripe from "stripe";
import { and, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import { env } from "./env";
import { calculateCommissionReversalTarget, getProviderPaymentMismatch, resolvePaymentStatus } from "./payment-state";
import {
  analytics,
  commissionRules,
  commissions,
  fraudSignals,
  ledgerEntries,
  paymentStatusEvents,
  payments,
  payoutRequests,
  referralCampaigns,
  referralClicks,
  referralCodes,
  referralRelationships,
  referrals,
  stripeEvents,
  users,
  walletAccounts,
  type Commission,
  type InsertCommissionRule,
  type InsertReferralCampaign,
  type Payment,
  type ReferralRelationship,
  type User,
  type WalletAccount,
} from "@shared/schema";

const REFERRAL_COOKIE = "mec_referral";
const VISITOR_COOKIE = "mec_visitor";
const ATTRIBUTION_DAYS = 30;
const REQUIRED_STRIPE_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
] as const;
const STRIPE_EVENT_STALE_AFTER_MS = 5 * 60 * 1000;
const PAYMENT_RECEIPT_STALE_AFTER_MS = 5 * 60 * 1000;
const PAYMENT_INTEGRATION_MARKER = "mec_checkout_v1";

type CheckoutParams = {
  productCode: "application_support_deposit";
  idempotencyKey: string;
};

type PaymentProduct = {
  code: CheckoutParams["productCode"];
  name: string;
  productType: string;
  amount: number;
  currency: string;
};

export type PaymentActivationReadiness = {
  ready: boolean;
  enabled: boolean;
  provider: "stripe";
  mode: "live" | "test" | "unknown";
  secretConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookUrlConfigured: boolean;
  appUrlConfigured: boolean;
  providerReachable: boolean | null;
  chargesEnabled: boolean | null;
  webhookEndpointVerified: boolean | null;
  requiredEventsConfigured: boolean | null;
  checkedAt: string;
  blockingReasons: Array<{ code: string; message: string }>;
};

export type StripeEventProcessingResult = {
  claimed: boolean;
  duplicate: boolean;
  processingStatus: string;
  payment: Payment | null;
  statusChanged: boolean;
};

const getPaymentProducts = (): Record<CheckoutParams["productCode"], PaymentProduct> => ({
  application_support_deposit: {
    code: "application_support_deposit",
    name: "Application support deposit",
    productType: "application_support",
    amount: env.PAYMENT_APPLICATION_SUPPORT_AMOUNT,
    currency: env.PAYMENT_APPLICATION_SUPPORT_CURRENCY.toUpperCase(),
  },
});

type ReferralDashboard = {
  referralCode: string | null;
  referralLink: string | null;
  stats: {
    clicks: number;
    signups: number;
    paidConversions: number;
    conversionRate: number;
    pendingEarnings: number;
    availableEarnings: number;
    lifetimeEarned: number;
  };
  wallet: WalletAccount | null;
  referrals: Array<{
    id: number;
    referredUserId: number;
    referredEmail: string;
    status: string;
    fraudStatus: string;
    createdAt: Date | null;
    activatedAt: Date | null;
    commissionAmount: number;
    commissionStatus: string | null;
    releaseAt: Date | null;
  }>;
  ledger: Array<typeof ledgerEntries.$inferSelect>;
};

const getConfiguredAppOrigin = () => {
  if (!env.PUBLIC_APP_URL) return null;
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    if (env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
};

const getCheckoutOrigin = (req: Request) => {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) return configuredOrigin;
  if (env.NODE_ENV === "production") {
    const error = new Error("The secure checkout return URL is not configured.");
    (error as Error & { status?: number; code?: string }).status = 503;
    (error as Error & { status?: number; code?: string }).code = "payment_app_url_missing";
    throw error;
  }
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
};

const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

const randomCodeSuffix = () => crypto.randomBytes(3).toString("hex").toUpperCase();

const hashValue = (value?: string | null) => {
  if (!value) return null;
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(value)
    .digest("hex");
};

const parseCookies = (cookieHeader?: string) => {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name || rest.length === 0) return;
    cookies.set(name, decodeURIComponent(rest.join("=")));
  });

  return cookies;
};

const setTrackingCookie = (res: Response, name: string, value: string, maxAgeDays: number) => {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  const encoded = encodeURIComponent(value);
  res.append(
    "Set-Cookie",
    `${name}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`,
  );
};

const getVisitorId = (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies.get(VISITOR_COOKIE);
  if (existing) return existing;

  const visitorId = crypto.randomUUID();
  setTrackingCookie(res, VISITOR_COOKIE, visitorId, 365);
  return visitorId;
};

let stripeClient: Stripe | null | undefined;
let paymentReadinessCache: { expiresAt: number; value: PaymentActivationReadiness } | null = null;

const getStripe = () => {
  if (stripeClient !== undefined) return stripeClient;
  stripeClient = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY, {
        maxNetworkRetries: 2,
        timeout: env.STRIPE_REQUEST_TIMEOUT_MS,
      })
    : null;
  return stripeClient;
};

const getStripeMode = (): PaymentActivationReadiness["mode"] => {
  if (env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) return "live";
  if (env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return "test";
  return "unknown";
};

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "").toLowerCase();

export const getPaymentCatalog = () => Object.values(getPaymentProducts());

export const resetPaymentReadinessCache = () => {
  paymentReadinessCache = null;
  stripeClient = undefined;
};

export const getPaymentActivationReadiness = async (options: { cacheTtlMs?: number } = {}) => {
  const now = Date.now();
  if (paymentReadinessCache && paymentReadinessCache.expiresAt > now) {
    return paymentReadinessCache.value;
  }

  const enabled = env.PAYMENTS_ENABLED !== false;
  const secretConfigured = Boolean(env.STRIPE_SECRET_KEY);
  const webhookSecretConfigured = Boolean(env.STRIPE_WEBHOOK_SECRET);
  const webhookUrlConfigured = Boolean(env.STRIPE_WEBHOOK_URL);
  const appUrlConfigured = Boolean(getConfiguredAppOrigin());
  const mode = getStripeMode();
  const blockingReasons: PaymentActivationReadiness["blockingReasons"] = [];
  let providerReachable: boolean | null = null;
  let chargesEnabled: boolean | null = null;
  let webhookEndpointVerified: boolean | null = null;
  let requiredEventsConfigured: boolean | null = null;

  if (!enabled) blockingReasons.push({ code: "payments_disabled", message: "Payments are disabled by configuration." });
  if (!secretConfigured) blockingReasons.push({ code: "stripe_secret_missing", message: "Stripe credentials are not configured." });
  if (!webhookSecretConfigured) blockingReasons.push({ code: "stripe_webhook_secret_missing", message: "Stripe webhook signing is not configured." });
  if (!webhookUrlConfigured) blockingReasons.push({ code: "stripe_webhook_url_missing", message: "The production Stripe webhook URL is not configured." });
  if (env.NODE_ENV === "production" && !appUrlConfigured) {
    blockingReasons.push({ code: "payment_app_url_missing", message: "A valid HTTPS PUBLIC_APP_URL is required for checkout return URLs." });
  }
  if (env.NODE_ENV === "production" && mode !== "live") {
    blockingReasons.push({ code: "stripe_live_key_required", message: "Production checkout requires a Stripe live-mode secret key." });
  }

  const stripe = getStripe();
  if (enabled && stripe && webhookUrlConfigured) {
    try {
      const [account, webhookEndpoints] = await Promise.all([
        stripe.accounts.retrieveCurrent(),
        stripe.webhookEndpoints.list({ limit: 100 }),
      ]);
      providerReachable = true;
      chargesEnabled = account.charges_enabled === true;
      const expectedUrl = normalizeUrl(env.STRIPE_WEBHOOK_URL!);
      const endpoint = webhookEndpoints.data.find(
        (item) => item.status === "enabled" && normalizeUrl(item.url) === expectedUrl,
      );
      webhookEndpointVerified = Boolean(endpoint);
      requiredEventsConfigured = endpoint
        ? endpoint.enabled_events.includes("*") || REQUIRED_STRIPE_EVENTS.every((eventType) => endpoint.enabled_events.includes(eventType))
        : false;

      if (!chargesEnabled) {
        blockingReasons.push({ code: "stripe_charges_disabled", message: "The Stripe account is not enabled to accept charges." });
      }
      if (!webhookEndpointVerified) {
        blockingReasons.push({ code: "stripe_webhook_endpoint_missing", message: "The configured webhook URL is not enabled in Stripe." });
      } else if (!requiredEventsConfigured) {
        blockingReasons.push({ code: "stripe_webhook_events_incomplete", message: "The Stripe webhook is missing required payment event subscriptions." });
      }
    } catch (error) {
      providerReachable = false;
      chargesEnabled = false;
      webhookEndpointVerified = false;
      requiredEventsConfigured = false;
      const code = error instanceof Stripe.errors.StripeError ? error.code || error.type : "stripe_unreachable";
      blockingReasons.push({ code: "stripe_provider_verification_failed", message: `Stripe provider verification failed (${code}).` });
    }
  }

  const value: PaymentActivationReadiness = {
    ready:
      enabled &&
      secretConfigured &&
      webhookSecretConfigured &&
      webhookUrlConfigured &&
      (env.NODE_ENV !== "production" || appUrlConfigured) &&
      (env.NODE_ENV !== "production" || mode === "live") &&
      providerReachable === true &&
      chargesEnabled === true &&
      webhookEndpointVerified === true &&
      requiredEventsConfigured === true,
    enabled,
    provider: "stripe",
    mode,
    secretConfigured,
    webhookSecretConfigured,
    webhookUrlConfigured,
    appUrlConfigured,
    providerReachable,
    chargesEnabled,
    webhookEndpointVerified,
    requiredEventsConfigured,
    checkedAt: new Date().toISOString(),
    blockingReasons,
  };

  paymentReadinessCache = {
    value,
    expiresAt: now + Math.max(5_000, options.cacheTtlMs ?? 120_000),
  };
  return value;
};

const toStripeId = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
};

export const getReferralCookieCode = (req: Request) => {
  const cookies = parseCookies(req.headers.cookie);
  const code = cookies.get(REFERRAL_COOKIE);
  return code ? normalizeCode(code) : null;
};

export const ensureUserGrowthRecords = async (userId: number, requestedCurrency = "USD") => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  let code = user.referralCode ? normalizeCode(user.referralCode) : "";

  if (!code) {
    code = `MEC${userId}${randomCodeSuffix()}`;
    await db.update(users).set({ referralCode: code, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  await db
    .insert(referralCodes)
    .values({ userId, code, status: "active" })
    .onConflictDoNothing({ target: referralCodes.code });

  await db
    .insert(walletAccounts)
    .values({
      userId,
      currency: (requestedCurrency || user.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY).toUpperCase(),
    })
    .onConflictDoNothing({ target: walletAccounts.userId });

  return code;
};

export const trackReferralClick = async (req: Request, res: Response, codeParam: string) => {
  const code = normalizeCode(codeParam);
  if (!code) return null;

  const [record] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  if (!record || record.status !== "active") return null;

  const now = new Date();
  if (record.expiresAt && record.expiresAt <= now) return null;
  if (record.maxUses !== null && record.useCount >= record.maxUses) return null;

  const visitorId = getVisitorId(req, res);
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      .map((key) => [key, req.query[key]])
      .filter(([, value]) => typeof value === "string" && value.length > 0),
  );

  await db.insert(referralClicks).values({
    referralCodeId: record.id,
    campaignId: record.campaignId,
    referrerId: record.userId,
    visitorId,
    ipHash: hashValue(req.ip || req.socket.remoteAddress),
    userAgentHash: hashValue(req.get("user-agent")),
    deviceFingerprintHash: hashValue(req.get("x-device-fingerprint")),
    landingUrl: req.originalUrl,
    utm: Object.keys(utm).length ? utm : null,
    riskScore: 0,
  });

  setTrackingCookie(res, REFERRAL_COOKIE, code, ATTRIBUTION_DAYS);
  return record;
};

const createFraudSignal = async (
  relationshipId: number,
  userId: number,
  signalType: string,
  score: number,
  metadata?: Record<string, unknown>,
) => {
  await db.insert(fraudSignals).values({
    userId,
    referralRelationshipId: relationshipId,
    signalType,
    severity: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    score,
    metadata: metadata ?? null,
  });
};

export const attachReferralToNewUser = async (user: User, req: Request, explicitCode?: string | null) => {
  const code = explicitCode ? normalizeCode(explicitCode) : getReferralCookieCode(req);
  if (!code) return null;

  const [record] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  if (!record || record.status !== "active" || record.userId === user.id) return null;

  const now = new Date();
  if (record.expiresAt && record.expiresAt <= now) return null;
  if (record.maxUses !== null && record.useCount >= record.maxUses) return null;

  let fraudScore = 0;
  const emailDomain = user.email.split("@")[1]?.toLowerCase() || "";
  const disposableDomains = new Set(["mailinator.com", "10minutemail.com", "tempmail.com", "guerrillamail.com"]);
  if (disposableDomains.has(emailDomain)) fraudScore += 25;

  const [{ count: pendingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralRelationships)
    .where(and(eq(referralRelationships.referrerId, record.userId), eq(referralRelationships.status, "signup_pending")));
  if ((pendingCount ?? 0) >= 10) fraudScore += 20;

  const fraudStatus = fraudScore >= 70 ? "review" : fraudScore >= 40 ? "hold" : "clear";

  const [relationship] = await db
    .insert(referralRelationships)
    .values({
      referrerId: record.userId,
      referredUserId: user.id,
      referralCodeId: record.id,
      campaignId: record.campaignId,
      attributionModel: "last_click",
      status: "signup_pending",
      fraudStatus,
    })
    .onConflictDoNothing({ target: referralRelationships.referredUserId })
    .returning();

  if (!relationship) return null;

  await db
    .update(referralCodes)
    .set({ useCount: sql`${referralCodes.useCount} + 1` })
    .where(eq(referralCodes.id, record.id));

  if (fraudScore > 0) {
    await createFraudSignal(relationship.id, user.id, "signup_risk_score", fraudScore, { emailDomain });
  }

  await db
    .update(referrals)
    .set({
      referredUserId: user.id,
      status: "signup_pending",
      completedAt: new Date(),
    })
    .where(and(eq(referrals.referrerId, record.userId), eq(referrals.referredEmail, user.email)));

  return relationship;
};

const ensureWallet = async (userId: number, currency: string) => {
  await db
    .insert(walletAccounts)
    .values({ userId, currency: currency.toUpperCase() })
    .onConflictDoNothing({ target: walletAccounts.userId });

  const [wallet] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, userId)).limit(1);
  if (!wallet) throw new Error("Wallet account could not be created");
  return wallet;
};

const getRuleForPayment = async (
  relationship: ReferralRelationship,
  payment: Payment,
) => {
  const rules = await db
    .select()
    .from(commissionRules)
    .where(and(eq(commissionRules.status, "active"), eq(commissionRules.level, relationship.level)))
    .orderBy(desc(commissionRules.createdAt));

  return (
    rules.find((rule) => rule.campaignId === relationship.campaignId && rule.productType === payment.productType) ??
    rules.find((rule) => rule.productType === payment.productType && rule.campaignId === null) ??
    rules.find((rule) => rule.campaignId === relationship.campaignId && rule.productType === null) ??
    rules.find((rule) => rule.productType === null && rule.campaignId === null) ??
    null
  );
};

const calculateCommissionAmount = async (
  relationship: ReferralRelationship,
  payment: Payment,
) => {
  const rule = await getRuleForPayment(relationship, payment);
  if (!rule) return null;

  const baseAmount = payment.amountNet ?? payment.amountTotal;
  if (rule.minPaymentAmount !== null && baseAmount < rule.minPaymentAmount) return null;

  let amount = 0;
  if (rule.calculationType === "percent" || rule.calculationType === "hybrid") {
    amount += Math.floor((baseAmount * rule.percentBps) / 10000);
  }
  if (rule.calculationType === "flat" || rule.calculationType === "hybrid") {
    amount += rule.flatAmount;
  }

  if (relationship.campaignId) {
    const [campaign] = await db
      .select()
      .from(referralCampaigns)
      .where(eq(referralCampaigns.id, relationship.campaignId))
      .limit(1);
    if (campaign) {
      amount = Math.floor((amount * campaign.boostBps) / 10000);
    }
  }

  if (rule.maxCommissionAmount !== null) {
    amount = Math.min(amount, rule.maxCommissionAmount);
  }

  return amount > 0
    ? {
        amount,
        ruleId: rule.id,
        releaseDelayDays: rule.releaseDelayDays,
      }
    : null;
};

const recordPendingCommission = async (
  payment: Payment,
  relationship: ReferralRelationship,
  riskScore: number,
) => {
  const calculated = await calculateCommissionAmount(relationship, payment);
  if (!calculated) return null;

  if (relationship.fraudStatus === "review" || riskScore >= 70) {
    await createFraudSignal(relationship.id, payment.userId, "commission_manual_review", riskScore || 70, {
      paymentId: payment.id,
    });
    return null;
  }

  const releaseAt = new Date(Date.now() + calculated.releaseDelayDays * 24 * 60 * 60 * 1000);
  const idempotencyKey = `commission:${payment.id}:${relationship.id}:${relationship.level}:${calculated.ruleId}`;

  let [commission] = await db
    .insert(commissions)
    .values({
      paymentId: payment.id,
      referralRelationshipId: relationship.id,
      beneficiaryUserId: relationship.referrerId,
      ruleId: calculated.ruleId,
      level: relationship.level,
      grossPaymentAmount: payment.amountTotal,
      commissionAmount: calculated.amount,
      currency: payment.currency,
      status: relationship.fraudStatus === "hold" || riskScore >= 40 ? "pending_review" : "pending_release",
      releaseAt,
      riskScore,
      idempotencyKey,
    })
    .onConflictDoNothing({ target: commissions.idempotencyKey })
    .returning();

  if (!commission) {
    [commission] = await db
      .select()
      .from(commissions)
      .where(eq(commissions.idempotencyKey, idempotencyKey))
      .limit(1);
  }
  if (!commission || commission.status !== "pending_release") return commission ?? null;

  const wallet = await ensureWallet(relationship.referrerId, payment.currency);
  const ledgerKey = `ledger:pending-credit:${commission.id}`;

  await db.transaction(async (tx) => {
    const [ledgerEntry] = await tx
      .insert(ledgerEntries)
      .values({
        walletAccountId: wallet.id,
        userId: relationship.referrerId,
        commissionId: commission.id,
        direction: "credit",
        balanceType: "pending",
        amount: commission.commissionAmount,
        currency: commission.currency,
        entryType: "commission_pending",
        idempotencyKey: ledgerKey,
      })
      .onConflictDoNothing({ target: ledgerEntries.idempotencyKey })
      .returning({ id: ledgerEntries.id });

    if (ledgerEntry) {
      await tx
        .update(walletAccounts)
        .set({ pendingBalance: sql`${walletAccounts.pendingBalance} + ${commission.commissionAmount}` })
        .where(eq(walletAccounts.id, wallet.id));
    }
  });

  return commission;
};

const findPaymentByStripeIdentifiers = async (identifiers: {
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  invoiceId?: string | null;
  checkoutReference?: string | null;
  userId?: number | null;
}) => {
  if (identifiers.checkoutSessionId) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeCheckoutSessionId, identifiers.checkoutSessionId))
      .limit(1);
    if (payment) return payment;
  }

  if (identifiers.paymentIntentId) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, identifiers.paymentIntentId))
      .limit(1);
    if (payment) return payment;
  }

  if (identifiers.invoiceId) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeInvoiceId, identifiers.invoiceId))
      .limit(1);
    if (payment) return payment;
  }

  if (identifiers.checkoutReference && identifiers.userId) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.checkoutReference, identifiers.checkoutReference),
        eq(payments.userId, identifiers.userId),
      ))
      .limit(1);
    if (payment) return payment;
  }

  return null;
};

const recordPaymentStatusEvent = async (input: {
  paymentId: number;
  status: string;
  providerStatus?: string | null;
  stripeEventId?: string | null;
  idempotencyKey: string;
  details?: Record<string, unknown> | null;
}) => {
  await db
    .insert(paymentStatusEvents)
    .values({
      paymentId: input.paymentId,
      status: input.status,
      providerStatus: input.providerStatus ?? null,
      stripeEventId: input.stripeEventId ?? null,
      idempotencyKey: input.idempotencyKey,
      details: input.details ?? null,
    })
    .onConflictDoNothing({ target: paymentStatusEvents.idempotencyKey });
};

type PaymentUpsertData = {
  userId: number;
  paymentMethod?: string | null;
  checkoutReference?: string | null;
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  amountTotal: number;
  amountNet?: number | null;
  currency: string;
  status: string;
  providerStatus?: string | null;
  productType: string;
  productName?: string | null;
  quantity?: number;
  metadata?: Record<string, unknown> | null;
  failureCode?: string | null;
  failureReason?: string | null;
  paidAt?: Date | null;
};

const updatePaymentOptimistically = async (initialPayment: Payment, data: PaymentUpsertData) => {
  let existing = initialPayment;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const effectiveStatus = resolvePaymentStatus(existing.status, data.status);
    const statusChanged = existing.status !== effectiveStatus;
    const [updated] = await db
      .update(payments)
      .set({
        checkoutReference: data.checkoutReference ?? existing.checkoutReference,
        paymentMethod: data.paymentMethod ?? existing.paymentMethod,
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripePaymentIntentId: data.stripePaymentIntentId ?? existing.stripePaymentIntentId,
        stripeInvoiceId: data.stripeInvoiceId ?? existing.stripeInvoiceId,
        stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        amountTotal: data.amountTotal ?? existing.amountTotal,
        amountNet: data.amountNet ?? existing.amountNet,
        currency: data.currency || existing.currency,
        status: effectiveStatus,
        providerStatus: effectiveStatus === data.status
          ? data.providerStatus ?? existing.providerStatus
          : existing.providerStatus,
        productType: data.productType || existing.productType,
        productName: data.productName ?? existing.productName,
        quantity: data.quantity ?? existing.quantity,
        metadata: { ...(existing.metadata ?? {}), ...(data.metadata ?? {}) },
        failureCode: data.failureCode ?? (effectiveStatus === "paid" ? null : existing.failureCode),
        failureReason: data.failureReason ?? (effectiveStatus === "paid" ? null : existing.failureReason),
        receiptStatus: statusChanged && effectiveStatus === "paid" ? "pending" : existing.receiptStatus,
        paidAt: effectiveStatus === "paid" ? data.paidAt ?? existing.paidAt ?? new Date() : existing.paidAt,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, existing.id), eq(payments.status, existing.status)))
      .returning();
    if (updated) return { payment: updated, statusChanged };

    const [refreshed] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, existing.id))
      .limit(1);
    if (!refreshed) throw new Error("Payment disappeared during provider reconciliation");
    existing = refreshed;
  }

  throw new Error("Payment changed too frequently to reconcile safely");
};

const validateProviderPayment = (existing: Payment, data: PaymentUpsertData) => {
  const mismatch = getProviderPaymentMismatch(existing, data);
  if (mismatch) throw new Error(`Stripe event ${mismatch} does not match the local payment`);
};

const upsertPayment = async (data: PaymentUpsertData, options: { requireExisting?: boolean } = {}) => {
  const identifiers = {
    checkoutSessionId: data.stripeCheckoutSessionId,
    paymentIntentId: data.stripePaymentIntentId,
    invoiceId: data.stripeInvoiceId,
    checkoutReference: data.checkoutReference,
    userId: data.userId,
  };
  const existing = await findPaymentByStripeIdentifiers(identifiers);

  if (existing) {
    if (options.requireExisting) validateProviderPayment(existing, data);
    return updatePaymentOptimistically(existing, data);
  }
  if (options.requireExisting) throw new Error("Stripe event is not linked to a server-created payment");

  try {
    const [payment] = await db
      .insert(payments)
      .values({
        userId: data.userId,
        provider: "stripe",
        paymentMethod: data.paymentMethod ?? null,
        checkoutReference: data.checkoutReference,
        stripeCustomerId: data.stripeCustomerId,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeInvoiceId: data.stripeInvoiceId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        amountTotal: data.amountTotal,
        amountNet: data.amountNet ?? data.amountTotal,
        currency: data.currency.toUpperCase(),
        status: data.status,
        providerStatus: data.providerStatus ?? null,
        productType: data.productType,
        productName: data.productName ?? null,
        quantity: data.quantity ?? 1,
        metadata: data.metadata ?? null,
        failureCode: data.failureCode ?? null,
        failureReason: data.failureReason ?? null,
        receiptStatus: data.status === "paid" ? "pending" : "not_required",
        paidAt: data.status === "paid" ? data.paidAt ?? new Date() : null,
        updatedAt: new Date(),
      })
      .returning();

    return { payment, statusChanged: true };
  } catch (error) {
    const concurrentPayment = await findPaymentByStripeIdentifiers(identifiers);
    if (!concurrentPayment) throw error;
    return updatePaymentOptimistically(concurrentPayment, data);
  }
};

const finalizePaymentCommission = async (payment: Payment) => {
  const [relationship] = await db
    .select()
    .from(referralRelationships)
    .where(eq(referralRelationships.referredUserId, payment.userId))
    .limit(1);

  if (!relationship || relationship.status === "blocked") return null;

  const riskScore = relationship.fraudStatus === "hold" ? 45 : relationship.fraudStatus === "review" ? 75 : 0;

  await db
    .update(referralRelationships)
    .set({
      firstPaymentId: relationship.firstPaymentId ?? payment.id,
      status: "activated",
      activatedAt: relationship.activatedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(referralRelationships.id, relationship.id));

  await db
    .update(referrals)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(and(eq(referrals.referrerId, relationship.referrerId), eq(referrals.referredUserId, payment.userId)));

  return recordPendingCommission(payment, relationship, riskScore);
};

export const createCheckoutSession = async (userId: number, params: CheckoutParams, req: Request) => {
  const readiness = await getPaymentActivationReadiness();
  if (!readiness.ready) {
    const error = new Error("Secure checkout is temporarily unavailable because the payment provider is not fully activated.");
    (error as Error & { status?: number; code?: string }).status = 503;
    (error as Error & { status?: number; code?: string }).code = "payment_provider_unavailable";
    throw error;
  }

  const stripe = getStripe();
  if (!stripe) {
    const error = new Error("Secure checkout is temporarily unavailable.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const product = getPaymentProducts()[params.productCode];
  if (!product) {
    const error = new Error("The requested payment product is not available.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const [existingAttempt] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.checkoutReference, params.idempotencyKey)))
    .limit(1);
  if (existingAttempt?.stripeCheckoutSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(existingAttempt.stripeCheckoutSessionId);
    if (existingSession.status === "open" && existingSession.url) {
      return {
        id: existingSession.id,
        url: existingSession.url,
        status: existingAttempt.status,
        product,
      };
    }

    return {
      id: existingSession.id,
      url: null,
      status: existingAttempt.status,
      product,
    };
  }

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create(
      {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { user_id: String(user.id) },
      },
      { idempotencyKey: `customer:user:${user.id}` },
    );
    stripeCustomerId = customer.id;
    await db.update(users).set({ stripeCustomerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const origin = getCheckoutOrigin(req);
  const [relationship] = await db
    .select()
    .from(referralRelationships)
    .where(eq(referralRelationships.referredUserId, user.id))
    .limit(1);

  const clientReferenceId = params.idempotencyKey;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: String(user.id),
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            unit_amount: product.amount,
            product_data: {
              name: product.name,
              metadata: { product_code: product.code, product_type: product.productType },
            },
          },
          quantity: 1,
        },
      ],
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        user_id: String(user.id),
        product_code: product.code,
        product_type: product.productType,
        product_name: product.name,
        referral_relationship_id: relationship ? String(relationship.id) : "",
        client_reference_id: clientReferenceId,
        integration: PAYMENT_INTEGRATION_MARKER,
      },
      payment_intent_data: {
        receipt_email: user.email,
        metadata: {
          user_id: String(user.id),
          product_code: product.code,
          product_type: product.productType,
          product_name: product.name,
          checkout_reference: clientReferenceId,
          referral_relationship_id: relationship ? String(relationship.id) : "",
          integration: PAYMENT_INTEGRATION_MARKER,
        },
      },
    },
    { idempotencyKey: `checkout:${user.id}:${product.code}:${clientReferenceId}` },
  );

  try {
    const { payment } = await upsertPayment({
      userId: user.id,
      paymentMethod: session.payment_method_types?.join(",") || "card",
      checkoutReference: clientReferenceId,
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      amountTotal: session.amount_total ?? product.amount,
      amountNet: session.amount_subtotal ?? product.amount,
      currency: (session.currency || product.currency).toUpperCase(),
      status: "checkout_created",
      providerStatus: session.status || "open",
      productType: product.productType,
      productName: product.name,
      quantity: 1,
      metadata: {
        ...(session.metadata ?? {}),
        provider_mode: readiness.mode,
      },
    });
    await recordPaymentStatusEvent({
      paymentId: payment.id,
      status: "checkout_created",
      providerStatus: session.status,
      idempotencyKey: `checkout-created:${session.id}`,
      details: { productCode: product.code },
    });
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  }

  return { id: session.id, url: session.url, status: "checkout_created", product };
};

const processCheckoutCompleted = async (session: Stripe.Checkout.Session, stripeEventId: string) => {
  if (session.metadata?.integration !== PAYMENT_INTEGRATION_MARKER) return null;
  const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const status = session.payment_status === "paid" ? "paid" : "processing";

  const result = await upsertPayment({
    userId,
    paymentMethod: session.payment_method_types?.join(",") || null,
    checkoutReference: session.metadata?.client_reference_id ?? null,
    stripeCustomerId: toStripeId(session.customer),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: toStripeId(session.payment_intent),
    stripeSubscriptionId: toStripeId(session.subscription),
    amountTotal: session.amount_total ?? 0,
    amountNet: session.amount_total ?? 0,
    currency: (session.currency || env.STRIPE_DEFAULT_CURRENCY).toUpperCase(),
    status,
    providerStatus: session.payment_status,
    productType: session.metadata?.product_type || (session.mode === "subscription" ? "subscription" : "application"),
    productName: session.metadata?.product_name ?? null,
    metadata: session.metadata ?? null,
    paidAt: status === "paid" ? new Date() : null,
  }, { requireExisting: true });
  await recordPaymentStatusEvent({
    paymentId: result.payment.id,
    stripeEventId,
    status: result.payment.status,
    providerStatus: session.payment_status,
    idempotencyKey: `stripe-status:${stripeEventId}:${result.payment.status}`,
    details: result.payment.status === status ? null : { ignoredIncomingStatus: status },
  });

  if (result.payment.status === "paid") {
    await finalizePaymentCommission(result.payment);
  }
  return result;
};

const processInvoicePaid = async (invoice: Stripe.Invoice, stripeEventId: string) => {
  if (invoice.metadata?.integration !== PAYMENT_INTEGRATION_MARKER) return null;
  const userId = Number(invoice.metadata?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const legacyInvoiceFields = invoice as Stripe.Invoice & {
    payment_intent?: unknown;
    subscription?: unknown;
  };
  const paymentIntentId =
    typeof legacyInvoiceFields.payment_intent === "string"
      ? legacyInvoiceFields.payment_intent
      : toStripeId(legacyInvoiceFields.payment_intent);
  const subscriptionId =
    typeof legacyInvoiceFields.subscription === "string"
      ? legacyInvoiceFields.subscription
      : toStripeId(legacyInvoiceFields.subscription);

  const result = await upsertPayment({
    userId,
    stripeCustomerId: toStripeId(invoice.customer),
    stripePaymentIntentId: paymentIntentId ?? null,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscriptionId ?? null,
    amountTotal: invoice.amount_paid,
    amountNet: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    providerStatus: invoice.status,
    productType: invoice.metadata?.product_type || "subscription",
    productName: invoice.metadata?.product_name ?? null,
    metadata: invoice.metadata ?? null,
    paidAt: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
  }, { requireExisting: true });

  await recordPaymentStatusEvent({
    paymentId: result.payment.id,
    stripeEventId,
    status: result.payment.status,
    providerStatus: invoice.status,
    idempotencyKey: `stripe-status:${stripeEventId}:${result.payment.status}`,
    details: result.payment.status === "paid" ? null : { ignoredIncomingStatus: "paid" },
  });
  if (result.payment.status === "paid") await finalizePaymentCommission(result.payment);
  return result;
};

const processPaymentIntent = async (
  intent: Stripe.PaymentIntent,
  status: "processing" | "paid" | "failed",
  stripeEventId: string,
) => {
  if (intent.metadata?.integration !== PAYMENT_INTEGRATION_MARKER) return null;
  const userId = Number(intent.metadata?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const lastError = intent.last_payment_error;
  const result = await upsertPayment({
    userId,
    paymentMethod: intent.payment_method_types?.join(",") || null,
    checkoutReference: intent.metadata?.checkout_reference ?? null,
    stripeCustomerId: toStripeId(intent.customer),
    stripePaymentIntentId: intent.id,
    amountTotal: intent.amount_received || intent.amount,
    amountNet: intent.amount_received || intent.amount,
    currency: intent.currency.toUpperCase(),
    status,
    providerStatus: intent.status,
    productType: intent.metadata?.product_type || "application",
    productName: intent.metadata?.product_name ?? null,
    metadata: intent.metadata ?? null,
    failureCode: status === "failed" ? lastError?.code ?? "payment_failed" : null,
    failureReason: status === "failed" ? lastError?.message ?? "Stripe could not complete the payment." : null,
    paidAt: status === "paid" ? new Date() : null,
  }, { requireExisting: true });
  await recordPaymentStatusEvent({
    paymentId: result.payment.id,
    stripeEventId,
    status: result.payment.status,
    providerStatus: intent.status,
    idempotencyKey: `stripe-status:${stripeEventId}:${result.payment.status}`,
    details: result.payment.status === status
      ? status === "failed" ? { failureCode: lastError?.code ?? "payment_failed" } : null
      : { ignoredIncomingStatus: status },
  });
  if (result.payment.status === "paid") await finalizePaymentCommission(result.payment);
  return result;
};

const updateExistingPaymentStatus = async (input: {
  identifiers: { checkoutSessionId?: string | null; paymentIntentId?: string | null; invoiceId?: string | null };
  status: string;
  providerStatus?: string | null;
  stripeEventId: string;
  failureCode?: string | null;
  failureReason?: string | null;
}) => {
  let existing = await findPaymentByStripeIdentifiers(input.identifiers);
  if (!existing) return null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const effectiveStatus = resolvePaymentStatus(existing.status, input.status);
    const statusChanged = existing.status !== effectiveStatus;
    const [payment] = await db
      .update(payments)
      .set({
        status: effectiveStatus,
        providerStatus: effectiveStatus === input.status
          ? input.providerStatus ?? existing.providerStatus
          : existing.providerStatus,
        failureCode: effectiveStatus === input.status ? input.failureCode ?? existing.failureCode : existing.failureCode,
        failureReason: effectiveStatus === input.status ? input.failureReason ?? existing.failureReason : existing.failureReason,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, existing.id), eq(payments.status, existing.status)))
      .returning();
    if (payment) {
      await recordPaymentStatusEvent({
        paymentId: payment.id,
        stripeEventId: input.stripeEventId,
        status: effectiveStatus,
        providerStatus: input.providerStatus,
        idempotencyKey: `stripe-status:${input.stripeEventId}:${effectiveStatus}`,
        details: effectiveStatus === input.status
          ? input.failureCode ? { failureCode: input.failureCode } : null
          : { ignoredIncomingStatus: input.status },
      });
      return { payment, statusChanged };
    }

    const [refreshed] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, existing.id))
      .limit(1);
    if (!refreshed) return null;
    existing = refreshed;
  }

  throw new Error("Payment changed too frequently to reconcile safely");
};

const adjustPaymentCommissionsForReversal = async (
  payment: Payment,
  paymentReversedAmount: number,
  reason: "partial_refund" | "refunded" | "disputed",
) => {
  const paymentCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.paymentId, payment.id));

  for (const initialCommission of paymentCommissions) {
    let commission = initialCommission;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const targetReversedAmount = calculateCommissionReversalTarget({
        commissionAmount: commission.commissionAmount,
        grossPaymentAmount: commission.grossPaymentAmount,
        paymentReversedAmount,
        fullReversal: reason !== "partial_refund",
      });
      const currentReversedAmount = Math.min(commission.reversedAmount, commission.commissionAmount);
      if (targetReversedAmount <= currentReversedAmount) break;

      const reversalAmount = targetReversedAmount - currentReversedAmount;
      const fullyReversed = targetReversedAmount >= commission.commissionAmount;
      const creditedBalance = commission.status === "pending_release" || commission.status === "released";
      const wasReleased = commission.status === "released";
      const wallet = creditedBalance
        ? await ensureWallet(commission.beneficiaryUserId, commission.currency)
        : null;
      let adjusted = false;

      await db.transaction(async (tx) => {
        const [updatedCommission] = await tx
          .update(commissions)
          .set({
            reversedAmount: targetReversedAmount,
            status: fullyReversed ? "reversed" : commission.status,
            reversedAt: fullyReversed ? new Date() : commission.reversedAt,
          })
          .where(and(
            eq(commissions.id, commission.id),
            eq(commissions.reversedAmount, commission.reversedAmount),
            eq(commissions.status, commission.status),
          ))
          .returning({ id: commissions.id });
        if (!updatedCommission) return;

        if (wallet) {
          const [ledgerEntry] = await tx
            .insert(ledgerEntries)
            .values({
              walletAccountId: wallet.id,
              userId: commission.beneficiaryUserId,
              commissionId: commission.id,
              direction: "debit",
              balanceType: wasReleased ? "available" : "pending",
              amount: reversalAmount,
              currency: commission.currency,
              entryType: reason,
              idempotencyKey: `ledger:reverse:${commission.id}:${targetReversedAmount}`,
            })
            .onConflictDoNothing({ target: ledgerEntries.idempotencyKey })
            .returning({ id: ledgerEntries.id });
          if (!ledgerEntry) throw new Error("Commission reversal ledger entry already exists");

          await tx
            .update(walletAccounts)
            .set(
              wasReleased
                ? {
                    availableBalance: sql`${walletAccounts.availableBalance} - ${reversalAmount}`,
                    lifetimeEarned: sql`${walletAccounts.lifetimeEarned} - ${reversalAmount}`,
                  }
                : { pendingBalance: sql`${walletAccounts.pendingBalance} - ${reversalAmount}` },
            )
            .where(eq(walletAccounts.id, wallet.id));
        }
        adjusted = true;
      });

      if (adjusted) break;
      const [refreshed] = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, commission.id))
        .limit(1);
      if (!refreshed) break;
      commission = refreshed;
    }
  }
};

const processRefundOrDispute = async (
  object: Stripe.Charge | Stripe.Dispute,
  reason: "refunded" | "disputed",
  stripeEventId: string,
) => {
  let chargeCandidate =
    "charge" in object && typeof object.charge !== "undefined" ? object.charge : object;
  if (typeof chargeCandidate === "string") {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe is not configured");
    chargeCandidate = await stripe.charges.retrieve(chargeCandidate);
  }
  const charge = chargeCandidate as Stripe.Charge;
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return null;

  const payment = await findPaymentByStripeIdentifiers({ paymentIntentId });
  if (!payment) return null;

  const chargeAmount = Math.max(charge.amount || payment.amountTotal, 1);
  const providerRefundedAmount = Math.max(0, Math.min(charge.amount_refunded || 0, chargeAmount));
  const fullyRefunded = reason === "refunded"
    && (charge.refunded || providerRefundedAmount >= chargeAmount);
  const incomingStatus = reason === "disputed"
    ? "disputed"
    : fullyRefunded ? "refunded" : "partially_refunded";
  let existing = payment;
  let updated: Payment | null = null;
  let statusChanged = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const effectiveStatus = resolvePaymentStatus(existing.status, incomingStatus);
    const cumulativeRefundedAmount = Math.max(existing.amountRefunded, providerRefundedAmount);
    [updated] = await db
      .update(payments)
      .set({
        status: effectiveStatus,
        providerStatus: effectiveStatus === incomingStatus ? incomingStatus : existing.providerStatus,
        amountRefunded: cumulativeRefundedAmount,
        refundedAt: fullyRefunded ? existing.refundedAt ?? new Date() : existing.refundedAt,
        disputedAt: reason === "disputed" ? existing.disputedAt ?? new Date() : existing.disputedAt,
        updatedAt: new Date(),
      })
      .where(and(
        eq(payments.id, existing.id),
        eq(payments.status, existing.status),
        eq(payments.amountRefunded, existing.amountRefunded),
      ))
      .returning();
    if (updated) {
      statusChanged = existing.status !== effectiveStatus;
      break;
    }

    const [refreshed] = await db.select().from(payments).where(eq(payments.id, existing.id)).limit(1);
    if (!refreshed) return null;
    existing = refreshed;
  }
  if (!updated) throw new Error("Payment changed too frequently to reconcile a refund safely");

  await adjustPaymentCommissionsForReversal(
    updated,
    reason === "disputed" || fullyRefunded ? updated.amountTotal : updated.amountRefunded,
    reason === "disputed" ? "disputed" : fullyRefunded ? "refunded" : "partial_refund",
  );
  await recordPaymentStatusEvent({
    paymentId: updated.id,
    stripeEventId,
    status: updated.status,
    providerStatus: incomingStatus,
    idempotencyKey: `stripe-status:${stripeEventId}:${incomingStatus}`,
    details: {
      chargeAmount,
      amountRefunded: updated.amountRefunded,
      fullyRefunded,
    },
  });
  return { payment: updated, statusChanged };
};

export const persistStripeEvent = async (event: Stripe.Event) => {
  const object = event.data.object as { id?: string };
  const [saved] = await db
    .insert(stripeEvents)
    .values({
      stripeEventId: event.id,
      eventType: event.type,
      objectId: object.id || "unknown",
      payload: event as unknown as Record<string, unknown>,
      processingStatus: "received",
    })
    .onConflictDoNothing({ target: stripeEvents.stripeEventId })
    .returning();

  if (saved) return { record: saved, created: true };
  const [existing] = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id))
    .limit(1);
  if (!existing) throw new Error("Stripe event could not be persisted");
  return { record: existing, created: false };
};

export const verifyStripeWebhookEvent = (req: Request) => {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) throw new Error("Raw webhook body was not captured");

  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) throw new Error("Missing Stripe signature");

  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
};

const resolvePaymentForStripeEvent = async (event: Stripe.Event) => {
  const object = event.data.object;
  if (event.type.startsWith("checkout.session.")) {
    return findPaymentByStripeIdentifiers({ checkoutSessionId: (object as Stripe.Checkout.Session).id });
  }
  if (event.type.startsWith("payment_intent.")) {
    return findPaymentByStripeIdentifiers({ paymentIntentId: (object as Stripe.PaymentIntent).id });
  }
  if (event.type.startsWith("invoice.")) {
    return findPaymentByStripeIdentifiers({ invoiceId: (object as Stripe.Invoice).id });
  }
  return null;
};

export const processStripeEvent = async (event: Stripe.Event): Promise<StripeEventProcessingResult> => {
  const staleBefore = new Date(Date.now() - STRIPE_EVENT_STALE_AFTER_MS);
  const [claimed] = await db
    .update(stripeEvents)
    .set({
      processingStatus: "processing",
      processingStartedAt: new Date(),
      lastAttemptAt: new Date(),
      attemptCount: sql`${stripeEvents.attemptCount} + 1`,
      error: null,
    })
    .where(and(
      eq(stripeEvents.stripeEventId, event.id),
      or(
        eq(stripeEvents.processingStatus, "received"),
        eq(stripeEvents.processingStatus, "failed"),
        and(
          eq(stripeEvents.processingStatus, "processing"),
          or(isNull(stripeEvents.processingStartedAt), lt(stripeEvents.processingStartedAt, staleBefore)),
        ),
      ),
    ))
    .returning();

  if (!claimed) {
    const [existing] = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1);
    const payment = await resolvePaymentForStripeEvent(event);
    return {
      claimed: false,
      duplicate: true,
      processingStatus: existing?.processingStatus ?? "unknown",
      payment,
      statusChanged: false,
    };
  }

  try {
    let result: { payment: Payment; statusChanged: boolean } | null = null;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        result = await processCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
        break;
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        result = await updateExistingPaymentStatus({
          identifiers: {
            checkoutSessionId: session.id,
            paymentIntentId: toStripeId(session.payment_intent),
          },
          status: "failed",
          providerStatus: session.payment_status,
          stripeEventId: event.id,
          failureCode: "async_payment_failed",
          failureReason: "Stripe reported that the asynchronous payment failed.",
        });
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        result = await updateExistingPaymentStatus({
          identifiers: { checkoutSessionId: session.id },
          status: "expired",
          providerStatus: session.status,
          stripeEventId: event.id,
          failureCode: "checkout_expired",
          failureReason: "The checkout session expired before payment was completed.",
        });
        break;
      }
      case "payment_intent.succeeded":
        result = await processPaymentIntent(event.data.object as Stripe.PaymentIntent, "paid", event.id);
        break;
      case "payment_intent.processing":
        result = await processPaymentIntent(event.data.object as Stripe.PaymentIntent, "processing", event.id);
        break;
      case "payment_intent.payment_failed":
        result = await processPaymentIntent(event.data.object as Stripe.PaymentIntent, "failed", event.id);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        result = await processInvoicePaid(event.data.object as Stripe.Invoice, event.id);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        result = await updateExistingPaymentStatus({
          identifiers: { invoiceId: invoice.id },
          status: "failed",
          providerStatus: invoice.status,
          stripeEventId: event.id,
          failureCode: "invoice_payment_failed",
          failureReason: "Stripe could not collect the invoice payment.",
        });
        break;
      }
      case "charge.refunded":
        result = await processRefundOrDispute(event.data.object as Stripe.Charge, "refunded", event.id);
        break;
      case "charge.dispute.created":
        result = await processRefundOrDispute(event.data.object as Stripe.Dispute, "disputed", event.id);
        break;
      default:
        break;
    }

    await db
      .update(stripeEvents)
      .set({
        processingStatus: "processed",
        processedAt: new Date(),
        processingStartedAt: null,
        error: null,
      })
      .where(eq(stripeEvents.stripeEventId, event.id));
    return {
      claimed: true,
      duplicate: false,
      processingStatus: "processed",
      payment: result?.payment ?? await resolvePaymentForStripeEvent(event),
      statusChanged: result?.statusChanged ?? false,
    };
  } catch (error) {
    await db
      .update(stripeEvents)
      .set({
        processingStatus: "failed",
        processingStartedAt: null,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 2_000),
      })
      .where(eq(stripeEvents.stripeEventId, event.id));
    throw error;
  }
};

export const reconcileStripeEvents = async (limit = 50) => {
  const staleBefore = new Date(Date.now() - STRIPE_EVENT_STALE_AFTER_MS);
  const pending = await db
    .select()
    .from(stripeEvents)
    .where(or(
      eq(stripeEvents.processingStatus, "received"),
      eq(stripeEvents.processingStatus, "failed"),
      and(
        eq(stripeEvents.processingStatus, "processing"),
        or(isNull(stripeEvents.processingStartedAt), lt(stripeEvents.processingStartedAt, staleBefore)),
      ),
    ))
    .orderBy(stripeEvents.createdAt)
    .limit(Math.max(1, Math.min(limit, 100)));

  let processed = 0;
  let failed = 0;
  for (const record of pending) {
    try {
      await processStripeEvent(record.payload as unknown as Stripe.Event);
      processed += 1;
    } catch {
      failed += 1;
    }
  }
  return { selected: pending.length, processed, failed };
};

const paymentPublicShape = (payment: Payment) => ({
  id: payment.id,
  status: payment.status,
  providerStatus: payment.providerStatus,
  paymentMethod: payment.paymentMethod,
  amountTotal: payment.amountTotal,
  amountRefunded: payment.amountRefunded,
  currency: payment.currency,
  productName: payment.productName,
  receiptStatus: payment.receiptStatus,
  failureReason: payment.failureReason,
  paidAt: payment.paidAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

export const reconcileCheckoutSession = async (userId: number, checkoutSessionId: string) => {
  const existing = await findPaymentByStripeIdentifiers({ checkoutSessionId });
  if (!existing || existing.userId !== userId) {
    const error = new Error("Payment was not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const stripe = getStripe();
  if (!stripe) {
    const error = new Error("Payment provider status is temporarily unavailable");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const sessionUserId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (sessionUserId !== userId) {
    const error = new Error("Payment does not belong to the authenticated user");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  const reconciliationId = `checkout-reconcile:${session.id}:${session.status}:${session.payment_status}`;
  if (session.payment_status === "paid") {
    await processCheckoutCompleted(session, reconciliationId);
  } else if (session.status === "expired") {
    await updateExistingPaymentStatus({
      identifiers: { checkoutSessionId: session.id },
      status: "expired",
      providerStatus: session.status,
      stripeEventId: reconciliationId,
      failureCode: "checkout_expired",
      failureReason: "The checkout session expired before payment was completed.",
    });
  } else if (session.status === "complete") {
    await updateExistingPaymentStatus({
      identifiers: { checkoutSessionId: session.id },
      status: "processing",
      providerStatus: session.payment_status,
      stripeEventId: reconciliationId,
    });
  }

  const latest = await findPaymentByStripeIdentifiers({ checkoutSessionId });
  if (!latest || latest.userId !== userId) throw new Error("Payment status could not be reconciled");
  return {
    payment: paymentPublicShape(latest),
    checkout: { id: session.id, status: session.status, paymentStatus: session.payment_status },
  };
};

export const cancelCheckoutSession = async (userId: number, checkoutSessionId: string) => {
  const payment = await findPaymentByStripeIdentifiers({ checkoutSessionId });
  if (!payment || payment.userId !== userId) {
    const error = new Error("Payment was not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  const stripe = getStripe();
  if (!stripe) {
    const error = new Error("Payment provider status is temporarily unavailable");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  let session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const sessionUserId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (sessionUserId !== userId) {
    const error = new Error("Payment does not belong to the authenticated user");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  if (session.status === "open") {
    session = await stripe.checkout.sessions.expire(checkoutSessionId);
    await updateExistingPaymentStatus({
      identifiers: { checkoutSessionId },
      status: "cancelled",
      providerStatus: session.status,
      stripeEventId: `checkout-cancelled:${checkoutSessionId}`,
      failureCode: "checkout_cancelled",
      failureReason: "The customer cancelled Stripe Checkout before payment was completed.",
    });
  } else if (session.payment_status === "paid") {
    await processCheckoutCompleted(session, `checkout-cancel-reconcile:${checkoutSessionId}`);
  } else if (session.status === "complete") {
    await updateExistingPaymentStatus({
      identifiers: { checkoutSessionId },
      status: "processing",
      providerStatus: session.payment_status,
      stripeEventId: `checkout-cancel-processing:${checkoutSessionId}`,
    });
  }

  const latest = await findPaymentByStripeIdentifiers({ checkoutSessionId });
  if (!latest || latest.userId !== userId) throw new Error("Payment cancellation could not be reconciled");
  return { payment: paymentPublicShape(latest), checkout: { id: session.id, status: session.status } };
};

export const claimPaymentReceipt = async (paymentId: number) => {
  const staleBefore = new Date(Date.now() - PAYMENT_RECEIPT_STALE_AFTER_MS);
  const [payment] = await db
    .update(payments)
    .set({
      receiptStatus: "processing",
      receiptLastAttemptAt: new Date(),
      receiptError: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.status, "paid"),
      or(
        eq(payments.receiptStatus, "pending"),
        eq(payments.receiptStatus, "failed"),
        and(
          eq(payments.receiptStatus, "processing"),
          or(isNull(payments.receiptLastAttemptAt), lt(payments.receiptLastAttemptAt, staleBefore)),
        ),
      ),
    ))
    .returning();

  if (!payment) return null;
  const [user] = await db.select().from(users).where(eq(users.id, payment.userId)).limit(1);
  if (!user) {
    await markPaymentReceiptFailed(payment.id, "Payment user was not found");
    return null;
  }
  return { payment, user };
};

export const markPaymentReceiptQueued = async (paymentId: number, status: "queued" | "sent") => {
  const [payment] = await db
    .update(payments)
    .set({
      receiptStatus: status,
      receiptQueuedAt: new Date(),
      receiptError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, paymentId), eq(payments.receiptStatus, "processing")))
    .returning();
  return payment ?? null;
};

export const markPaymentReceiptFailed = async (paymentId: number, reason: string) => {
  const [payment] = await db
    .update(payments)
    .set({
      receiptStatus: "failed",
      receiptError: reason.slice(0, 2_000),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();
  return payment ?? null;
};

export const listPaymentReceiptCandidates = async (limit = 50) => {
  const staleBefore = new Date(Date.now() - PAYMENT_RECEIPT_STALE_AFTER_MS);
  return db
    .select({ id: payments.id })
    .from(payments)
    .where(and(
      eq(payments.status, "paid"),
      or(
        eq(payments.receiptStatus, "pending"),
        eq(payments.receiptStatus, "failed"),
        and(
          eq(payments.receiptStatus, "processing"),
          or(isNull(payments.receiptLastAttemptAt), lt(payments.receiptLastAttemptAt, staleBefore)),
        ),
      ),
    ))
    .orderBy(payments.createdAt)
    .limit(Math.max(1, Math.min(limit, 100)));
};

export const listAdminPayments = async (query: {
  status?: string;
  provider?: string;
  paymentMethod?: string;
  from?: Date;
  to?: Date;
  search?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  const limit = Math.max(1, Math.min(query.limit ?? 50, 5_000));
  const offset = Math.max(0, query.offset ?? 0);
  const search = query.search?.trim();
  const filter = and(
    query.status ? eq(payments.status, query.status) : undefined,
    query.provider ? eq(payments.provider, query.provider) : undefined,
    query.paymentMethod ? ilike(payments.paymentMethod, `%${query.paymentMethod}%`) : undefined,
    query.from ? gte(payments.createdAt, query.from) : undefined,
    query.to ? lte(payments.createdAt, query.to) : undefined,
    search
      ? or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(payments.stripeCheckoutSessionId, `%${search}%`),
          ilike(payments.stripePaymentIntentId, `%${search}%`),
          ilike(payments.checkoutReference, `%${search}%`),
        )
      : undefined,
  );

  const baseQuery = db
    .select({
      payment: payments,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id));
  const rows = await baseQuery
    .where(filter)
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .where(filter);

  return { rows, total: total ?? 0, limit, offset };
};

export const listAdminStripeEvents = async (query: {
  status?: string;
  eventType?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  const limit = Math.max(1, Math.min(query.limit ?? 100, 500));
  const offset = Math.max(0, query.offset ?? 0);
  const filter = and(
    query.status ? eq(stripeEvents.processingStatus, query.status) : undefined,
    query.eventType ? eq(stripeEvents.eventType, query.eventType) : undefined,
  );
  const [rows, [count]] = await Promise.all([
    db
      .select({
        id: stripeEvents.id,
        stripeEventId: stripeEvents.stripeEventId,
        eventType: stripeEvents.eventType,
        objectId: stripeEvents.objectId,
        processingStatus: stripeEvents.processingStatus,
        attemptCount: stripeEvents.attemptCount,
        processedAt: stripeEvents.processedAt,
        error: stripeEvents.error,
        createdAt: stripeEvents.createdAt,
      })
      .from(stripeEvents)
      .where(filter)
      .orderBy(desc(stripeEvents.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(stripeEvents).where(filter),
  ]);
  return { rows, total: count?.total ?? 0, limit, offset };
};

export const getAdminPaymentDetail = async (paymentId: number) => {
  const [row] = await db
    .select({
      payment: payments,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!row) return null;
  const statusHistory = await db
    .select()
    .from(paymentStatusEvents)
    .where(eq(paymentStatusEvents.paymentId, paymentId))
    .orderBy(desc(paymentStatusEvents.createdAt));
  return { ...row, statusHistory };
};

export const requestStripeRefund = async (input: {
  paymentId: number;
  amount?: number;
  reason: string;
  requestedBy: number;
  idempotencyKey: string;
}) => {
  const readiness = await getPaymentActivationReadiness();
  const stripe = getStripe();
  if (!readiness.ready || !stripe) {
    const error = new Error("Stripe refunds are unavailable until the live provider is fully verified.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const eventKey = `admin-refund:${input.paymentId}:${input.idempotencyKey}`;
  const reservation = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`refund:${input.paymentId}`}))`);
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!payment) {
      const error = new Error("Payment not found");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }
    if (!payment.stripePaymentIntentId || !["paid", "partially_refunded"].includes(payment.status)) {
      const error = new Error("Only settled Stripe payments can be refunded.");
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    const [existingRequest] = await tx
      .select()
      .from(paymentStatusEvents)
      .where(eq(paymentStatusEvents.idempotencyKey, eventKey))
      .limit(1);
    const existingDetails = existingRequest?.details && typeof existingRequest.details === "object"
      ? existingRequest.details as Record<string, unknown>
      : null;
    const existingAmount = typeof existingDetails?.amount === "number" ? existingDetails.amount : null;
    const existingReason = typeof existingDetails?.reason === "string" ? existingDetails.reason : null;
    if (existingRequest && (
      existingAmount === null
      || existingReason !== input.reason
      || (input.amount !== undefined && existingAmount !== input.amount)
    )) {
      const error = new Error("This refund idempotency key was already used with different request details.");
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    const pendingRequests = await tx
      .select({ idempotencyKey: paymentStatusEvents.idempotencyKey, details: paymentStatusEvents.details })
      .from(paymentStatusEvents)
      .where(and(eq(paymentStatusEvents.paymentId, payment.id), eq(paymentStatusEvents.status, "refund_requested")));
    const reservedAmount = pendingRequests.reduce((total, request) => {
      if (request.idempotencyKey === eventKey || !request.details || typeof request.details !== "object") return total;
      const details = request.details as Record<string, unknown>;
      return details.requestStatus === "failed" || typeof details.amount !== "number"
        ? total
        : total + details.amount;
    }, 0);
    const availableAmount = Math.max(0, payment.amountTotal - payment.amountRefunded - reservedAmount);
    const amount = existingAmount ?? input.amount ?? availableAmount;
    if (!Number.isInteger(amount) || amount <= 0 || (!existingRequest && amount > availableAmount)) {
      const error = new Error("Refund amount must be a positive value no greater than the unreserved payment amount.");
      (error as Error & { status?: number }).status = 400;
      throw error;
    }

    if (existingRequest) {
      const providerRefundId = typeof existingDetails?.providerRefundId === "string"
        ? existingDetails.providerRefundId
        : null;
      const requestStatus = typeof existingDetails?.requestStatus === "string"
        ? existingDetails.requestStatus
        : "submitting";
      return { payment, amount, providerRefundId, requestStatus };
    }

    await tx.insert(paymentStatusEvents).values({
      paymentId: payment.id,
      status: "refund_requested",
      providerStatus: payment.providerStatus,
      idempotencyKey: eventKey,
      details: {
        amount,
        currency: payment.currency,
        reason: input.reason,
        requestedBy: input.requestedBy,
        requestStatus: "submitting",
      },
    });
    return { payment, amount, providerRefundId: null, requestStatus: "submitting" };
  });

  const { payment, amount } = reservation;
  const paymentIntentId = payment.stripePaymentIntentId;
  if (!paymentIntentId) {
    throw new Error("Refund reservation is missing a Stripe PaymentIntent.");
  }
  if (reservation.providerRefundId && reservation.requestStatus !== "failed") {
    return {
      paymentId: payment.id,
      refundId: reservation.providerRefundId,
      amount,
      currency: payment.currency,
      status: reservation.requestStatus,
    };
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount,
        metadata: {
          payment_id: String(payment.id),
          requested_by: String(input.requestedBy),
          internal_reason: input.reason.slice(0, 450),
        },
      },
      { idempotencyKey: eventKey },
    );
    await db
      .update(paymentStatusEvents)
      .set({
        details: {
          amount,
          currency: payment.currency,
          reason: input.reason,
          requestedBy: input.requestedBy,
          requestStatus: refund.status,
          providerRefundId: refund.id,
        },
      })
      .where(eq(paymentStatusEvents.idempotencyKey, eventKey));
    return {
      paymentId: payment.id,
      refundId: refund.id,
      amount,
      currency: payment.currency,
      status: refund.status,
    };
  } catch (error) {
    await db
      .update(paymentStatusEvents)
      .set({
        details: {
          amount,
          currency: payment.currency,
          reason: input.reason,
          requestedBy: input.requestedBy,
          requestStatus: "failed",
          errorCode: error instanceof Stripe.errors.StripeError ? error.code ?? error.type : "refund_request_failed",
        },
      })
      .where(eq(paymentStatusEvents.idempotencyKey, eventKey));
    throw error;
  }
};

export const getAdminPaymentSummary = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [statusRows, [today], [eventFailures], [receiptFailures]] = await Promise.all([
    db
      .select({
        status: payments.status,
        count: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${payments.amountTotal}), 0)::int`,
      })
      .from(payments)
      .groupBy(payments.status),
    db
      .select({
        count: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(greatest(${payments.amountTotal} - ${payments.amountRefunded}, 0)), 0)::int`,
      })
      .from(payments)
      .where(and(inArray(payments.status, ["paid", "partially_refunded"]), gte(payments.paidAt, startOfToday))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(stripeEvents)
      .where(eq(stripeEvents.processingStatus, "failed")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(eq(payments.receiptStatus, "failed")),
  ]);

  return {
    byStatus: statusRows,
    paidToday: today ?? { count: 0, amount: 0 },
    failedWebhookEvents: eventFailures?.count ?? 0,
    failedReceipts: receiptFailures?.count ?? 0,
  };
};

export const releaseEligibleCommissions = async () => {
  const eligible = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.status, "pending_release"), lte(commissions.releaseAt, new Date())))
    .limit(100);

  let released = 0;

  for (const commission of eligible) {
    const wallet = await ensureWallet(commission.beneficiaryUserId, commission.currency);
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(commissions)
        .set({ status: "released", releasedAt: new Date() })
        .where(and(eq(commissions.id, commission.id), eq(commissions.status, "pending_release")))
        .returning();

      if (!updated) return;

      const releaseAmount = Math.max(0, updated.commissionAmount - updated.reversedAmount);
      if (releaseAmount === 0) {
        await tx
          .update(commissions)
          .set({ status: "reversed", reversedAt: updated.reversedAt ?? new Date() })
          .where(eq(commissions.id, updated.id));
        return;
      }

      await tx
        .insert(ledgerEntries)
        .values([
          {
            walletAccountId: wallet.id,
            userId: commission.beneficiaryUserId,
            commissionId: commission.id,
            direction: "debit",
            balanceType: "pending",
            amount: releaseAmount,
            currency: commission.currency,
            entryType: "commission_released_pending_debit",
            idempotencyKey: `ledger:release-pending:${commission.id}`,
          },
          {
            walletAccountId: wallet.id,
            userId: commission.beneficiaryUserId,
            commissionId: commission.id,
            direction: "credit",
            balanceType: "available",
            amount: releaseAmount,
            currency: commission.currency,
            entryType: "commission_released_available_credit",
            idempotencyKey: `ledger:release-available:${commission.id}`,
          },
        ])
        .onConflictDoNothing({ target: ledgerEntries.idempotencyKey });

      await tx
        .update(walletAccounts)
        .set({
          pendingBalance: sql`${walletAccounts.pendingBalance} - ${releaseAmount}`,
          availableBalance: sql`${walletAccounts.availableBalance} + ${releaseAmount}`,
          lifetimeEarned: sql`${walletAccounts.lifetimeEarned} + ${releaseAmount}`,
        })
        .where(eq(walletAccounts.id, wallet.id));
      released += 1;
    });
  }

  return released;
};

export const getReferralDashboard = async (userId: number, origin: string): Promise<ReferralDashboard> => {
  const code = await ensureUserGrowthRecords(userId);
  const [codeRecord] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  const [wallet] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, userId)).limit(1);

  const userClicks = await db.select().from(referralClicks).where(eq(referralClicks.referrerId, userId));
  const relationships = await db
    .select()
    .from(referralRelationships)
    .where(eq(referralRelationships.referrerId, userId))
    .orderBy(desc(referralRelationships.createdAt));
  const beneficiaryCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.beneficiaryUserId, userId))
    .orderBy(desc(commissions.createdAt));
  const ledger = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(50);

  const referredUsers = relationships.length
    ? await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, relationships.map((relationship) => relationship.referredUserId)))
    : [];
  const emailByUserId = new Map(referredUsers.map((item) => [item.id, item.email]));
  const commissionsByRelationshipId = new Map<number, Commission[]>();
  beneficiaryCommissions.forEach((commission) => {
    const list = commissionsByRelationshipId.get(commission.referralRelationshipId) ?? [];
    list.push(commission);
    commissionsByRelationshipId.set(commission.referralRelationshipId, list);
  });

  const referralsList = relationships.map((relationship) => {
    const relationshipCommissions = commissionsByRelationshipId.get(relationship.id) ?? [];
    const total = relationshipCommissions.reduce((sum, item) => sum + item.commissionAmount, 0);
    const latest = relationshipCommissions[0];

    return {
      id: relationship.id,
      referredUserId: relationship.referredUserId,
      referredEmail: emailByUserId.get(relationship.referredUserId) ?? "Unknown user",
      status: relationship.status,
      fraudStatus: relationship.fraudStatus,
      createdAt: relationship.createdAt,
      activatedAt: relationship.activatedAt,
      commissionAmount: total,
      commissionStatus: latest?.status ?? null,
      releaseAt: latest?.releaseAt ?? null,
    };
  });

  const paidConversions = relationships.filter((relationship) => relationship.status === "activated").length;
  const signups = relationships.length;

  return {
    referralCode: code,
    referralLink: codeRecord ? `${origin}/r/${codeRecord.code}` : null,
    stats: {
      clicks: userClicks.length,
      signups,
      paidConversions,
      conversionRate: userClicks.length > 0 ? Math.round((paidConversions / userClicks.length) * 1000) / 10 : 0,
      pendingEarnings: wallet?.pendingBalance ?? 0,
      availableEarnings: wallet?.availableBalance ?? 0,
      lifetimeEarned: wallet?.lifetimeEarned ?? 0,
    },
    wallet: wallet ?? null,
    referrals: referralsList,
    ledger,
  };
};

export const requestPayout = async (
  userId: number,
  amount: number,
  method: string,
  destination?: Record<string, unknown>,
) => {
  const [wallet] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, userId)).limit(1);
  if (!wallet) throw new Error("Wallet account not found");
  if (amount < env.REFERRAL_PAYOUT_MIN_AMOUNT) {
    const error = new Error(`Minimum payout is ${env.REFERRAL_PAYOUT_MIN_AMOUNT} minor currency units.`);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  if (wallet.availableBalance < amount) {
    const error = new Error("Insufficient available balance.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  return db.transaction(async (tx) => {
    const [reservedWallet] = await tx
      .update(walletAccounts)
      .set({ availableBalance: sql`${walletAccounts.availableBalance} - ${amount}` })
      .where(and(
        eq(walletAccounts.id, wallet.id),
        gte(walletAccounts.availableBalance, amount),
      ))
      .returning();
    if (!reservedWallet) {
      const error = new Error("Insufficient available balance.");
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    const [request] = await tx
      .insert(payoutRequests)
      .values({
        userId,
        amount,
        currency: wallet.currency,
        method,
        destination: destination ?? null,
        status: "requested",
      })
      .returning();

    await tx.insert(ledgerEntries).values({
      walletAccountId: wallet.id,
      userId,
      payoutRequestId: request.id,
      direction: "debit",
      balanceType: "available",
      amount,
      currency: wallet.currency,
      entryType: "payout_requested",
      idempotencyKey: `ledger:payout-request:${request.id}`,
    });

    return request;
  });
};

export const getUserPayouts = async (userId: number) =>
  db.select().from(payoutRequests).where(eq(payoutRequests.userId, userId)).orderBy(desc(payoutRequests.requestedAt));

export const listAdminReferralAnalytics = async () => {
  const [{ totalRevenue }] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(greatest(${payments.amountTotal} - ${payments.amountRefunded}, 0)), 0)::int`,
    })
    .from(payments)
    .where(inArray(payments.status, ["paid", "partially_refunded"]));
  const [{ totalCommission }] = await db
    .select({ totalCommission: sql<number>`coalesce(sum(${commissions.commissionAmount}), 0)::int` })
    .from(commissions)
    .where(or(eq(commissions.status, "pending_release"), eq(commissions.status, "released")));
  const [{ totalRelationships }] = await db
    .select({ totalRelationships: sql<number>`count(*)::int` })
    .from(referralRelationships);
  const [{ paidRelationships }] = await db
    .select({ paidRelationships: sql<number>`count(*)::int` })
    .from(referralRelationships)
    .where(eq(referralRelationships.status, "activated"));

  return {
    totalRevenue: totalRevenue ?? 0,
    totalCommission: totalCommission ?? 0,
    totalRelationships: totalRelationships ?? 0,
    paidRelationships: paidRelationships ?? 0,
    referralConversionRate:
      totalRelationships > 0 ? Math.round(((paidRelationships ?? 0) / totalRelationships) * 1000) / 10 : 0,
  };
};

export const listPayoutRequests = async () =>
  db.select().from(payoutRequests).orderBy(desc(payoutRequests.requestedAt)).limit(200);

export const listReferralCampaigns = async () =>
  db.select().from(referralCampaigns).orderBy(desc(referralCampaigns.createdAt));

export const createReferralCampaign = async (payload: InsertReferralCampaign) => {
  const [campaign] = await db.insert(referralCampaigns).values(payload).returning();
  return campaign;
};

export const updateReferralCampaign = async (
  campaignId: number,
  payload: Partial<InsertReferralCampaign>,
) => {
  const [campaign] = await db
    .update(referralCampaigns)
    .set(payload)
    .where(eq(referralCampaigns.id, campaignId))
    .returning();
  if (!campaign) throw new Error("Referral campaign not found");
  return campaign;
};

export const listCommissionRules = async () =>
  db.select().from(commissionRules).orderBy(desc(commissionRules.createdAt));

export const createCommissionRule = async (payload: InsertCommissionRule) => {
  const [rule] = await db.insert(commissionRules).values(payload).returning();
  return rule;
};

export const updateCommissionRule = async (
  ruleId: number,
  payload: Partial<InsertCommissionRule>,
) => {
  const [rule] = await db.update(commissionRules).set(payload).where(eq(commissionRules.id, ruleId)).returning();
  if (!rule) throw new Error("Commission rule not found");
  return rule;
};

export const approvePayoutRequest = async (payoutId: number, approverId: number) => {
  const [request] = await db
    .update(payoutRequests)
    .set({ status: "approved", approvedBy: approverId, approvedAt: new Date() })
    .where(and(eq(payoutRequests.id, payoutId), eq(payoutRequests.status, "requested")))
    .returning();

  if (!request) {
    const error = new Error("Payout request was not found or is no longer awaiting approval");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  return request;
};

export const rejectPayoutRequest = async (payoutId: number, reason: string) => {
  const [request] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, payoutId)).limit(1);
  if (!request) throw new Error("Payout request not found");
  if (request.status !== "requested") {
    const error = new Error("Only requested payouts can be rejected.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const [wallet] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, request.userId)).limit(1);
  if (!wallet) throw new Error("Wallet account not found");

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(payoutRequests)
      .set({ status: "rejected", failureReason: reason })
      .where(and(eq(payoutRequests.id, payoutId), eq(payoutRequests.status, "requested")))
      .returning();
    if (!updated) {
      const error = new Error("Payout request is no longer awaiting review");
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    await tx
      .insert(ledgerEntries)
      .values({
        walletAccountId: wallet.id,
        userId: request.userId,
        payoutRequestId: request.id,
        direction: "credit",
        balanceType: "available",
        amount: request.amount,
        currency: request.currency,
        entryType: "payout_rejected_return",
        idempotencyKey: `ledger:payout-reject:${request.id}`,
      })
      .onConflictDoNothing({ target: ledgerEntries.idempotencyKey });

    await tx
      .update(walletAccounts)
      .set({ availableBalance: sql`${walletAccounts.availableBalance} + ${request.amount}` })
      .where(eq(walletAccounts.id, wallet.id));

    return updated;
  });
};

export const logReferralAnalytics = async (
  event: string,
  userId: number | null,
  req: Request,
  metadata?: Record<string, unknown>,
) => {
  await db.insert(analytics).values({
    event,
    userId,
    metadata: metadata ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
};
