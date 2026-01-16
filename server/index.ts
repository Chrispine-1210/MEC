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

/* -----------------------------------------------------
   Core middleware
----------------------------------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* -----------------------------------------------------
   API request logger (only logs /api routes)
----------------------------------------------------- */
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestPath = req.path;

  let responseBody: any;

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (!requestPath.startsWith("/api")) return;

    const duration = Date.now() - startTime;
    let line = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;

    if (responseBody) {
      line += ` :: ${JSON.stringify(responseBody)}`;
    }

    if (line.length > 80) {
      line = line.slice(0, 79) + "…";
    }

    log(line);
  });

  next();
});

/* -----------------------------------------------------
   Bootstrap server
----------------------------------------------------- */
(async () => {
  const server = await registerRoutes(app);

  /* ---------------------------------------------------
     Global error handler (must be after routes)
  --------------------------------------------------- */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });

    // Crash loudly in development
    if (app.get("env") === "development") {
      console.error(err);
    }
  });

  /* ---------------------------------------------------
     Frontend handling
  --------------------------------------------------- */
  if (app.get("env") === "development") {
    // Vite dev server (HMR, fast refresh)
    await setupVite(app, server);
  } else {
    // Static production builds
    app.use(express.static("dist/client"));
    app.use("/admin", express.static("dist/admin"));

    app.get("/admin/*", (_req, res) => {
      res.sendFile(path.resolve("dist/admin/index.html"));
    });

    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist/client/index.html"));
    });
  }

  /* ---------------------------------------------------
     Server listen
  --------------------------------------------------- */
  const PORT = Number(process.env.PORT);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();

