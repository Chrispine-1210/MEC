const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const requiredPackages = ["cross-env", "vite", "esbuild"];
const missingPackages = requiredPackages.filter(
  (name) => !existsSync(`node_modules/${name}/package.json`),
);

if (missingPackages.length === 0) {
  process.exit(0);
}

console.log(
  `[build] Missing dev dependencies (${missingPackages.join(
    ", ",
  )}); running npm ci --include=dev before build.`,
);

const result = spawnSync("npm", ["ci", "--include=dev"], {
  env: {
    ...process.env,
    NPM_CONFIG_PRODUCTION: "false",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
