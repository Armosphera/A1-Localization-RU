#!/usr/bin/env node
/**
 * evals/karpathy/vat-2026-reform/check.js
 *
 * Locks the 2026 Russian tax reform contract per НК РФ гл. 21 + ФЗ № 425-ФЗ
 * от 28.11.2025 (effective 2026-01-01).
 *
 * What changed in 2026:
 * - Standard VAT: 20% → 22%
 * - Reduced VAT: 10% (unchanged)
 * - Zero-rated: 0% (unchanged)
 * - Pension ceiling: 1,917,000 → 2,500,000 RUB/year
 * - Above-ceiling rates: pension 0.1%, medical 0%, social 15%
 * - УСН special rates: 5% (income) / 7% (income - expenses)
 *
 * Source:
 * - src/vat.js (VAT rates + УСН, 2026 reform)
 * - src/pension_ru.js (pension/medical/social rates, 2026 reform)
 * - test_vat_ru.py (43 dedicated tests, this session)
 * - НК РФ гл. 21
 * - ФЗ № 425-ФЗ от 28.11.2025
 * - ФЗ № 306-ФЗ от 24.07.2023 (employee rate = 0% since 2023)
 *
 * Run: node evals/karpathy/vat-2026-reform/check.js
 * Exit 0 = all 2026 reform contracts pass. Non-zero = drift.
 */

"use strict";

const fs = require("fs");
const path = require("path");

let failed = false;
function check(name, expected, actual) {
  if (expected === actual) {
    console.log(`✓ ${name}: ${expected}`);
    return true;
  }
  console.error(`✗ ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  failed = true;
  return false;
}

const VAT_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "..", "src", "vat.js"), "utf8"
);
const PENSION_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "..", "src", "pension_ru.js"), "utf8"
);

// ─── 1. VAT rates (in vat.js) ──────────────────────

// Standard rate 2026 (post-reform)
const VAT_2026 = VAT_SRC.match(/2026:\s*Object\.freeze\(\{[^}]*standard:\s*(\d+)[^}]*reduced:\s*(\d+)[^}]*zero:\s*(\d+)/);
check("VAT_RATES.2026.standard = 22 (post-reform)", "22", VAT_2026?.[1]);
check("VAT_RATES.2026.reduced = 10 (unchanged)", "10", VAT_2026?.[2]);
check("VAT_RATES.2026.zero = 0 (unchanged)", "0", VAT_2026?.[3]);

// Standard rate 2025 (pre-reform, for back-dated docs)
const VAT_2025 = VAT_SRC.match(/2025:\s*Object\.freeze\(\{[^}]*standard:\s*(\d+)/);
check("VAT_RATES.2025.standard = 20 (pre-reform, back-dated)", "20", VAT_2025?.[1]);

// УСН special rates
const USN_LOW = VAT_SRC.match(/usnLow:\s*(\d+)/);
check("VAT_RATES.2026.usnLow = 5 (УСН income)", "5", USN_LOW?.[1]);

const USN_HIGH = VAT_SRC.match(/usnHigh:\s*(\d+)/);
check("VAT_RATES.2026.usnHigh = 7 (УСН income-expenses)", "7", USN_HIGH?.[1]);

// Current year
const CURRENT_YEAR = VAT_SRC.match(/CURRENT_YEAR\s*=\s*(\d+)/);
check("CURRENT_YEAR = 2026", "2026", CURRENT_YEAR?.[1]);

// ─── 2. Pension rates (in pension_ru.js) ───────────

// Standard within-ceiling rates (2026 post-reform)
const EMPLOYER_RATE_PENSION = PENSION_SRC.match(/EMPLOYER_RATE_PENSION:\s*(\d+)/);
check("PENSION_2026.EMPLOYER_RATE_PENSION = 22", "22", EMPLOYER_RATE_PENSION?.[1]);

const EMPLOYER_RATE_MEDICAL = PENSION_SRC.match(/EMPLOYER_RATE_MEDICAL:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_RATE_MEDICAL = 5.1", "5.1", EMPLOYER_RATE_MEDICAL?.[1]);

const EMPLOYER_RATE_SOCIAL = PENSION_SRC.match(/EMPLOYER_RATE_SOCIAL:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_RATE_SOCIAL = 2.9", "2.9", EMPLOYER_RATE_SOCIAL?.[1]);

const EMPLOYER_TOTAL_WITHIN = PENSION_SRC.match(/EMPLOYER_TOTAL_WITHIN_CEILING:\s*(\d+)/);
check("PENSION_2026.EMPLOYER_TOTAL_WITHIN_CEILING = 30 (22 + 5.1 + 2.9)", "30", EMPLOYER_TOTAL_WITHIN?.[1]);

// Above-ceiling rates
const ABOVE_PENSION = PENSION_SRC.match(/EMPLOYER_RATE_ABOVE_CEILING_PENSION:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION = 0.1", "0.1", ABOVE_PENSION?.[1]);

const ABOVE_MEDICAL = PENSION_SRC.match(/EMPLOYER_RATE_ABOVE_CEILING_MEDICAL:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL = 0", "0", ABOVE_MEDICAL?.[1]);

const ABOVE_SOCIAL = PENSION_SRC.match(/EMPLOYER_RATE_ABOVE_CEILING_SOCIAL:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL = 15", "15", ABOVE_SOCIAL?.[1]);

const ABOVE_TOTAL = PENSION_SRC.match(/EMPLOYER_TOTAL_ABOVE_CEILING:\s*([\d.]+)/);
check("PENSION_2026.EMPLOYER_TOTAL_ABOVE_CEILING = 15.1 (0.1 + 0 + 15)", "15.1", ABOVE_TOTAL?.[1]);

// Employee rate = 0% (post-2023 reform)
const EMPLOYEE_TOTAL = PENSION_SRC.match(/EMPLOYEE_TOTAL:\s*(\d+)/);
check("EMPLOYEE_TOTAL = 0 (post-2023 reform)", "0", EMPLOYEE_TOTAL?.[1]);

// ─── 3. Pension ceiling (2,500,000 RUB in 2026) ────

const CEILING = PENSION_SRC.match(/DEFAULT_ANNUAL_CEILING_RUB:\s*([\d_]+)/);
const CEILING_VAL = CEILING?.[1]?.replace(/_/g, "");
check("PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB = 2,500,000", "2500000", CEILING_VAL);

// ─── 4. Math.round for kopecks rounding (НК РФ ст. 52) ───

const HAS_MATH_ROUND = (PENSION_SRC.match(/Math\.round\(/g) || []).length;
check("Uses Math.round (st. 52 kopecks rounding, >= 3 usages)", true, HAS_MATH_ROUND >= 3);

// ─── Result ──────────────────────────────────────────────

if (failed) {
  console.log("\n✗ vat-2026-reform contract violations detected.");
  process.exit(1);
} else {
  console.log("\n✓ All vat-2026-reform contract checks pass.");
  process.exit(0);
}