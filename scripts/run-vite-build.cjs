const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
const args = process.argv.slice(2);
const viteArgs = ["build"];
const env = { ...process.env };
let cwd = repoRoot;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--cwd") {
    cwd = path.resolve(repoRoot, args[++index] || ".");
    continue;
  }
  if (arg === "--env") {
    const assignment = args[++index] || "";
    const separator = assignment.indexOf("=");
    if (separator === -1) {
      throw new Error(`Invalid --env assignment: ${assignment}`);
    }
    env[assignment.slice(0, separator)] = assignment.slice(separator + 1);
    continue;
  }
  viteArgs.push(arg);
}

if (!fs.existsSync(viteBin)) {
  throw new Error("Vite is not installed. Run npm install --include=dev first.");
}

if (!env.NODE_OPTIONS?.includes("--max-old-space-size")) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" ");
}

const result = spawnSync(process.execPath, [viteBin, ...viteArgs], {
  cwd,
  env,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
