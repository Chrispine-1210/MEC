import crypto from "crypto";
import type { Request, Response } from "express";
import Stripe from "stripe";
import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import { env } from "./env";
import {
  analytics,
  commissionRules,
  commissions,
  fraudSignals,
  ledgerEntries,
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
const stripeApiVersion = "2025-10-29.clover";

type CheckoutParams = {
  mode?: "payment" | "subscription";
  priceId?: string;
  amount?: number;
  currency?: string;
  productName?: string;
  productType?: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  clientReferenceId?: string;
};

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

const getOrigin = (req: Request) => {
  if (env.PUBLIC_APP_URL) return env.PUBLIC_APP_URL.replace(/\/$/, "");
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

const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: stripeApiVersion as any });
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

  const [commission] = await db
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

  if (!commission || commission.status !== "pending_release") return commission ?? null;

  const wallet = await ensureWallet(relationship.referrerId, payment.currency);
  const ledgerKey = `ledger:pending-credit:${commission.id}`;

  await db.transaction(async (tx) => {
    await tx
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
      .onConflictDoNothing({ target: ledgerEntries.idempotencyKey });

    await tx
      .update(walletAccounts)
      .set({ pendingBalance: sql`${walletAccounts.pendingBalance} + ${commission.commissionAmount}` })
      .where(eq(walletAccounts.id, wallet.id));
  });

  return commission;
};

