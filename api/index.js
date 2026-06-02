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

export default async function handler(req, res) {
  try {
    rewriteRequestUrl(req);
    const appModule = await getAppModule();
    await appModule.ready;
    return appModule.default(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server startup error";
    const status = message.includes("is required") ? 503 : 500;

    return res.status(status).json({
      message: "API startup failed",
      detail: message,
      hint:
        "Check Vercel Production Environment Variables (JWT_SECRET, DATABASE_URL, and related runtime config).",
    });
  }
}
