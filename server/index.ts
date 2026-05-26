import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "./env";

import helmet from "helmet";
import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { log, setupVite } from "./vite";

export const app = express();
const isProduction = env.NODE_ENV === "production";
const port = env.PORT;
const adminPort = env.ADMIN_PORT;
const isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true";
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com",
        ],
        childSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com",
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.set("trust proxy", true);

const splitOriginList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeOrigin = (value?: string) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
};

const productionBrowserOrigins = [
  "https://mtendereeducationconsult.com",
  "https://admin.mtendereeducationconsult.com",
];

const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

const hostnameFromUrl = (value?: string) => {
  if (!value) return null;

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const adminHostnames = new Set(
  [
    "admin.mtendereeducationconsult.com",
    hostnameFromUrl(env.ADMIN_APP_URL),
  ].filter(Boolean) as string[],
);

const requestHostname = (req: Request) =>
  (req.hostname || req.get("host")?.split(":")[0] || "").toLowerCase();

const isAdminHostname = (req: Request) => adminHostnames.has(requestHostname(req));

const developmentOrigins = isProduction
  ? []
  : [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:5173",
      `http://localhost:${adminPort}`,
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5173",
      `http://127.0.0.1:${adminPort}`,
      "http://0.0.0.0:5000",
      "http://0.0.0.0:5173",
      `http://0.0.0.0:${adminPort}`,
    ];

const allowedOrigins = new Set(
  (isProduction
    ? [
        ...productionBrowserOrigins,
        env.PUBLIC_APP_URL,
        env.FRONTEND_URL,
        env.ADMIN_APP_URL,
        env.VITE_SITE_URL,
        vercelOrigin,
        ...splitOriginList(env.CORS_ORIGIN),
        ...splitOriginList(env.CORS_ORIGINS),
        ...splitOriginList(env.ALLOWED_ORIGINS),
      ]
    : [
        env.PUBLIC_APP_URL,
        env.FRONTEND_URL,
        env.ADMIN_APP_URL,
        env.VITE_SITE_URL,
        ...splitOriginList(env.CORS_ORIGIN),
        ...splitOriginList(env.CORS_ORIGINS),
        ...splitOriginList(env.ALLOWED_ORIGINS),
        ...developmentOrigins,
        `http://127.0.0.1:${port}`,
        `http://0.0.0.0:${port}`,
        `http://127.0.0.1:${adminPort}`,
        `http://0.0.0.0:${adminPort}`,
      ])
    .map(normalizeOrigin)
    .filter(Boolean) as string[],
);

const isAllowedOrigin = (origin: string | undefined, req: Request) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);

  return Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin));
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");
  const originAllowed = isAllowedOrigin(origin, req);

  if (origin && originAllowed) {
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.get("access-control-request-headers") || "Content-Type,Authorization,X-CSRF-Token,X-Requested-With",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    return originAllowed
      ? res.sendStatus(204)
      : res.status(403).json({ message: "Request origin is not allowed" });
  }

  if (["GET", "HEAD"].includes(req.method)) {
    return next();
  }

  if (!origin) {
    return next();
  }

  if (originAllowed) {
    return next();
  }

  return res.status(403).json({ message: "Request origin is not allowed" });
});

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if ((req as Request).originalUrl === "/api/stripe/webhook") {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      }
    },
  }),
);
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

export const ready = (async () => {
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

  if (!isVercelRuntime && app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const clientDistPath = path.resolve(import.meta.dirname, "..", "dist", "client");
    const adminDistPath = path.resolve(import.meta.dirname, "..", "dist", "admin");

    if (fs.existsSync(adminDistPath)) {
      const adminStatic = express.static(adminDistPath);

      app.use((req, res, next) => {
        if (!isAdminHostname(req)) {
          return next();
        }

        return adminStatic(req, res, next);
      });
      app.get("*", (req, res, next) => {
        if (!isAdminHostname(req)) {
          return next();
        }

        return res.sendFile(path.join(adminDistPath, "index.html"));
      });

      app.use("/admin", adminStatic);
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

  if (!isVercelRuntime) {
    const listenHost = env.HOST || (isProduction ? "127.0.0.1" : "0.0.0.0");
    server.listen(port, listenHost, () => {
      log(`Server listening on ${listenHost}:${port}`);
    });
  }

  return server;
})();

export default app;
