#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testFiles = ["test/vat.test.js", "test/einvoice.test.js"];
const expectedTestCount = 45;
const requiredTitles = [
  "2026 standard rate is 22% (post-reform)",
  "VAT_RATES_2026: allowed issued rates for 2026",
  "validateEInvoice: vatRate 20 not allowed in 2026",
  "validateEInvoice: back-dated 2025 invoices allow the 20% rate",
  "buildEInvoiceXml: well-formed XML, starts with <?xml, contains seller ИНН + 22% line",
  "eInvoiceTotals: kopeck summation stays exact (no float drift)",
  "validateEInvoice: VAT mismatch (declared vatAmount inconsistent with rate)",
];

function createEvalRoot() {
  const evalRoot = mkdtempSync(path.join(os.tmpdir(), "a1-ru-vat-einvoice-"));
  cpSync(path.join(repoRoot, "src"), path.join(evalRoot, "src"), { recursive: true });
  mkdirSync(path.join(evalRoot, "test"), { recursive: true });
  for (const file of testFiles) {
    cpSync(path.join(repoRoot, file), path.join(evalRoot, file));
  }
  for (const file of ["package.json", "index.js"]) {
    const source = path.join(repoRoot, file);
    if (existsSync(source)) cpSync(source, path.join(evalRoot, file));
  }
  return evalRoot;
}

function testEnv(env, evalRoot) {
  return {
    CI: "1",
    NODE_ENV: "test",
    DOTENV_CONFIG_PATH: path.join(evalRoot, ".env.disabled"),
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    PATH: env.PATH || "",
    TMPDIR: env.TMPDIR || "",
    TMP: env.TMP || "",
    TEMP: env.TEMP || "",
    SystemRoot: env.SystemRoot || "",
    ComSpec: env.ComSpec || "",
    PATHEXT: env.PATHEXT || "",
  };
}

function validateTapReport(reportPath) {
  if (!existsSync(reportPath)) return "missing Node TAP report";
  const tap = readFileSync(reportPath, "utf8");
  if (!tap.includes(`1..${expectedTestCount}`)) {
    return `missing TAP plan 1..${expectedTestCount}`;
  }
  if (/^not ok\s+\d+/m.test(tap)) return "TAP report contains failing tests";
  if (/^ok\s+\d+\s+-\s+.+#\s*(SKIP|TODO)\b/im.test(tap)) {
    return "TAP report contains skipped or TODO tests";
  }
  const okTitles = Array.from(tap.matchAll(/^ok\s+\d+\s+-\s+(.+)$/gm), (match) => match[1].trim());
  if (okTitles.length !== expectedTestCount) {
    return `expected ${expectedTestCount} passing tests, got ${okTitles.length}`;
  }
  const titleSet = new Set(okTitles);
  for (const title of requiredTitles) {
    if (!titleSet.has(title)) return `missing expected test title: ${title}`;
  }
  return "";
}

let evalRoot = "";
let result = { status: 1, stdout: "", stderr: "", error: null };
let reportError = "";
try {
  evalRoot = createEvalRoot();
  const reportPath = path.join(evalRoot, "vat-einvoice-report.tap");
  const args = [
    "--test",
    "--test-concurrency=4",
    "--test-timeout=60000",
    "--test-reporter=tap",
    `--test-reporter-destination=${reportPath}`,
    ...testFiles,
  ];
  result = spawnSync(process.execPath, args, {
    cwd: evalRoot,
    encoding: "utf8",
    env: testEnv(process.env, evalRoot),
    shell: false,
  });
  reportError = validateTapReport(reportPath);
} catch (error) {
  reportError = error && error.message ? error.message : String(error);
} finally {
  if (evalRoot) rmSync(evalRoot, { recursive: true, force: true });
}

const failed = result.error || result.status !== 0 || reportError;
console.log(`failing_checks=${failed ? 1 : 0}`);

if (reportError) {
  console.error(`report_validation_error=${reportError}`);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(result.error.message);
}
process.exitCode = failed ? 1 : 0;
