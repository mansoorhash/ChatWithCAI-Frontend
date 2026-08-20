const fs = require("fs");
const path = require("path");

const authMdPath = path.join(__dirname, "..", "public", "auth.md");
const authMd = fs.readFileSync(authMdPath, "utf8");
const firstContentLine = authMd
  .split(/\r?\n/)
  .find((line) => line.trim().length > 0);

if (!/^#\s+.*auth\.md/i.test(firstContentLine || "")) {
  throw new Error("public/auth.md must start with an H1 containing auth.md");
}

const requiredSections = [
  "## Audience",
  "## Registration availability",
  "## Supported registration method",
  "## Authentication and credential use",
];

for (const section of requiredSections) {
  if (!authMd.includes(section)) {
    throw new Error(`public/auth.md is missing required section: ${section}`);
  }
}

console.log("auth.md is valid");
