import path from "path";
import "dotenv/config"; // must load first

import session from "express-session";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// ✅ REQUIRED behind Cloudflare / reverse proxy
app.set("trust proxy", true);

app.use(cookieParser());

app.use(
  session({
    name: "__Host-session",
    secret: process.env.SESSION_SECRET || "change-this-now",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,        // HTTPS only
      httpOnly: true,      // JS cannot read
      sameSite: "lax",     // safe default
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalResJson = res.json;
  let capturedJsonResponse: any;

  res.json = function (body, ...args) {
    capturedJsonResponse = body;
    return originalResJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      let logLine = `${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine.length > 120 ? logLine.slice(0, 119) + "…" : logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message} (${status})`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      next();
    });

    await setupVite(app, server);
  } else {
    // Production: serve built React files
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 8080;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
