import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.resolve(rootDir, ".env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: false, quiet: true });

const configuredAdminPort = Number(process.env.ADMIN_PORT ?? process.env.VITE_ADMIN_PORT ?? 5174);
const adminPort = Number.isFinite(configuredAdminPort) && configuredAdminPort > 0
  ? configuredAdminPort
  : 5174;

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    outDir: path.resolve(__dirname, "..", "dist", "admin"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },

  base: "/admin/",

  server: {
    port: adminPort,
    strictPort: false,
    fs: {
      allow: [".."],
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    proxy: {
      "/api": "http://localhost:5000",
      "/auth": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
      "/media-assets": "http://localhost:5000",
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },

  optimizeDeps: {
    include: ["ws"],
  },
});
