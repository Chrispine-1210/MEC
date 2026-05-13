// Temporary v2 storage module for the production referral/payment engine.
// This avoids breaking the existing legacy storage implementation.

import {
  referralPrograms,
  referralCodes,
  referralClicks,
  referralAttributions,
  referralRewards,
  fraudSignals,
  referralRiskScores,
  stripeEvents,
  payments,
  wallets,
  walletLedgerEntries,
  walletBalances,
  payoutRequests,
  users,
} from "@shared/schema";

import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";

// Re-exported type helpers (Drizzle infer types are not available from runtime imports)
// Use return types as `any` for now to prevent compile failure in this incremental rollout.

export async function getActiveReferralPrograms(): Promise<any[]> {
  const now = new Date();
  return db
    .select()
    .from(referralPrograms)
    .where(
      and(
        eq(referralPrograms.isActive, true),
        // simplistic: allow null start/end
        sql`${referralPrograms.startAt} <= ${now}`,
        sql`${referralPrograms.endAt} >= ${now}`,
      ),
    ) as any;
}

export async function getReferralCodeByCode(code: string): Promise<any | undefined> {
  const rows = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.code, code), eq(referralCodes.isActive, true)))
    .limit(1);
  return rows[0];
}

export async function createReferralClick(params: {
  programId: number;
  codeId: number;
  referrerId: number;
  referredEmail?: string | null;
  fingerprintHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<any> {
  const [row] = await db
    .insert(referralClicks)
    .values({
      programId: params.programId,
      codeId: params.codeId,
      referrerId: params.referrerId,
      referredEmail: params.referredEmail ?? null,
      fingerprintHash: params.fingerprintHash,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      utmSource: params.utmSource ?? null,
      utmMedium: params.utmMedium ?? null,
      utmCampaign: params.utmCampaign ?? null,
    })
    .returning();
  return row;
}

export async function createOrUpdateAttribution(params: {
  clickId: number;
  programId: number;
  codeId: number;
  referrerId: number;
  referredUserId?: number | null;
  referredEmail?: string | null;
  level?: number;
  signupAt?: Date | null;
  activationAt?: Date | null;
  attributionScore?: number | null;
}): Promise<any> {
  // Single attribution row per click is assumed by business logic; we update when called again.
  const existing = await db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.clickId, params.clickId))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(referralAttributions)
      .set({
        referredUserId: params.referredUserId ?? existing[0].referredUserId ?? null,
        referredEmail: params.referredEmail ?? existing[0].referredEmail ?? null,
        signupAt: params.signupAt ?? existing[0].signupAt,
        activationAt: params.activationAt ?? existing[0].activationAt,
        attributionScore: params.attributionScore ?? existing[0].attributionScore,
        level: params.level ?? existing[0].level,
        updatedAt: new Date(),
      })
      .where(eq(referralAttributions.clickId, params.clickId))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(referralAttributions)
    .values({
      clickId: params.clickId,
      programId: params.programId,
      codeId: params.codeId,
      referrerId: params.referrerId,
      referredUserId: params.referredUserId ?? null,
      referredEmail: params.referredEmail ?? null,
      signupAt: params.signupAt ?? null,
      activationAt: params.activationAt ?? null,
      attributionScore: params.attributionScore ?? 0,
      level: params.level ?? 1,
    })
    .returning();

  return created;
}

export async function createReferralRewardOnHold(params: {
  attributionId: number;
  programId: number;
  referrerId: number;
  referredUserId?: number | null;
  paymentId?: number | null;
  amount: number;
  currency: string;
  level: number;
  ruleSnapshot: any;
}): Promise<any> {
  const [row] = await db
    .insert(referralRewards)
    .values({
      attributionId: params.attributionId,
      programId: params.programId,
      referrerId: params.referrerId,
      referredUserId: params.referredUserId ?? null,
      paymentId: params.paymentId ?? null,
      amount: params.amount,
      currency: params.currency,
      level: params.level,
      state: "on_hold",
      ruleSnapshot: params.ruleSnapshot,
      disputeNote: null,
    })
    .returning();

  return row;
}

