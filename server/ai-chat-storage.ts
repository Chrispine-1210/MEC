import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { env } from "./env";
import { aiChatConversations, aiChatResponseCache, aiChatUsage } from "@shared/schema";
import type { EnterpriseChatResponse } from "./ai";

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type AiChatMemoryState = {
  enabled: boolean;
  userPreferences: string[];
  shortTermSummary: string | null;
  lastUpdatedAt: string | null;
};

export type AiChatIntelligence = {
  intent: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  selectedAgent?: string;
  agentTrace?: Record<string, unknown>;
  safetyFlags: string[];
  retrievalSources: Array<Record<string, unknown>>;
  suggestedActions: Array<Record<string, unknown>>;
  actionPlan?: Record<string, unknown>;
  responseQuality: Record<string, unknown>;
  escalationRequired: boolean;
  provider: string;
  model: string;
  usedFallback: boolean;
};

export type AiChatConversation = {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  channel: "public" | "admin";
  messages: AiChatMessage[];
  summary: string | null;
  isActive: boolean;
  moderationFlags: string[];
  memory?: AiChatMemoryState;
  intelligence?: AiChatIntelligence;
  auditTrail?: Array<Record<string, unknown>>;
  requestCount: number;
  retentionUntil: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
};

export class AiConversationAccessError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AiConversationAccessError";
    this.status = status;
    this.code = code;
  }
}

const dateToIso = (value: Date | null | undefined) => value?.toISOString() ?? new Date().toISOString();

const normalizeMessages = (value: Array<Record<string, unknown>>): AiChatMessage[] =>
  value
    .filter((item) => item && typeof item.content === "string")
    .map((item) => ({
      role: item.role === "assistant" || item.role === "system" ? item.role : "user",
      content: String(item.content),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      metadata: item.metadata && typeof item.metadata === "object"
        ? item.metadata as Record<string, unknown>
        : undefined,
    }));

const toConversation = (row: typeof aiChatConversations.$inferSelect): AiChatConversation => ({
  id: row.id,
  userId: row.userId === null ? null : String(row.userId),
  userEmail: row.userEmail,
  channel: row.channel === "admin" ? "admin" : "public",
  messages: normalizeMessages(row.messages),
  summary: row.summary,
  isActive: row.isActive,
  moderationFlags: row.moderationFlags,
  memory: row.memory as AiChatMemoryState | undefined,
  intelligence: row.intelligence as AiChatIntelligence | undefined,
  auditTrail: row.auditTrail,
  requestCount: row.requestCount,
  retentionUntil: dateToIso(row.retentionUntil),
  createdAt: dateToIso(row.createdAt),
  updatedAt: dateToIso(row.updatedAt),
  lastMessageAt: dateToIso(row.lastMessageAt),
});

const hashSecret = (value: string) => createHmac("sha256", env.JWT_SECRET).update(value).digest("hex");

export const createAiActorHash = (value: string) => hashSecret(`actor:${value}`);

export const getAiChatConversation = async (id: string) => {
  const [row] = await db
    .select()
    .from(aiChatConversations)
    .where(eq(aiChatConversations.id, id))
    .limit(1);
  return row ? toConversation(row) : undefined;
};

export const listAiChatConversations = async () => {
  const rows = await db
    .select()
    .from(aiChatConversations)
    .orderBy(desc(aiChatConversations.lastMessageAt))
    .limit(2_000);
  return rows.map(toConversation);
};

