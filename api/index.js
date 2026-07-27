let appModulePromise;

const getAppModule = () => {
  appModulePromise ??= import("../server-build/index.js");
  return appModulePromise;
};

const rewriteRequestUrl = (req) => {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const mappedPath = requestUrl.searchParams.get("__mec_path");
  if (!mappedPath) return;

  requestUrl.searchParams.delete("__mec_path");
  const cleanPath = mappedPath.replace(/^\/+/, "");
  req.url = `/${cleanPath}${requestUrl.search}`;
};

const describeStartupError = (error) => {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `; cause: ${error.cause.message}` : "";
    return `${error.name}: ${error.message}${cause}`;
  }

  if (error && typeof error === "object") {
    const code = typeof error.code === "string" ? error.code : "";
    const message = typeof error.message === "string" ? error.message : "";
    const nested = error.error instanceof Error ? error.error.message : "";
    const details = [code, message, nested].filter(Boolean).join(": ");
    if (details) return details;

    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }

  return String(error || "Unknown server startup error");
};

export default async function handler(req, res) {
  try {
    rewriteRequestUrl(req);
    const appModule = await getAppModule();
    await appModule.ready;
    return appModule.default(req, res);
  } catch (error) {
    const detail = describeStartupError(error);
    const status = /required|authentication|password|database|connect|timeout/i.test(detail) ? 503 : 500;

    console.error("MEC API startup failure:", error);

    return res.status(status).json({
      message: "API startup failed",
      detail,
      hint:
        "Verify Vercel Production variables, especially JWT_SECRET and a valid pooled DATABASE_URL/POSTGRES_URL, then redeploy without build cache.",
    });
  }
}