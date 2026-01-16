import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

/**
 * Simple timestamped logger
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Setup Vite in middleware mode for development
 * IMPORTANT:
 * - /api/** is NEVER handled by Vite
 * - Vite only serves frontend routes
 */
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    customLogger: {
      ...viteLogger,
      error(msg, options) {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  /**
   * 1️⃣ Let Vite handle ONLY non-API requests (assets, HMR, etc.)
   */
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next(); // 🚫 API stays with Express
    }
    return vite.middlewares(req, res, next);
  });

  /**
   * 2️⃣ SPA fallback — render index.html
   *    NEVER for /api routes
   */
  app.use(async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next(); // 🚫 absolutely never render HTML for API
    }

    try {
      const indexHtmlPath = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(indexHtmlPath, "utf-8");

      // Force reload in dev
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const html = await vite.transformIndexHtml(req.originalUrl, template);

      res
        .status(200)
        .setHeader("Content-Type", "text/html")
        .end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

/**
 * Serve built frontend in production
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build folder not found at ${distPath}. Run the client build first.`
    );
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
