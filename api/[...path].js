let appModulePromise;

const getAppModule = () => {
  appModulePromise ??= import("../server-build/index.js");
  return appModulePromise;
};

export default async function handler(req, res) {
  try {
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
