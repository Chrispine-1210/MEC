import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "./env";

import helmet from "helmet";
import express, { type NextFunction, type Request, type Response } from "express";
import { ensureDatabaseSchema } from "./db";
import { registerRoutes } from "./routes";
import { log, setupVite } from "./vite";

const app = express();
const isProduction = env.NODE_ENV === "production";
const port = env.PORT;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
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
    if (!requestPath.startsWith("/api")) {
      return;
    }

    const duration = Date.now() - startTime;
    let line = `[${requestId}] ${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;

    if (responseBody !== undefined) {
      line += ` :: ${JSON.stringify(responseBody)}`;
    }

    if (line.length > 180) {
      line = `${line.slice(0, 177)}...`;
    }

    log(line);
  });

  next();
});

(async () => {
  await ensureDatabaseSchema();
  const server = await registerRoutes(app);

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
  });
})();
