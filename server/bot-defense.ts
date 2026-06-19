import type { NextFunction, Request, Response } from "express";
import { createHash } from "crypto";
import { cacheDelete, cacheGet, cacheIncrement, cacheSet, getCacheMode } from "./cache";
import { env } from "./env";

type SecurityEventLogger = (
  req: Request,
  event: string,
  details?: Record<string, unknown>,
  statusCode?: number,
) => Promise<void> | void;

type RateLimitRule = {
  limit: number;
  windowMs: number;
  scope: string;
};

type CaptchaPolicy = "never" | "risk" | "always";

type BotDefenseOptions = {
  action: string | string[];
  flow: string;
  captcha?: CaptchaPolicy;
  rateLimits?: RateLimitRule[];
  velocityMinimumMs?: number;
  honeypotResponse?: {
    statusCode: number;
    body: Record<string, unknown>;
  };
  logEvent?: SecurityEventLogger;
};

type RecaptchaSiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

type BotFingerprint = {
  visitorHash?: string;
  timezone?: string;
  language?: string;
  languages?: string[];
  viewport?: string;
  screen?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  platform?: string;
  canvasHash?: string;
  webglHash?: string;
  webdriver?: boolean;
  pluginsLength?: number;
  maxTouchPoints?: number;
  formStartedAt?: number;
  formElapsedMs?: number;
};

type RiskSignal = {
  name: string;
  points: number;
  severity: "low" | "medium" | "high" | "critical";
};

type RiskAssessment = {
  score: number;
  disposition: "allow" | "monitor" | "captcha" | "block";
  signals: RiskSignal[];
};

export type BotDefenseContext = {
  action: string;
  flow: string;
  fingerprint: BotFingerprint;
  risk: RiskAssessment;
  recaptcha?: {
    ok: boolean;
    skipped?: boolean;
    score?: number;
    action?: string;
    hostname?: string;
  };
  rateLimit?: {
    scope: string;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
    cacheMode: string;
  };
};

declare global {
  namespace Express {
    interface Request {
      botDefense?: BotDefenseContext;
    }
  }
}

const defaultRecaptchaScoreThreshold = env.BOT_DEFENSE_RECAPTCHA_SCORE_THRESHOLD;
const defaultTokenMaxAgeMs = env.BOT_DEFENSE_RECAPTCHA_MAX_TOKEN_AGE_MS;
const botDefenseEnabled = env.BOT_DEFENSE_ENABLED ?? true;
const captchaRequiredInProduction = env.BOT_DEFENSE_RECAPTCHA_REQUIRED ?? false;
const recaptchaConfigured = Boolean(env.RECAPTCHA_SECRET_KEY);

const parseList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const ipBlocklist = new Set(parseList(env.BOT_DEFENSE_THREAT_IP_BLOCKLIST));
const countryBlocklist = new Set(parseList(env.BOT_DEFENSE_COUNTRY_BLOCKLIST));
const countryChallengeList = new Set(parseList(env.BOT_DEFENSE_COUNTRY_CHALLENGE));

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const hostnameFromUrl = (value?: string) => {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const configuredRecaptchaHostnames = new Set(
  [
    "mtendereeducationconsult.com",
    "www.mtendereeducationconsult.com",
    "admin.mtendereeducationconsult.com",
    hostnameFromUrl(env.PUBLIC_APP_URL),
    hostnameFromUrl(env.FRONTEND_URL),
    hostnameFromUrl(env.ADMIN_APP_URL),
    hostnameFromUrl(env.API_APP_URL),
    hostnameFromUrl(env.VITE_SITE_URL),
    ...parseList(env.BOT_DEFENSE_RECAPTCHA_ALLOWED_HOSTNAMES),
  ].filter(Boolean) as string[],
);

const normalizeIp = (value?: string | null) => {
  if (!value) return "unknown";
  const firstForwarded = value.split(",")[0]?.trim();
  return (firstForwarded || value).replace(/^::ffff:/, "").toLowerCase();
};

export const getRequestIp = (req: Request) =>
  normalizeIp(req.get("cf-connecting-ip") || req.get("x-forwarded-for") || req.ip || req.socket.remoteAddress);

export const normalizeRateLimitPath = (path: string) =>
  path.replace(/\/\d+(?=\/|$)/g, "/:id").replace(/\/[0-9a-f]{8,}(?=\/|$)/gi, "/:token");

export const hashSecurityValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const readRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const asBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);

