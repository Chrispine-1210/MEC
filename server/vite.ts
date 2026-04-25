import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const clientVite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Try to load Admin vite config dynamically. If present, create second Vite server.
  let adminVite: any | undefined;
  try {
    // dynamic import to avoid crash when Admin isn't present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // use import() to support ESM resolution
    // @ts-ignore
    const adminViteConfigModule = await import("../Admin/vite.config");
    const adminViteConfig = adminViteConfigModule?.default;
    if (adminViteConfig) {
      adminVite = await createViteServer({
        ...adminViteConfig,
        configFile: false,
        customLogger: {
          ...viteLogger,
          error: (msg, options) => {
            viteLogger.error(msg, options);
            process.exit(1);
          },
        },
        server: serverOptions,
        appType: "custom",
      });
      log("Admin Vite middleware enabled", "vite");
    }
  } catch (err) {
    // Admin app not present or failed to load — ignore for dev
  }

  // Route static/dev asset requests to the correct Vite middleware
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    if (adminVite && req.originalUrl.startsWith("/admin")) {
      return adminVite.middlewares(req, res, next);
    }
    return clientVite.middlewares(req, res, next);
  });

  // SPA fallback: serve Admin index for /admin/*, otherwise client index
  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }

    try {
      if (adminVite && req.originalUrl.startsWith("/admin")) {
        const adminIndex = path.resolve(import.meta.dirname, "..", "Admin", "client", "index.html");
        let template = await fs.promises.readFile(adminIndex, "utf-8");
        template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
        const html = await adminVite.transformIndexHtml(req.originalUrl, template);
        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      }

      const clientIndex = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientIndex, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const html = await clientVite.transformIndexHtml(req.originalUrl, template);
      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (adminVite && req.originalUrl.startsWith("/admin")) {
        adminVite.ssrFixStacktrace(e as Error);
      } else {
        clientVite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
