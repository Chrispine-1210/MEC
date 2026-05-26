const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist");
const removable = ["dist/index.js", "dist/index.js.map"];

for (const relativePath of removable) {
  const target = path.resolve(repoRoot, relativePath);
  if (target !== distRoot && !target.startsWith(`${distRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove unexpected path: ${target}`);
  }
  fs.rmSync(target, { force: true });
}