export const extractBotFingerprint = (req: Request): BotFingerprint => {
  const body = readRecord(req.body);
  const security = readRecord(body.security ?? body.securityContext);
  const fingerprint = readRecord(security.fingerprint ?? body.fingerprint ?? body.botFingerprint);
  const automation = readRecord(security.automation);
  const form = readRecord(security.form);

  const visitorHash =
    asString(security.visitorHash) ||
    asString(body.visitorHash) ||
    asString(fingerprint.visitorHash) ||
    asString(req.get("x-visitor-hash")) ||
    asString(req.get("x-device-fingerprint"));

  const formStartedAt = asNumber(form.startedAt) || asNumber(body.formStartedAt) || asNumber(fingerprint.formStartedAt);
  const explicitElapsed = asNumber(form.elapsedMs) || asNumber(body.formElapsedMs) || asNumber(fingerprint.formElapsedMs);
  const elapsedFromStart =
    formStartedAt && formStartedAt > 0 && formStartedAt <= Date.now() ? Date.now() - formStartedAt : undefined;

  return {
    visitorHash,
    timezone: asString(fingerprint.timezone),
    language: asString(fingerprint.language) || asString(req.get("accept-language")),
    languages: Array.isArray(fingerprint.languages) ? fingerprint.languages.map(String).slice(0, 10) : undefined,
    viewport: asString(fingerprint.viewport),
    screen: asString(fingerprint.screen),
    deviceMemory: asNumber(fingerprint.deviceMemory),
    hardwareConcurrency: asNumber(fingerprint.hardwareConcurrency),
    platform: asString(fingerprint.platform),
    canvasHash: asString(fingerprint.canvasHash),
    webglHash: asString(fingerprint.webglHash),
    webdriver: asBoolean(automation.webdriver) ?? asBoolean(fingerprint.webdriver),
    pluginsLength: asNumber(automation.pluginsLength) ?? asNumber(fingerprint.pluginsLength),
    maxTouchPoints: asNumber(fingerprint.maxTouchPoints),
    formStartedAt,
    formElapsedMs: explicitElapsed ?? elapsedFromStart,
  };
};

export const stripBotDefenseFields = <T extends Record<string, unknown>>(body: T) => {
  const {
    recaptchaToken,
    security,
    securityContext,
    fingerprint,
    botFingerprint,
    visitorHash,
    formStartedAt,
    formElapsedMs,
    website,
    company,
    homepage,
    ...rest
  } = body;
  void recaptchaToken;
  void security;
  void securityContext;
  void fingerprint;
  void botFingerprint;
  void visitorHash;
  void formStartedAt;
  void formElapsedMs;
  void website;
  void company;
  void homepage;
  return rest;
};

export const getRecaptchaTokenFromRequest = (req: Request) => {
  const body = readRecord(req.body);
  const security = readRecord(body.security ?? body.securityContext);
  return asString(body.recaptchaToken) || asString(security.recaptchaToken) || asString(req.get("x-recaptcha-token"));
};

export const isHoneypotFilled = (req: Request) => {
  const body = readRecord(req.body);
  const security = readRecord(body.security ?? body.securityContext);
  const honeypot = readRecord(security.honeypot);
  return ["website", "company", "homepage"].some((key) => Boolean(asString(body[key]) || asString(honeypot[key])));
};

const isLikelyHeadlessUserAgent = (userAgent: string) =>
  /(headlesschrome|phantomjs|slimerjs|puppeteer|playwright|selenium|webdriver|cypress|curl\/|wget\/|python-requests|httpclient|scrapy|bot\b|spider\b|crawler\b)/i.test(userAgent);

const requestHostname = (req: Request) =>
  (req.hostname || req.get("host")?.split(":")[0] || "").toLowerCase();

const isTrustedRecaptchaHostname = (hostname: string, req: Request) => {
  const normalized = hostname.toLowerCase();
  if (configuredRecaptchaHostnames.has(normalized)) return true;
  if (env.NODE_ENV !== "production" && localHostnames.has(normalized)) return true;
  return normalized === requestHostname(req);
};

const makeSignal = (name: string, points: number, severity: RiskSignal["severity"]): RiskSignal => ({
  name,
  points,
  severity,
});

