import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import cors from "cors";
import { env } from "./env";

import helmet from "helmet";
import express, { type NextFunction, type Request, type Response } from "express";
import { closeCache, initializeCache } from "./cache";
import { ensureDatabaseSchema } from "./db";
import { recordAppError, recordHttpRequest, renderPrometheusMetrics } from "./observability";
import { registerRoutes } from "./routes";
import { captureServerException, initializeSentry, isSentryEnabled } from "./sentry";
import { log, setupVite } from "./vite";

const app = express();
const isProduction = env.NODE_ENV === "production";
const port = env.PORT;
const SENSITIVE_LOG_FIELDS = new Set([
  "password",
  "token",
  "refreshToken",
  "authorization",
  "cookie",
  "apiKey",
  "secret",
]);

initializeSentry();

const sanitizeForLog = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }
  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_LOG_FIELDS.has(key) ? "[redacted]" : sanitizeForLog(nestedValue, depth + 1);
    }
    return sanitized;
  }
  return value;
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "https://mtendereeducationconsult.com"],
        connectSrc: isProduction
          ? ["'self'", "https:", "wss:", "https://api.mtendereeducationconsult.com"]
          : ["'self'", "http://localhost:*", "ws://localhost:*", "https:", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https:", "https://mtendereeducationconsult.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["https://mtendereeducationconsult.com"],
    credentials: true,
  }),
);

app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

const rateLimitWindowMs = env.RATE_LIMIT_WINDOW_MS;
const rateLimitMax = env.RATE_LIMIT_MAX;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const pruneRateLimitStore = () => {
  const now = Date.now();
  if (rateLimitStore.size < 1000) return;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/auth")) {
    return next();
  }

  pruneRateLimitStore();

  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const scope = req.path.startsWith("/auth") ? "auth" : "api";
  const key = `${ip}:${scope}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return next();
  }

  entry.count += 1;
  if (entry.count > rateLimitMax) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfter.toString());
    return res.status(429).json({ message: "Too many requests. Please try again shortly." });
  }

  return next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestPath = req.path;
  const requestId = randomUUID();

  res.setHeader("X-Request-Id", requestId);

  let responseBody: unknown;

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    recordHttpRequest(req.method, requestPath, res.statusCode, duration);

    if (!requestPath.startsWith("/api")) {
      return;
    }

    let line = `[${requestId}] ${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;

    if (responseBody !== undefined) {
      line += ` :: ${JSON.stringify(sanitizeForLog(responseBody))}`;
    }

    if (line.length > 180) {
      line = `${line.slice(0, 177)}...`;
    }

    log(line);
  });

  next();
});

app.get(env.METRICS_PATH, (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(renderPrometheusMetrics());
});

(async () => {
  await initializeCache();
  if (env.SKIP_DB_SCHEMA_BOOTSTRAP) {
    log("Skipping database schema bootstrap because SKIP_DB_SCHEMA_BOOTSTRAP is enabled.");
  } else {
    await ensureDatabaseSchema();
  }
  const server = await registerRoutes(app);

  app.use(["/api", "/auth"], (req, res) => {
    res.status(404).json({
      message: "API route not found",
      path: req.originalUrl,
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status) || 500
        : typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode) || 500
          : 500;

    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message || "Internal Server Error")
        : "Internal Server Error";

    if (!isProduction) {
      console.error(err);
    }

    captureServerException(err, {
      status,
      path: _req.path,
      method: _req.method,
      requestId: _req.headers["x-request-id"],
    });
    recordAppError(status);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const clientDistPath = path.resolve(import.meta.dirname, "..", "dist", "client");
    const adminDistPath = path.resolve(import.meta.dirname, "..", "dist", "admin");

    if (fs.existsSync(adminDistPath)) {
      app.use("/admin", express.static(adminDistPath));
      app.get("/admin/*", (_req, res) => {
        res.sendFile(path.join(adminDistPath, "index.html"));
      });
    }

    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      log(`Port ${port} is already in use. Stop the other process or set PORT to a free value.`);
      process.exit(1);
    }
    throw error;
  });

  server.listen(port, "0.0.0.0", () => {
    log(`Server listening on port ${port}`);
    if (isSentryEnabled()) {
      log("Sentry error tracking enabled");
    }
  });

  const shutdown = async (signal: string) => {
    log(`Received ${signal}. Shutting down gracefully...`);
    await closeCache();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
})();