export const getCachedAiResponse = async (cacheKey: string) => {
  const [row] = await db
    .select()
    .from(aiChatResponseCache)
    .where(and(eq(aiChatResponseCache.cacheKey, cacheKey), gte(aiChatResponseCache.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  await db
    .update(aiChatResponseCache)
    .set({ hitCount: sql`${aiChatResponseCache.hitCount} + 1`, updatedAt: new Date() })
    .where(eq(aiChatResponseCache.cacheKey, cacheKey));
  return row.response as unknown as EnterpriseChatResponse;
};

export const cacheAiResponse = async (cacheKey: string, response: EnterpriseChatResponse) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.AI_CHAT_CACHE_TTL_SECONDS * 1_000);
  const [row] = await db
    .insert(aiChatResponseCache)
    .values({
      cacheKey,
      model: response.metadata.model,
      response: response as unknown as Record<string, unknown>,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiChatResponseCache.cacheKey,
      set: {
        model: response.metadata.model,
        response: response as unknown as Record<string, unknown>,
        hitCount: 0,
        expiresAt,
        updatedAt: now,
      },
    })
    .returning({ cacheKey: aiChatResponseCache.cacheKey });
  return row ?? null;
};

const verifyAnonymousToken = (storedHash: string | null, token: string | undefined) => {
  if (!storedHash || !token) return false;
  const suppliedHash = hashSecret(`conversation:${token}`);
  const stored = Buffer.from(storedHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
};

export const authorizeAiConversation = async (input: {
  id: string;
  userId: number | null;
  conversationToken?: string;
  channel: "public" | "admin";
}) => {
  const [row] = await db
    .select()
    .from(aiChatConversations)
    .where(eq(aiChatConversations.id, input.id))
    .limit(1);
  if (!row) throw new AiConversationAccessError("Conversation not found", 404, "conversation_not_found");
  if (row.channel !== input.channel) {
    throw new AiConversationAccessError("Conversation not found", 404, "conversation_channel_mismatch");
  }
  if (row.userId !== null) {
    if (input.userId !== row.userId) {
      throw new AiConversationAccessError("Conversation access denied", 403, "conversation_owner_mismatch");
    }
  } else if (!verifyAnonymousToken(row.accessTokenHash, input.conversationToken)) {
    throw new AiConversationAccessError("Conversation access denied", 403, "conversation_token_invalid");
  }
  return { conversation: toConversation(row), isActive: row.isActive };
};

export const beginAiConversationTurn = async (input: {
  conversationId?: string;
  userId: number | null;
  userEmail?: string | null;
  channel: "public" | "admin";
  message: string;
  memory: AiChatMemoryState;
  detectedFlags?: string[];
}) => {
  const id = input.conversationId || randomUUID();
  const turnId = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const anonymousToken = !input.conversationId && input.userId === null
    ? randomBytes(32).toString("base64url")
    : undefined;

  const row = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
    const [existing] = await tx
      .select()
      .from(aiChatConversations)
      .where(eq(aiChatConversations.id, id))
      .limit(1);

    if (existing && !existing.isActive) {
      throw new AiConversationAccessError("Conversation is closed", 409, "conversation_closed");
    }

    const existingMessages = existing ? normalizeMessages(existing.messages) : [];
    const pendingUserMessage: AiChatMessage = {
      role: "user",
      content: input.message,
      createdAt: nowIso,
      metadata: { turnId, status: "pending" },
    };
    const messages: AiChatMessage[] = [...existingMessages, pendingUserMessage].slice(-40);
    const moderationFlags = Array.from(new Set([
      ...(existing?.moderationFlags ?? []),
      ...(input.detectedFlags ?? []),
    ]));
    const auditTrail = [
      ...(existing?.auditTrail ?? []),
      {
        id: randomUUID(),
        event: "ai_user_message_received",
        at: nowIso,
        actorId: input.userId,
        channel: input.channel,
        turnId,
        inputCharacters: input.message.length,
      },
    ].slice(-80);
    const values = {
      id,
      userId: input.userId,
      userEmail: input.userEmail ?? null,
      accessTokenHash: anonymousToken ? hashSecret(`conversation:${anonymousToken}`) : null,
      channel: input.channel,
      messages: messages as Array<Record<string, unknown>>,
      summary: existing?.summary ?? input.message.slice(0, 180),
      isActive: true,
      moderationFlags,
      memory: input.memory as unknown as Record<string, unknown>,
      intelligence: existing?.intelligence ?? null,
      auditTrail,
      requestCount: (existing?.requestCount ?? 0) + 1,
      retentionUntil: new Date(now.getTime() + env.AI_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1_000),
      lastMessageAt: now,
      updatedAt: now,
    };

    if (existing) {
      const [updated] = await tx
        .update(aiChatConversations)
        .set({
          userEmail: existing.userEmail ?? values.userEmail,
          messages: values.messages,
          summary: values.summary,
          isActive: true,
          moderationFlags: values.moderationFlags,
          memory: values.memory,
          intelligence: values.intelligence,
          auditTrail: values.auditTrail,
          requestCount: values.requestCount,
          retentionUntil: values.retentionUntil,
          lastMessageAt: values.lastMessageAt,
          updatedAt: values.updatedAt,
        })
        .where(eq(aiChatConversations.id, id))
        .returning();
      return updated;
    }

    const [created] = await tx.insert(aiChatConversations).values(values).returning();
    return created;
  });

  return { conversation: toConversation(row), conversationToken: anonymousToken, turnId };
};