export const assessRequestRisk = (req: Request, options?: { velocityMinimumMs?: number }): RiskAssessment => {
  const signals: RiskSignal[] = [];
  const ip = getRequestIp(req);
  const userAgent = req.get("user-agent") || "";
  const fingerprint = extractBotFingerprint(req);
  const cfBotScore = Number(req.get("cf-bot-score"));
  const cfThreatScore = Number(req.get("cf-threat-score"));
  const country = (req.get("cf-ipcountry") || "").toLowerCase();
  const verifiedBot = (req.get("cf-verified-bot") || "").toLowerCase() === "true";

  if (req.get("authorization")) signals.push(makeSignal("valid_session_or_bearer", -20, "low"));
  if (verifiedBot) signals.push(makeSignal("cloudflare_verified_bot", -15, "low"));
  if (ipBlocklist.has(ip)) signals.push(makeSignal("threat_ip_blocklist", 100, "critical"));
  if (country && countryBlocklist.has(country)) signals.push(makeSignal("blocked_country", 100, "critical"));
  if (country && countryChallengeList.has(country)) signals.push(makeSignal("challenge_country", 25, "medium"));
  if (Number.isFinite(cfBotScore) && cfBotScore > 0 && cfBotScore < 30) {
    signals.push(makeSignal("cloudflare_low_bot_score", 50, "high"));
  }
  if (Number.isFinite(cfThreatScore) && cfThreatScore >= 20) {
    signals.push(makeSignal("cloudflare_threat_score", Math.min(60, cfThreatScore), "high"));
  }
  if (isLikelyHeadlessUserAgent(userAgent)) signals.push(makeSignal("automation_user_agent", 45, "critical"));
  if (fingerprint.webdriver) signals.push(makeSignal("navigator_webdriver", 100, "critical"));
  if (fingerprint.pluginsLength === 0 && !/mobile|android|iphone|ipad/i.test(userAgent)) {
    signals.push(makeSignal("missing_browser_plugins", 20, "medium"));
  }
  if (!fingerprint.webglHash && !fingerprint.canvasHash && req.method !== "GET") {
    signals.push(makeSignal("missing_graphics_fingerprint", 15, "medium"));
  }
  if (!fingerprint.timezone && req.method !== "GET") signals.push(makeSignal("missing_timezone", 10, "medium"));
  if (!fingerprint.visitorHash && req.method !== "GET") signals.push(makeSignal("missing_visitor_hash", 15, "medium"));
  if (options?.velocityMinimumMs && fingerprint.formElapsedMs !== undefined && fingerprint.formElapsedMs < options.velocityMinimumMs) {
    signals.push(makeSignal("submission_velocity", 35, "high"));
  }

  const score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.points, 0))));
  const disposition =
    score >= 81 ? "block" :
      score >= 61 ? "captcha" :
        score >= 31 ? "monitor" :
          "allow";

  return { score, disposition, signals };
};

export const consumeFixedWindowRateLimit = async (input: {
  key: string;
  limit: number;
  windowMs: number;
}) => {
  const ttlSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));
  const counter = await cacheIncrement(input.key, ttlSeconds);
  return {
    allowed: counter.count <= input.limit,
    count: counter.count,
    limit: input.limit,
    remaining: Math.max(0, input.limit - counter.count),
    retryAfterSeconds: counter.ttlSeconds,
    cacheMode: getCacheMode(),
  };
};

const consumeRouteRateLimits = async (req: Request, flow: string, rules: RateLimitRule[]) => {
  const ip = getRequestIp(req);
  const fingerprint = extractBotFingerprint(req);
  const identifier = (() => {
    const body = readRecord(req.body);
    const candidate = asString(body.email) || asString(body.username) || asString(body.identifier);
    return candidate ? hashSecurityValue(candidate.toLowerCase()) : null;
  })();
  const visitor = fingerprint.visitorHash ? hashSecurityValue(fingerprint.visitorHash) : null;

  for (const rule of rules) {
    const subjects = [
      `ip:${hashSecurityValue(ip)}`,
      visitor ? `visitor:${visitor}` : null,
      identifier ? `id:${identifier}` : null,
    ].filter(Boolean) as string[];

    for (const subject of subjects) {
      const result = await consumeFixedWindowRateLimit({
        key: `rl:${flow}:${rule.scope}:${subject}`,
        limit: rule.limit,
        windowMs: rule.windowMs,
      });
      if (!result.allowed) {
        return { ...result, scope: rule.scope };
      }
    }
  }

  return null;
};

