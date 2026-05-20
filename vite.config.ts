import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });

const configuredAdminPort = Number(process.env.ADMIN_PORT ?? 5174);
const adminPort = Number.isFinite(configuredAdminPort) && configuredAdminPort > 0
  ? configuredAdminPort
  : 5174;
const configuredApiPort = Number(process.env.PORT ?? 5000);
const apiPort = Number.isFinite(configuredApiPort) && configuredApiPort > 0
  ? configuredApiPort
  : 5000;
const apiTarget = `http://localhost:${apiPort}`;
const wsTarget = `ws://localhost:${apiPort}`;

export default defineConfig({
  root: path.resolve(__dirname, "client"),

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "client/src/assets"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },

  server: {
    port: adminPort,
    strictPort: false,
    fs: {
      strict: false,
    },
    proxy: {
      "/api": apiTarget,
      "/auth": apiTarget,
      "/uploads": apiTarget,
      "/media-assets": apiTarget,
      "/ws": {
        target: wsTarget,
        ws: true,
      },
    },
  },
});