export const completeAiConversationTurn = async (input: {
  conversationId: string;
  turnId: string;
  assistant: EnterpriseChatResponse;
  detectedFlags?: string[];
}) => {
  const row = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.conversationId}))`);
    const [existing] = await tx
      .select()
      .from(aiChatConversations)
      .where(eq(aiChatConversations.id, input.conversationId))
      .limit(1);
    if (!existing) throw new AiConversationAccessError("Conversation not found", 404, "conversation_not_found");

    const completedAt = new Date();
    const messages = normalizeMessages(existing.messages)
      .map((message) => message.role === "user" && message.metadata?.turnId === input.turnId
        ? { ...message, metadata: { ...message.metadata, status: "completed" } }
        : message)
      .concat({
        role: "assistant",
        content: input.assistant.response,
        createdAt: completedAt.toISOString(),
        metadata: {
          turnId: input.turnId,
          intent: input.assistant.metadata.intent,
          confidence: input.assistant.metadata.confidence,
          riskLevel: input.assistant.metadata.riskLevel,
          selectedAgent: input.assistant.metadata.selectedAgent,
          actionStatus: input.assistant.metadata.actionPlan.status,
          requiredPermission: input.assistant.metadata.actionPlan.requiredPermission,
          safetyFlags: input.assistant.metadata.safetyFlags,
          retrievalSourceCount: input.assistant.metadata.retrievalSources.length,
          suggestedActionCount: input.assistant.metadata.suggestedActions.length,
          provider: input.assistant.metadata.provider,
          model: input.assistant.metadata.model,
        },
      } as AiChatMessage)
      .slice(-40);
    const auditTrail = [
      ...(existing.auditTrail ?? []),
      {
        id: randomUUID(),
        event: "ai_assistant_turn_completed",
        at: completedAt.toISOString(),
        turnId: input.turnId,
        intent: input.assistant.metadata.intent,
        riskLevel: input.assistant.metadata.riskLevel,
        selectedAgent: input.assistant.metadata.selectedAgent,
        actionStatus: input.assistant.metadata.actionPlan.status,
        requiredPermission: input.assistant.metadata.actionPlan.requiredPermission,
        confidence: input.assistant.metadata.confidence,
        provider: input.assistant.metadata.provider,
        model: input.assistant.metadata.model,
        usedFallback: input.assistant.metadata.usedFallback,
        providerRequestId: input.assistant.audit.providerRequestId,
        historyMessagesUsed: input.assistant.audit.historyMessagesUsed,
        contextSourcesUsed: input.assistant.audit.contextSourcesUsed,
        safetyFlags: input.assistant.audit.safetyFlags,
        auditReference: input.assistant.metadata.actionPlan.auditReference,
      },
    ].slice(-80);

    const [updated] = await tx
      .update(aiChatConversations)
      .set({
        messages: messages as Array<Record<string, unknown>>,
        moderationFlags: Array.from(new Set([
          ...existing.moderationFlags,
          ...(input.detectedFlags ?? []),
          ...input.assistant.metadata.safetyFlags,
        ])),
        memory: input.assistant.metadata.memory as unknown as Record<string, unknown>,
        intelligence: {
          intent: input.assistant.metadata.intent,
          confidence: input.assistant.metadata.confidence,
          riskLevel: input.assistant.metadata.riskLevel,
          selectedAgent: input.assistant.metadata.selectedAgent,
          agentTrace: input.assistant.metadata.agentTrace,
          safetyFlags: input.assistant.metadata.safetyFlags,
          retrievalSources: input.assistant.metadata.retrievalSources,
          suggestedActions: input.assistant.metadata.suggestedActions,
          actionPlan: input.assistant.metadata.actionPlan,
          responseQuality: input.assistant.metadata.responseQuality,
          escalationRequired: input.assistant.metadata.escalationRequired,
          provider: input.assistant.metadata.provider,
          model: input.assistant.metadata.model,
          usedFallback: input.assistant.metadata.usedFallback,
        },
        auditTrail,
        lastMessageAt: completedAt,
        updatedAt: completedAt,
      })
      .where(eq(aiChatConversations.id, input.conversationId))
      .returning();
    return updated;
  });
  return toConversation(row);
};

export const failAiConversationTurn = async (input: {
  conversationId: string;
  turnId: string;
  errorCode: string;
}) => {
  const updated = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.conversationId}))`);
    const [existing] = await tx
      .select()
      .from(aiChatConversations)
      .where(eq(aiChatConversations.id, input.conversationId))
      .limit(1);
    if (!existing) return null;

    const failedAt = new Date();
    const messages = normalizeMessages(existing.messages).map((message) =>
      message.role === "user" && message.metadata?.turnId === input.turnId
        ? { ...message, metadata: { ...message.metadata, status: "failed", errorCode: input.errorCode } }
        : message,
    );
    const [row] = await tx
      .update(aiChatConversations)
      .set({
        messages: messages as Array<Record<string, unknown>>,
        auditTrail: [
          ...(existing.auditTrail ?? []),
          {
            id: randomUUID(),
            event: "ai_assistant_turn_failed",
            at: failedAt.toISOString(),
            turnId: input.turnId,
            errorCode: input.errorCode,
          },
        ].slice(-80),
        updatedAt: failedAt,
      })
      .where(eq(aiChatConversations.id, input.conversationId))
      .returning();
    return row ?? null;
  });
  return updated ? toConversation(updated) : null;
};

