import { access, readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "artifacts",
  "coverage",
  "playwright-report",
  "test-results",
  ".vite"
]);
const REQUIRED_FILES = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  ".gitignore",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-pages.yml",
  "docs/PORTFOLIO_BRIEF.md"
];
const REQUIRED_GITIGNORE_ENTRIES = ["node_modules/", "dist/", "artifacts/", ".env"];
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
  ".yaml",
  ".yml"
]);
const TEXT_FILE_NAMES = new Set([".gitignore", ".nvmrc"]);
const SECRET_PATTERNS = [
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["OpenAI-style secret key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["database URL with embedded credentials", /\b(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^/\s:@]+:[^@\s]+@/i]
];
const SENSITIVE_FILE_PATTERNS = [
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa(?:\.pub)?$/i,
  /^id_ed25519(?:\.pub)?$/i
];

const issues = [];
const files = await collectFiles(ROOT);

await assertRequiredFiles();
await assertPackageMetadata();
await assertGitignore();
await scanFiles(files);

if (issues.length) {
  throw new Error(`Public audit failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
}

console.log(`Public audit passed. Scanned ${files.length} repository files; no publish blockers found.`);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const discovered = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      discovered.push(path);
    }
  }

  return discovered;
}

async function assertRequiredFiles() {
  for (const file of REQUIRED_FILES) {
    try {
      await access(join(ROOT, file));
    } catch {
      issues.push(`Missing required public repository file: ${file}`);
    }
  }
}

async function assertPackageMetadata() {
  const packageJsonPath = join(ROOT, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  if (packageJson.private !== false) {
    issues.push('package.json should set "private": false for a public portfolio package.');
  }

  if (!packageJson.license) {
    issues.push("package.json is missing a license field.");
  }

  if (!packageJson.scripts?.verify || !packageJson.scripts?.["public:audit"]) {
    issues.push("package.json should expose both verify and public:audit scripts.");
  }
}

async function assertGitignore() {
  const gitignore = await readFile(join(ROOT, ".gitignore"), "utf8");

  for (const entry of REQUIRED_GITIGNORE_ENTRIES) {
    if (!gitignore.includes(entry)) {
      issues.push(`.gitignore should include ${entry}`);
    }
  }
}

async function scanFiles(paths) {
  for (const path of paths) {
    const relativePath = normalizePath(relative(ROOT, path));
    const fileName = basename(path);

    if (fileName !== ".env.example" && /^\.env(?:\.|$)/.test(fileName)) {
      issues.push(`Local environment file should not be published: ${relativePath}`);
    }

    if (SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
      issues.push(`Sensitive-looking key file should not be published: ${relativePath}`);
    }

    if (!(await isTextFile(path))) {
      continue;
    }

    const contents = await readFile(path, "utf8");
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(contents)) {
        issues.push(`${label} pattern found in ${relativePath}`);
      }
    }
  }
}

async function isTextFile(path) {
  const fileName = basename(path);
  const extension = extname(path);

  if (TEXT_FILE_NAMES.has(fileName) || TEXT_EXTENSIONS.has(extension)) {
    return true;
  }

  const { size } = await stat(path);
  return size < 32 * 1024 && !extension;
}

function normalizePath(path) {
  return path.split("\\").join("/");
}