const findPaymentByStripeIdentifiers = async (identifiers: {
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  invoiceId?: string | null;
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

  return null;
};

const upsertPaidPayment = async (data: {
  userId: number;
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  amountTotal: number;
  amountNet?: number | null;
  currency: string;
  status: string;
  productType: string;
  metadata?: Record<string, unknown> | null;
  paidAt?: Date | null;
}) => {
  const existing = await findPaymentByStripeIdentifiers({
    checkoutSessionId: data.stripeCheckoutSessionId,
    paymentIntentId: data.stripePaymentIntentId,
    invoiceId: data.stripeInvoiceId,
  });

  if (existing) {
    const [updated] = await db
      .update(payments)
      .set({
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripePaymentIntentId: data.stripePaymentIntentId ?? existing.stripePaymentIntentId,
        stripeInvoiceId: data.stripeInvoiceId ?? existing.stripeInvoiceId,
        stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        amountTotal: data.amountTotal || existing.amountTotal,
        amountNet: data.amountNet ?? existing.amountNet,
        currency: data.currency || existing.currency,
        status: data.status,
        productType: data.productType || existing.productType,
        metadata: { ...(existing.metadata ?? {}), ...(data.metadata ?? {}) },
        paidAt: data.paidAt ?? existing.paidAt ?? new Date(),
      })
      .where(eq(payments.id, existing.id))
      .returning();
    return updated;
  }

  const [payment] = await db
    .insert(payments)
    .values({
      userId: data.userId,
      stripeCustomerId: data.stripeCustomerId,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeInvoiceId: data.stripeInvoiceId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      amountTotal: data.amountTotal,
      amountNet: data.amountNet ?? data.amountTotal,
      currency: data.currency.toUpperCase(),
      status: data.status,
      productType: data.productType,
      metadata: data.metadata ?? null,
      paidAt: data.paidAt ?? new Date(),
    })
    .returning();

  return payment;
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
  const stripe = getStripe();
  if (!stripe) {
    const error = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

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

  const currency = (params.currency || user.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY).toLowerCase();
  const quantity = params.quantity && params.quantity > 0 ? params.quantity : 1;
  const productType = params.productType || (params.mode === "subscription" ? "subscription" : "application");
  const origin = getOrigin(req);
  const [relationship] = await db
    .select()
    .from(referralRelationships)
    .where(eq(referralRelationships.referredUserId, user.id))
    .limit(1);

  if (!params.priceId && (!params.amount || params.amount < 50)) {
    const error = new Error("Checkout amount must be at least 50 minor currency units.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const lineItem = params.priceId
    ? { price: params.priceId, quantity }
    : {
        price_data: {
          currency,
          unit_amount: params.amount,
          product_data: {
            name: params.productName || "Mtendere service",
          },
        },
        quantity,
      };

  const clientReferenceId = params.clientReferenceId || crypto.randomUUID();
  const session = await stripe.checkout.sessions.create(
    {
      mode: params.mode || "payment",
      customer: stripeCustomerId,
      client_reference_id: String(user.id),
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: params.successUrl || `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl || `${origin}/payment/cancelled`,
      metadata: {
        user_id: String(user.id),
        product_type: productType,
        referral_relationship_id: relationship ? String(relationship.id) : "",
        client_reference_id: clientReferenceId,
      },
      payment_intent_data:
        (params.mode || "payment") === "payment"
          ? {
              metadata: {
                user_id: String(user.id),
                product_type: productType,
                referral_relationship_id: relationship ? String(relationship.id) : "",
              },
            }
          : undefined,
      subscription_data:
        params.mode === "subscription"
          ? {
              metadata: {
                user_id: String(user.id),
                product_type: productType,
                referral_relationship_id: relationship ? String(relationship.id) : "",
              },
            }
          : undefined,
    },
    { idempotencyKey: `checkout:${user.id}:${productType}:${clientReferenceId}` },
  );

  return { id: session.id, url: session.url };
};

const processCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (!Number.isFinite(userId) || userId <= 0) return;
  if (session.payment_status !== "paid" && session.mode !== "subscription") return;

  const payment = await upsertPaidPayment({
    userId,
    stripeCustomerId: toStripeId(session.customer),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: toStripeId(session.payment_intent),
    stripeSubscriptionId: toStripeId(session.subscription),
    amountTotal: session.amount_total ?? 0,
    amountNet: session.amount_total ?? 0,
    currency: (session.currency || env.STRIPE_DEFAULT_CURRENCY).toUpperCase(),
    status: session.payment_status === "paid" ? "paid" : "open",
    productType: session.metadata?.product_type || (session.mode === "subscription" ? "subscription" : "application"),
    metadata: session.metadata ?? null,
    paidAt: new Date(),
  });

  if (payment.status === "paid") {
    await finalizePaymentCommission(payment);
  }
};

const processInvoicePaid = async (invoice: Stripe.Invoice) => {
  const userId = Number(invoice.metadata?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return;

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

  const payment = await upsertPaidPayment({
    userId,
    stripeCustomerId: toStripeId(invoice.customer),
    stripePaymentIntentId: paymentIntentId ?? null,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscriptionId ?? null,
    amountTotal: invoice.amount_paid,
    amountNet: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    productType: invoice.metadata?.product_type || "subscription",
    metadata: invoice.metadata ?? null,
    paidAt: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
  });

  await finalizePaymentCommission(payment);
};

const reversePaymentCommissions = async (payment: Payment, reason: string) => {
  const paymentCommissions = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.paymentId, payment.id), or(isNull(commissions.reversedAt), eq(commissions.status, "released"))));

  for (const commission of paymentCommissions) {
    if (commission.reversedAt) continue;
    const wallet = await ensureWallet(commission.beneficiaryUserId, commission.currency);
    const wasReleased = commission.status === "released";
    const keyBase = `ledger:reverse:${commission.id}`;

    await db.transaction(async (tx) => {
      await tx
        .update(commissions)
        .set({ status: "reversed", reversedAt: new Date() })
        .where(eq(commissions.id, commission.id));

      await tx
        .insert(ledgerEntries)
        .values({
          walletAccountId: wallet.id,
          userId: commission.beneficiaryUserId,
          commissionId: commission.id,
          direction: "debit",
          balanceType: wasReleased ? "available" : "pending",
          amount: commission.commissionAmount,
          currency: commission.currency,
          entryType: reason,
          idempotencyKey: keyBase,
        })
        .onConflictDoNothing({ target: ledgerEntries.idempotencyKey });

      await tx
        .update(walletAccounts)
        .set(
          wasReleased
            ? { availableBalance: sql`greatest(${walletAccounts.availableBalance} - ${commission.commissionAmount}, 0)` }
            : { pendingBalance: sql`greatest(${walletAccounts.pendingBalance} - ${commission.commissionAmount}, 0)` },
        )
        .where(eq(walletAccounts.id, wallet.id));
    });
  }
};

const processRefundOrDispute = async (object: Stripe.Charge | Stripe.Dispute, reason: string) => {
  const chargeCandidate =
    "charge" in object && typeof object.charge !== "undefined" ? object.charge : object;
  if (typeof chargeCandidate === "string") return;
  const charge = chargeCandidate as Stripe.Charge;
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const payment = await findPaymentByStripeIdentifiers({ paymentIntentId });
  if (!payment) return;

  const [updated] = await db
    .update(payments)
    .set({ status: reason, refundedAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  await reversePaymentCommissions(updated, reason);
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

  return saved ?? null;
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

export const processStripeEvent = async (event: Stripe.Event) => {
  try {
    await db
      .update(stripeEvents)
      .set({ processingStatus: "processing", error: null })
      .where(eq(stripeEvents.stripeEventId, event.id));

    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await processInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "charge.refunded":
        await processRefundOrDispute(event.data.object as Stripe.Charge, "refunded");
        break;
      case "charge.dispute.created":
        await processRefundOrDispute(event.data.object as Stripe.Dispute, "disputed");
        break;
      default:
        break;
    }

    await db
      .update(stripeEvents)
      .set({ processingStatus: "processed", processedAt: new Date(), error: null })
      .where(eq(stripeEvents.stripeEventId, event.id));
  } catch (error) {
    await db
      .update(stripeEvents)
      .set({
        processingStatus: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(stripeEvents.stripeEventId, event.id));
    throw error;
  }
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

      await tx
        .insert(ledgerEntries)
        .values([
          {
            walletAccountId: wallet.id,
            userId: commission.beneficiaryUserId,
            commissionId: commission.id,
            direction: "debit",
            balanceType: "pending",
            amount: commission.commissionAmount,
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
            amount: commission.commissionAmount,
            currency: commission.currency,
            entryType: "commission_released_available_credit",
            idempotencyKey: `ledger:release-available:${commission.id}`,
          },
        ])
        .onConflictDoNothing({ target: ledgerEntries.idempotencyKey });

      await tx
        .update(walletAccounts)
        .set({
          pendingBalance: sql`greatest(${walletAccounts.pendingBalance} - ${commission.commissionAmount}, 0)`,
          availableBalance: sql`${walletAccounts.availableBalance} + ${commission.commissionAmount}`,
          lifetimeEarned: sql`${walletAccounts.lifetimeEarned} + ${commission.commissionAmount}`,
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

    await tx
      .update(walletAccounts)
      .set({ availableBalance: sql`${walletAccounts.availableBalance} - ${amount}` })
      .where(eq(walletAccounts.id, wallet.id));

    return request;
  });
};

export const getUserPayouts = async (userId: number) =>
  db.select().from(payoutRequests).where(eq(payoutRequests.userId, userId)).orderBy(desc(payoutRequests.requestedAt));

export const listAdminReferralAnalytics = async () => {
  const [{ totalRevenue }] = await db
    .select({ totalRevenue: sql<number>`coalesce(sum(${payments.amountTotal}), 0)::int` })
    .from(payments)
    .where(eq(payments.status, "paid"));
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
    .where(eq(payoutRequests.id, payoutId))
    .returning();

  if (!request) throw new Error("Payout request not found");
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
      .where(eq(payoutRequests.id, payoutId))
      .returning();

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