export const updateAiChatMemory = async (id: string, memory: AiChatMemoryState) => {
  const [row] = await db
    .update(aiChatConversations)
    .set({ memory: memory as unknown as Record<string, unknown>, updatedAt: new Date() })
    .where(eq(aiChatConversations.id, id))
    .returning();
  return row ? toConversation(row) : null;
};

export const clearAiChatMemory = async (id: string) => updateAiChatMemory(id, {
  enabled: false,
  userPreferences: [],
  shortTermSummary: null,
  lastUpdatedAt: new Date().toISOString(),
});

export const closeAiChatConversation = async (id: string) => {
  const [row] = await db
    .update(aiChatConversations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(aiChatConversations.id, id))
    .returning();
  return row ? toConversation(row) : null;
};

export const deleteAiChatConversation = async (id: string) => {
  const [row] = await db
    .delete(aiChatConversations)
    .where(eq(aiChatConversations.id, id))
    .returning({ id: aiChatConversations.id });
  return row ?? null;
};

export const beginAiUsageAttempt = async (input: {
  actorHash: string;
  userId: number | null;
  conversationId?: string | null;
}) => {
  const now = new Date();
  const hourStart = new Date(now.getTime() - 60 * 60 * 1_000);
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const requestLimit = input.userId
    ? env.AI_CHAT_AUTHENTICATED_REQUESTS_PER_HOUR
    : env.AI_CHAT_ANONYMOUS_REQUESTS_PER_HOUR;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.actorHash}))`);
    const [[actorUsage], [dailyUsage]] = await Promise.all([
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(aiChatUsage)
        .where(and(eq(aiChatUsage.actorHash, input.actorHash), gte(aiChatUsage.createdAt, hourStart))),
      tx
        .select({ tokens: sql<number>`coalesce(sum(${aiChatUsage.totalTokens}), 0)::int` })
        .from(aiChatUsage)
        .where(gte(aiChatUsage.createdAt, dayStart)),
    ]);
    if ((actorUsage?.count ?? 0) >= requestLimit) {
      throw new AiConversationAccessError("AI request limit reached. Please try again later.", 429, "ai_actor_rate_limit");
    }
    if ((dailyUsage?.tokens ?? 0) >= env.AI_CHAT_DAILY_TOKEN_LIMIT) {
      throw new AiConversationAccessError("AI capacity is temporarily unavailable.", 503, "ai_daily_token_limit");
    }

    const id = randomUUID();
    await tx.insert(aiChatUsage).values({
      id,
      conversationId: input.conversationId ?? null,
      userId: input.userId,
      actorHash: input.actorHash,
      provider: "openai",
      model: env.OPENAI_MODEL,
      requestStatus: "started",
    });
    return { id, requestLimit, requestsUsed: (actorUsage?.count ?? 0) + 1 };
  });
};

export const completeAiUsageAttempt = async (input: {
  id: string;
  conversationId?: string | null;
  result?: EnterpriseChatResponse;
  errorCode?: string | null;
}) => {
  const [row] = await db
    .update(aiChatUsage)
    .set({
      conversationId: input.conversationId ?? null,
      provider: input.result?.metadata.provider ?? "openai",
      model: input.result?.metadata.model ?? env.OPENAI_MODEL,
      providerRequestId: input.result?.audit.providerRequestId ?? null,
      requestStatus: input.errorCode ? "failed" : "completed",
      inputTokens: input.result?.audit.inputTokens ?? 0,
      outputTokens: input.result?.audit.outputTokens ?? 0,
      totalTokens: input.result?.audit.totalTokens ?? 0,
      latencyMs: input.result?.audit.latencyMs ?? 0,
      errorCode: input.errorCode ?? null,
    })
    .where(eq(aiChatUsage.id, input.id))
    .returning();
  return row ?? null;
};

export const getAiUsageSummary = async (days = 30) => {
  const cutoff = new Date(Date.now() - Math.max(1, Math.min(days, 365)) * 24 * 60 * 60 * 1_000);
  const [totals, byStatus, byModel] = await Promise.all([
    db
      .select({
        requests: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiChatUsage.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiChatUsage.outputTokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiChatUsage.totalTokens}), 0)::int`,
        averageLatencyMs: sql<number>`coalesce(avg(${aiChatUsage.latencyMs}), 0)::int`,
      })
      .from(aiChatUsage)
      .where(gte(aiChatUsage.createdAt, cutoff)),
    db
      .select({ status: aiChatUsage.requestStatus, count: sql<number>`count(*)::int` })
      .from(aiChatUsage)
      .where(gte(aiChatUsage.createdAt, cutoff))
      .groupBy(aiChatUsage.requestStatus),
    db
      .select({ model: aiChatUsage.model, count: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${aiChatUsage.totalTokens}), 0)::int` })
      .from(aiChatUsage)
      .where(gte(aiChatUsage.createdAt, cutoff))
      .groupBy(aiChatUsage.model),
  ]);
  const total = totals[0] ?? {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    averageLatencyMs: 0,
  };
  const estimatedCostUsd =
    (total.inputTokens / 1_000_000) * env.OPENAI_INPUT_COST_PER_MILLION_USD
    + (total.outputTokens / 1_000_000) * env.OPENAI_OUTPUT_COST_PER_MILLION_USD;
  return {
    periodDays: days,
    totals: {
      ...total,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      costRatesConfigured:
        env.OPENAI_INPUT_COST_PER_MILLION_USD > 0 || env.OPENAI_OUTPUT_COST_PER_MILLION_USD > 0,
    },
    byStatus,
    byModel,
  };
};

export const deleteExpiredAiConversations = async () => {
  const now = new Date();
  const [deleted] = await Promise.all([
    db
      .delete(aiChatConversations)
      .where(lt(aiChatConversations.retentionUntil, now))
      .returning({ id: aiChatConversations.id }),
    db.delete(aiChatResponseCache).where(lt(aiChatResponseCache.expiresAt, now)),
  ]);
  return deleted.length;
};
