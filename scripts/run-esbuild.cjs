const path = require("path");
const esbuild = require("esbuild");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const entryPoints = [];
const options = {};
let cwd = repoRoot;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--cwd") {
    cwd = path.resolve(repoRoot, args[++index] || ".");
    continue;
  }
  if (arg === "--bundle") {
    options.bundle = true;
    continue;
  }
  if (arg === "--minify") {
    options.minify = true;
    continue;
  }
  if (arg === "--sourcemap") {
    options.sourcemap = true;
    continue;
  }
  if (arg.startsWith("--platform=")) {
    options.platform = arg.slice("--platform=".length);
    continue;
  }
  if (arg === "--platform") {
    options.platform = args[++index];
    continue;
  }
  if (arg.startsWith("--packages=")) {
    options.packages = arg.slice("--packages=".length);
    continue;
  }
  if (arg === "--packages") {
    options.packages = args[++index];
    continue;
  }
  if (arg.startsWith("--format=")) {
    options.format = arg.slice("--format=".length);
    continue;
  }
  if (arg === "--format") {
    options.format = args[++index];
    continue;
  }
  if (arg.startsWith("--outdir=")) {
    options.outdir = arg.slice("--outdir=".length);
    continue;
  }
  if (arg === "--outdir") {
    options.outdir = args[++index];
    continue;
  }
  if (arg.startsWith("--outfile=")) {
    options.outfile = arg.slice("--outfile=".length);
    continue;
  }
  if (arg === "--outfile") {
    options.outfile = args[++index];
    continue;
  }
  if (arg.startsWith("--target=")) {
    options.target = arg.slice("--target=".length);
    continue;
  }
  if (arg === "--target") {
    options.target = args[++index];
    continue;
  }
  if (arg.startsWith("--external:")) {
    options.external ??= [];
    options.external.push(arg.slice("--external:".length));
    continue;
  }
  if (arg.startsWith("-")) {
    throw new Error(`Unsupported esbuild argument: ${arg}`);
  }
  entryPoints.push(arg);
}

if (entryPoints.length === 0) {
  throw new Error("At least one esbuild entry point is required.");
}

esbuild.build({
  absWorkingDir: cwd,
  entryPoints,
  logLevel: "info",
  ...options
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