const recaptchaReplayKey = (token: string) => `recaptcha:used:${hashSecurityValue(token)}`;

export const verifyRecaptchaForRequest = async (
  req: Request,
  action: string | string[],
  options?: { required?: boolean; threshold?: number },
) => {
  const expectedActions = Array.isArray(action) ? action : [action];
  const token = getRecaptchaTokenFromRequest(req);
  const threshold = options?.threshold ?? defaultRecaptchaScoreThreshold;

  if (!env.RECAPTCHA_SECRET_KEY) {
    if (env.NODE_ENV === "production" && (options?.required ?? captchaRequiredInProduction)) {
      return { ok: false, reason: "Human verification is not configured" };
    }
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, reason: "Human verification is required" };
  }

  if (await cacheGet(recaptchaReplayKey(token))) {
    return { ok: false, reason: "Human verification token was already used", replay: true };
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token,
      remoteip: getRequestIp(req),
    }),
  });
  const result = (await response.json()) as RecaptchaSiteVerifyResponse;

  if (!result.success) {
    return { ok: false, reason: "Human verification failed", errorCodes: result["error-codes"] || [] };
  }

  const score = typeof result.score === "number" ? result.score : 0;
  if (score < threshold) {
    return { ok: false, reason: "Human verification score is too low", score };
  }

  if (!result.action || !expectedActions.includes(result.action)) {
    return { ok: false, reason: "Human verification action mismatch", action: result.action };
  }

  if (result.hostname && !isTrustedRecaptchaHostname(result.hostname, req)) {
    return { ok: false, reason: "Human verification hostname mismatch", hostname: result.hostname };
  }

  if (result.challenge_ts) {
    const issuedAt = Date.parse(result.challenge_ts);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > defaultTokenMaxAgeMs || issuedAt - Date.now() > 30_000) {
      return { ok: false, reason: "Human verification token is stale" };
    }
  }

  await cacheSet(recaptchaReplayKey(token), "1", Math.ceil(defaultTokenMaxAgeMs / 1000) + 60);
  return {
    ok: true,
    score,
    action: result.action,
    hostname: result.hostname,
  };
};

const fingerprintBanKey = (visitorHash: string) => `bot-defense:visitor-ban:${hashSecurityValue(visitorHash)}`;

export const isFingerprintBanned = async (visitorHash?: string) => {
  if (!visitorHash) return false;
  return Boolean(await cacheGet(fingerprintBanKey(visitorHash)));
};

export const recordFingerprintEvent = async (req: Request, event: "account_created" | "failed_login" | "contact_submission") => {
  const visitorHash = req.botDefense?.fingerprint.visitorHash || extractBotFingerprint(req).visitorHash;
  if (!visitorHash) return { banned: false, count: 0 };

  const thresholds = {
    account_created: 20,
    failed_login: 50,
    contact_submission: 100,
  } satisfies Record<typeof event, number>;
  const counter = await cacheIncrement(
    `bot-defense:visitor:${hashSecurityValue(visitorHash)}:${event}`,
    24 * 60 * 60,
  );

  if (counter.count >= thresholds[event]) {
    await cacheSet(fingerprintBanKey(visitorHash), event, 7 * 24 * 60 * 60);
    return { banned: true, count: counter.count };
  }

  return { banned: false, count: counter.count };
};

export const resetBotDefenseStateForTests = async (keys: string[]) => {
  await Promise.all(keys.map((key) => cacheDelete(key)));
};

