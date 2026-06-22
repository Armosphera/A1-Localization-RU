#!/usr/bin/env node
/**
 * evals/karpathy/pension-ru-ceiling-crossing/check.js
 *
 * Locks the Russian funded pension cross-ceiling-month contract per
 * НК РФ ст. 425-430 + ФЗ № 425-ФЗ от 28.11.2025. Fails if:
 *   - PENSION_2026 constants (rates, ceiling) change
 *   - The within-ceiling + above-ceiling split is wrong
 *   - Math.round per ст. 52 (whole-ruble rounding) is missing
 *   - pensionEmployerMonthly handles cross-ceiling month incorrectly
 *   - pensionEmployeeMonthly is 0% (post-2023 reform) — must stay 0
 *   - pension_ru.js has network or fs require (sovereign/offline)
 *
 * Sources:
 *   - НК РФ ст. 425-430 (unified social insurance tariff)
 *   - ФЗ № 167-ФЗ "Об обязательном пенсионном страховании в РФ"
 *   - ФЗ № 400-ФЗ "О страховых пенсиях"
 *   - ФЗ № 425-ФЗ от 28.11.2025 (effective 2026-01-01)
 *   - ФЗ № 306-ФЗ от 24.07.2023 (employee rate = 0 since 2023 reform)
 *
 * Exit 0 = pass. Non-zero = contract drift.
 *
 * Run:
 *   node evals/karpathy/pension-ru-ceiling-crossing/check.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
  PENSION_2026,
  pensionEmployerMonthly,
  pensionEmployeeMonthly,
  pensionSplitFor2026,
} = require(path.join(__dirname, "..", "..", "..", "src", "pension_ru"));

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

// ─── 1. Constants (per НК РФ ст. 425, ФЗ № 425-ФЗ) ────────────────

// Within ceiling rates
check("PENSION_2026.EMPLOYER_RATE_PENSION", 22, PENSION_2026.EMPLOYER_RATE_PENSION);
check("PENSION_2026.EMPLOYER_RATE_MEDICAL", 5.1, PENSION_2026.EMPLOYER_RATE_MEDICAL);
check("PENSION_2026.EMPLOYER_RATE_SOCIAL", 2.9, PENSION_2026.EMPLOYER_RATE_SOCIAL);

// Above ceiling rates
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION", 0.1, PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION);
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL", 0, PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL);
check("PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL", 15, PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL);

// Sum check (within ceiling = 30%)
const withinSum = PENSION_2026.EMPLOYER_RATE_PENSION + PENSION_2026.EMPLOYER_RATE_MEDICAL + PENSION_2026.EMPLOYER_RATE_SOCIAL;
check("within-ceiling sum = 30% (ст. 425)", 30, withinSum);

// Sum check (above ceiling = 15.1%)
const aboveSum = PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION + PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL + PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL;
check("above-ceiling sum = 15.1% (ст. 425)", 15.1, aboveSum);

// Employee rate is 0 (post-2023 reform)
check("PENSION_2026.EMPLOYEE_TOTAL = 0 (post-2023 reform)", 0, PENSION_2026.EMPLOYEE_TOTAL);

// Default annual ceiling (2.5M RUB per ФЗ № 425-ФЗ)
check("PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB = 2_500_000", 2_500_000, PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB);

// ─── 2. pensionSplitFor2026 (within vs above ceiling) ───────────

// Within ceiling: 1M base
const within1M = pensionSplitFor2026({ annualBase: 1_000_000 });
// pension: 1M × 22% = 220,000
// medical: 1M × 5.1% = 51,000
// social: 1M × 2.9% = 29,000
check("pensionSplitFor2026(1M).pension = 220,000", 220_000, within1M.pension);
check("pensionSplitFor2026(1M).medical = 51,000", 51_000, within1M.medical);
check("pensionSplitFor2026(1M).social = 29,000", 29_000, within1M.social);
check("pensionSplitFor2026(1M).aboveCeiling = false", false, within1M.aboveCeiling);

// Pure above ceiling: 10M base
const above10M = pensionSplitFor2026({ annualBase: 10_000_000 });
// Within portion: 2.5M (rate 22/5.1/2.9)
// Above portion: 7.5M (rate 0.1/0/15)
// pension: 2.5M * 22% + 7.5M * 0.1% = 550,000 + 7,500 = 557,500
// medical: 2.5M * 5.1% + 7.5M * 0% = 127,500
// social: 2.5M * 2.9% + 7.5M * 15% = 72,500 + 1,125,000 = 1,197,500
check("pensionSplitFor2026(10M).pension = 557,500 (within+above)", 557_500, above10M.pension);
check("pensionSplitFor2026(10M).medical = 127,500 (only within)", 127_500, above10M.medical);
check("pensionSplitFor2026(10M).social = 1,197,500 (within+above)", 1_197_500, above10M.social);
check("pensionSplitFor2026(10M).aboveCeiling = true", true, above10M.aboveCeiling);
check("pensionSplitFor2026(10M).withinCeilingAmount = 2,500,000", 2_500_000, above10M.withinCeilingAmount);
check("pensionSplitFor2026(10M).aboveCeilingAmount = 7,500,000", 7_500_000, above10M.aboveCeilingAmount);

// Edge case: exactly at ceiling
const atCeiling = pensionSplitFor2026({ annualBase: 2_500_000 });
// All within ceiling (g ≤ ceiling, not >)
check("pensionSplitFor2026(2.5M).aboveCeiling = false (at boundary)", false, atCeiling.aboveCeiling);
check("pensionSplitFor2026(2.5M).withinCeilingAmount = 2,500,000", 2_500_000, atCeiling.withinCeilingAmount);
check("pensionSplitFor2026(2.5M).aboveCeilingAmount = 0", 0, atCeiling.aboveCeilingAmount);

// Just over ceiling
const justOver = pensionSplitFor2026({ annualBase: 2_500_001 });
check("pensionSplitFor2026(2.5M+1).aboveCeiling = true", true, justOver.aboveCeiling);
check("pensionSplitFor2026(2.5M+1).aboveCeilingAmount = 1", 1, justOver.aboveCeilingAmount);

// ─── 3. pensionEmployerMonthly (cross-ceiling month) ───────────

// Fully within ceiling
const monthlyLow = pensionEmployerMonthly({ monthlyPay: 200_000 });
check("monthly(200k).pension = 22% × 200k = 44,000", 44_000, monthlyLow.pension);
check("monthly(200k).medical = 5.1% × 200k = 10,200", 10_200, monthlyLow.medical);
check("monthly(200k).social = 2.9% × 200k = 5,800", 5_800, monthlyLow.social);
check("monthly(200k).totalEmployer = 60,000 (30%)", 60_000, monthlyLow.totalEmployer);
check("monthly(200k).withinCeiling = 200,000", 200_000, monthlyLow.withinCeiling);
check("monthly(200k).aboveCeiling = 0", 0, monthlyLow.aboveCeiling);

// Fully above ceiling (huge pay)
const monthlyHigh = pensionEmployerMonthly({ monthlyPay: 10_000_000 });
check("monthly(10M).withinCeiling = 2,500,000", 2_500_000, monthlyHigh.withinCeiling);
check("monthly(10M).aboveCeiling = 7,500,000", 7_500_000, monthlyHigh.aboveCeiling);
// pension: 2.5M × 22% + 7.5M × 0.1% = 550,000 + 7,500 = 557,500
check("monthly(10M).pension = 557,500", 557_500, monthlyHigh.pension);

// Cross-ceiling month (200k pay, but YTD already 2.4M)
const monthlyCross = pensionEmployerMonthly({
  monthlyPay: 200_000,
  ceilingAnnual: 2_500_000,
  yearToDatePensionBase: 2_400_000,
});
// 100k within: 22% + 5.1% + 2.9% = 30% (pension 22,000, medical 5,100, social 2,900)
// 100k above: 0.1% + 0% + 15% = 15.1% (pension 100, medical 0, social 15,000)
check("cross(200k @ 2.4M YTD).withinCeiling = 100,000", 100_000, monthlyCross.withinCeiling);
check("cross(200k @ 2.4M YTD).aboveCeiling = 100,000", 100_000, monthlyCross.aboveCeiling);
check("cross(200k @ 2.4M YTD).pension = 22,000 + 100 = 22,100", 22_100, monthlyCross.pension);
check("cross(200k @ 2.4M YTD).medical = 5,100", 5_100, monthlyCross.medical);
check("cross(200k @ 2.4M YTD).social = 2,900 + 15,000 = 17,900", 17_900, monthlyCross.social);

// Math.round per ст. 52 (whole-ruble rounding)
const monthlyFractional = pensionEmployerMonthly({ monthlyPay: 100_001 });
// 100_001 × 22% = 22,000.22 → Math.round → 22,000
check("monthly(100,001).pension = 22,000 (Math.round per ст. 52)", 22_000, monthlyFractional.pension);

// ─── 4. pensionEmployeeMonthly (0% per post-2023 reform) ────────

check("employee(0) = 0", 0, pensionEmployeeMonthly({ monthlyPay: 0 }).pension);
check("employee(100k) = 0 (post-2023 reform)", 0, pensionEmployeeMonthly({ monthlyPay: 100_000 }).pension);
check("employee(2M) = 0 (post-2023 reform)", 0, pensionEmployeeMonthly({ monthlyPay: 2_000_000 }).pension);
check("employee.totalEmployee = 0 (always)", 0, pensionEmployeeMonthly({ monthlyPay: 1_000_000 }).totalEmployee);

// ─── 5. Sovereignty (offline-capable) ────────────────────────────

const src = fs.readFileSync(
  path.join(__dirname, "..", "..", "..", "src", "pension_ru.js"),
  "utf8"
);
const hasNetwork = /\brequire\s*\(\s*['"](http|https|net|fetch)['"]/i.test(src);
if (hasNetwork) {
  console.error(`✗ pension_ru.js has forbidden network require`);
  failed = true;
} else {
  console.log("✓ pension_ru.js has no network require (sovereign/offline-capable)");
}

const hasFs = /\brequire\s*\(\s*['"]fs['"]/i.test(src);
if (hasFs) {
  console.error(`✗ pension_ru.js has fs require (should be pure)`);
  failed = true;
} else {
  console.log("✓ pension_ru.js has no fs require (pure functions only)");
}

// ─── Result ────────────────────────────────────────────────────────

if (failed) {
  console.log("\n✗ pension-ru-ceiling-crossing contract violations detected.");
  process.exit(1);
} else {
  console.log("\n✓ All pension-ru-ceiling-crossing contract checks pass.");
  process.exit(0);
}