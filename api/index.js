let appModulePromise;

const getAppModule = () => {
  appModulePromise ??= import("../server-build/index.js");
  return appModulePromise;
};

const allowedMappedPathPattern =
  /^(api\/|auth\/|uploads\/|media-assets\/|ws$|robots\.txt$|sitemap\.xml$|(?:pages|scholarships|jobs|blog|events|partners|images)-sitemap\.xml$)/i;
const blockedMappedPathPattern =
  /(^|\/)(?:\.|%2e|server|server-build|shared|client\/src|admin\/server|node_modules|migrations|scripts|logs|data|uploads\/\.|media-assets\/\.)(?:\/|$)|(?:\.\.|%2e%2e|\\|%5c|\0|%00)/i;

const rewriteRequestUrl = (req) => {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const mappedPath = requestUrl.searchParams.get("__mec_path");
  if (!mappedPath) return;

  requestUrl.searchParams.delete("__mec_path");
  const cleanPath = mappedPath.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (
    !allowedMappedPathPattern.test(cleanPath) ||
    blockedMappedPathPattern.test(cleanPath) ||
    cleanPath.length > 1024
  ) {
    const error = new Error("Invalid internal route mapping");
    error.statusCode = 404;
    throw error;
  }

  req.url = `/${cleanPath}${requestUrl.search}`;
};

export default async function handler(req, res) {
  try {
    rewriteRequestUrl(req);
    const appModule = await getAppModule();
    await appModule.ready;
    return appModule.default(req, res);
  } catch (error) {
    console.error("[api] request failed", error);

    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode) || 500
        : error instanceof Error && error.message.includes("is required")
          ? 503
          : 500;
    const isStartupConfigError = status === 503;

    return res.status(status).json({
      message: isStartupConfigError ? "API configuration is incomplete" : "API request failed",
      hint: isStartupConfigError
        ? "Check Vercel Production Environment Variables and required runtime config."
        : "The request could not be processed.",
    });
  }
}