export async function releaseReferralReward(params: {
  rewardId: number;
}): Promise<any> {
  const [row] = await db
    .update(referralRewards)
    .set({
      state: "released",
      releasedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(referralRewards.id, params.rewardId))
    .returning();

  return row;
}

export async function reverseReferralReward(params: { rewardId: number; note?: string }): Promise<any> {
  const [row] = await db
    .update(referralRewards)
    .set({
      state: "reversed",
      reversedAt: new Date(),
      disputeNote: params.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(referralRewards.id, params.rewardId))
    .returning();

  return row;
}

export async function upsertStripeEventOnce(params: {
  stripeEventId: string;
  eventType: string;
  raw: any;
}): Promise<{ inserted: boolean; eventRow?: any }> {
  // unique constraint on stripe_event_id ensures idempotency
  const existing = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, params.stripeEventId))
    .limit(1);

  if (existing[0]) {
    return { inserted: false, eventRow: existing[0] };
  }

  const [row] = await db
    .insert(stripeEvents)
    .values({
      stripeEventId: params.stripeEventId,
      eventType: params.eventType,
      // raw not stored in schema; attach to metadata via processed flow later
    })
    .returning();

  return { inserted: true, eventRow: row };
}

export async function upsertPayment(params: {
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  userId?: number | null;
  programId?: number | null;
  attributionId?: number | null;
  amount: number;
  currency: string;
  status: string;
  raw: any;
}): Promise<any> {
  // Keep it simple: create a new payment row.
  // In production you should enforce uniqueness by stripe object id.
  const [row] = await db
    .insert(payments)
    .values({
      stripeCheckoutSessionId: params.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: params.stripePaymentIntentId ?? null,
      userId: params.userId ?? null,
      programId: params.programId ?? null,
      attributionId: params.attributionId ?? null,
      amount: params.amount,
      currency: params.currency,
      status: params.status,
      raw: params.raw,
    })
    .returning();

  return row;
}

export async function getOrCreateWallet(params: { userId: number; currency: string }): Promise<any> {
  const existing = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, params.userId)))
    .limit(1);
  if (existing[0]) {
    return existing[0];
  }

  const [row] = await db
    .insert(wallets)
    .values({ userId: params.userId, currency: params.currency })
    .returning();

  await db.insert(walletBalances).values({ walletId: row.id, availableBalance: 0, pendingBalance: 0 });

  const [bal] = await db
    .select()
    .from(walletBalances)
    .where(eq(walletBalances.walletId, row.id))
    .limit(1);

  return { ...row, balance: bal };
}

export async function addLedgerCredit(params: {
  walletId: number;
  referralRewardId?: number | null;
  paymentId?: number | null;
  type: string;
  amount: number;
  currency: string;
  metadata?: any;
}): Promise<any> {
  const [entry] = await db
    .insert(walletLedgerEntries)
    .values({
      walletId: params.walletId,
      referralRewardId: params.referralRewardId ?? null,
      paymentId: params.paymentId ?? null,
      type: params.type,
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata ?? null,
    })
    .returning();

  return entry;
}

export async function updateWalletBalances(params: {
  walletId: number;
  availableDelta?: number;
  pendingDelta?: number;
}): Promise<any> {
  const availableDelta = params.availableDelta ?? 0;
  const pendingDelta = params.pendingDelta ?? 0;

  const [bal] = await db
    .update(walletBalances)
    .set({
      availableBalance: sql`${walletBalances.availableBalance} + ${availableDelta}`,
      pendingBalance: sql`${walletBalances.pendingBalance} + ${pendingDelta}`,
      updatedAt: new Date(),
    })
    .where(eq(walletBalances.walletId, params.walletId))
    .returning();

  return bal;
}

export async function getWalletBalance(params: { userId: number }): Promise<any | undefined> {
  const row = await db
    .select({
      wallet: wallets,
      balances: walletBalances,
    })
    .from(wallets)
    .leftJoin(walletBalances, eq(walletBalances.walletId, wallets.id))
    .where(eq(wallets.userId, params.userId))
    .limit(1);

  return (row[0] as any) ?? undefined;
}

export async function createPayoutRequest(params: {
  walletId: number;
  amount: number;
  currency: string;
  method: string;
  metadata?: any;
}): Promise<any> {
  const [row] = await db
    .insert(payoutRequests)
    .values({
      walletId: params.walletId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      status: "pending",
      metadata: params.metadata ?? null,
    })
    .returning();

  return row;
}

