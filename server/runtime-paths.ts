import os from "os";
import path from "path";

export const isVercelRuntime = process.env.VERCEL === "1";

export const resolveWritableRuntimePath = (...segments: string[]) =>
  isVercelRuntime
    ? path.join(os.tmpdir(), "mec", ...segments)
    : path.resolve(import.meta.dirname, "..", ...segments);
