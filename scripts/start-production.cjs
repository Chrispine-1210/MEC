const path = require("path");
const { pathToFileURL } = require("url");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const entry = path.join(__dirname, "..", "dist", "index.js");

import(pathToFileURL(entry).href).catch((error) => {
  console.error(error);
  process.exit(1);
});
