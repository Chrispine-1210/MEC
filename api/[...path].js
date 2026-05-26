let appModulePromise;

const getAppModule = () => {
  appModulePromise ??= import("../server-build/index.js");
  return appModulePromise;
};

export default async function handler(req, res) {
  const appModule = await getAppModule();
  await appModule.ready;
  return appModule.default(req, res);
}
