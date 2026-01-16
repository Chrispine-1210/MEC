import path from "path";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
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