export const createBotDefenseMiddleware = (options: BotDefenseOptions) => {
  const captchaPolicy = options.captcha ?? "risk";
  const rateLimits = options.rateLimits ?? [];
  const expectedActions = Array.isArray(options.action) ? options.action : [options.action];

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!botDefenseEnabled) return next();

    const fingerprint = extractBotFingerprint(req);
    const risk = assessRequestRisk(req, { velocityMinimumMs: options.velocityMinimumMs });
    const hasAutomationSignal = risk.signals.some(
      (signal) => signal.name === "navigator_webdriver" || signal.name === "automation_user_agent",
    );
    const allowLocalAutomation =
      env.NODE_ENV !== "production" && localHostnames.has(requestHostname(req)) && hasAutomationSignal;
    req.botDefense = {
      action: expectedActions[0],
      flow: options.flow,
      fingerprint,
      risk,
    };

    const logEvent = async (event: string, details: Record<string, unknown> = {}, statusCode?: number) => {
      await options.logEvent?.(req, event, {
        flow: options.flow,
        action: expectedActions,
        riskScore: risk.score,
        riskDisposition: risk.disposition,
        riskSignals: risk.signals.map((signal) => signal.name),
        visitorHash: fingerprint.visitorHash ? hashSecurityValue(fingerprint.visitorHash).slice(0, 24) : null,
        cacheMode: getCacheMode(),
        ...details,
      }, statusCode);
    };

    if (await isFingerprintBanned(fingerprint.visitorHash)) {
      await logEvent("bot_detected", { reason: "fingerprint_ban" }, 403);
      return res.status(403).json({ message: "Request could not be verified." });
    }

    if (isHoneypotFilled(req)) {
      await logEvent("honeypot_hit", {}, options.honeypotResponse?.statusCode ?? 202);
      return res.status(options.honeypotResponse?.statusCode ?? 202).json(
        options.honeypotResponse?.body ?? { message: "Request received." },
      );
    }

    if (hasAutomationSignal && !allowLocalAutomation) {
      await logEvent("headless_detected", {}, 403);
      return res.status(403).json({ message: "Request could not be verified." });
    }

    if (risk.disposition === "block" && !allowLocalAutomation) {
      await logEvent("bot_detected", { reason: "risk_block" }, 403);
      return res.status(403).json({ message: "Request could not be verified." });
    }

    const rateLimitHit = rateLimits.length
      ? await consumeRouteRateLimits(req, options.flow, rateLimits)
      : null;
    if (rateLimitHit) {
      req.botDefense.rateLimit = {
        scope: rateLimitHit.scope,
        limit: rateLimitHit.limit,
        remaining: rateLimitHit.remaining,
        retryAfterSeconds: rateLimitHit.retryAfterSeconds,
        cacheMode: rateLimitHit.cacheMode,
      };
      res.setHeader("Retry-After", String(rateLimitHit.retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(rateLimitHit.limit));
      res.setHeader("X-RateLimit-Remaining", String(rateLimitHit.remaining));
      await logEvent("rate_limit_hit", { scope: rateLimitHit.scope }, 429);
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfterSeconds: rateLimitHit.retryAfterSeconds,
      });
    }

    if (!recaptchaConfigured && captchaRequiredInProduction && captchaPolicy !== "never") {
      await logEvent("captcha_failure", { reason: "recaptcha_not_configured" }, 503);
      return res.status(503).json({ message: "Human verification is not configured." });
    }

    const mustVerifyCaptcha =
      recaptchaConfigured &&
      (captchaPolicy === "always" ||
        (captchaPolicy === "risk" && risk.disposition === "captcha") ||
        (env.NODE_ENV === "production" && captchaPolicy !== "never" && captchaRequiredInProduction));

    if (mustVerifyCaptcha) {
      const recaptcha = await verifyRecaptchaForRequest(req, expectedActions, { required: true });
      req.botDefense.recaptcha = recaptcha.ok
        ? {
            ok: true,
            skipped: "skipped" in recaptcha ? recaptcha.skipped : undefined,
            score: "score" in recaptcha ? recaptcha.score : undefined,
            action: "action" in recaptcha ? recaptcha.action : undefined,
            hostname: "hostname" in recaptcha ? recaptcha.hostname : undefined,
          }
        : { ok: false };
      if (!recaptcha.ok) {
        await logEvent("captcha_failure", {
          reason: recaptcha.reason,
          score: "score" in recaptcha ? recaptcha.score : undefined,
          action: "action" in recaptcha ? recaptcha.action : undefined,
          hostname: "hostname" in recaptcha ? recaptcha.hostname : undefined,
          replay: "replay" in recaptcha ? recaptcha.replay : undefined,
        }, 400);
        return res.status(400).json({ message: recaptcha.reason || "Human verification failed" });
      }
      await logEvent("captcha_success", {
        score: recaptcha.score,
        action: recaptcha.action,
        hostname: recaptcha.hostname,
      }, 200);
    } else if (risk.disposition === "monitor") {
      await logEvent("bot_detected", { reason: "risk_monitor" }, 200);
    }

    return next();
  };
};
