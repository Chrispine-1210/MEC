const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const esbuildBin = path.join(repoRoot, "node_modules", "esbuild", "bin", "esbuild");
const args = process.argv.slice(2);
const esbuildArgs = [];
let cwd = repoRoot;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--cwd") {
    cwd = path.resolve(repoRoot, args[++index] || ".");
    continue;
  }
  esbuildArgs.push(arg);
}

if (!fs.existsSync(esbuildBin)) {
  throw new Error("esbuild is not installed. Run npm install --include=dev first.");
}

const result = spawnSync(process.execPath, [esbuildBin, ...esbuildArgs], {
  cwd,
  env: process.env,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
