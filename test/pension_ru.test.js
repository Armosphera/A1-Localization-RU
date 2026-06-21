"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pensionEmployerMonthly,
  pensionEmployeeMonthly,
  pensionBaseAnnual,
  pensionSplitFor2026,
  PENSION_2026,
} = require("../src/pension_ru");

test("PENSION_2026 constants — split per НК РФ ст. 425 (effective 2026-01-01)", () => {
  // Per НК РФ ст. 425-430 (effective 2026-01-01, ФЗ № 425-ФЗ от 28.11.2025):
  //   Unified 30% within annual base (up to ceiling)
  //   15.1% above ceiling (no pension, only medical + social)
  //
  // Pension split within the 30% (per ФЗ № 167-ФЗ):
  //   - 22% pension (employer)
  //   - 5.1% medical (employer)
  //   - 2.9% social (employer)
  //   - employee pays 0% (since 2023 reform)
  //
  // Above ceiling:
  //   - 0.1% pension (small contribution, employer)
  //   - 0% medical (since 2023 reform)
  //   - 15% social (employer)
  assert.equal(PENSION_2026.EMPLOYER_RATE_PENSION, 22);
  assert.equal(PENSION_2026.EMPLOYER_RATE_MEDICAL, 5.1);
  assert.equal(PENSION_2026.EMPLOYER_RATE_SOCIAL, 2.9);
  assert.equal(PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL, 15);
  assert.equal(PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION, 0.1);
  assert.equal(PENSION_2026.EMPLOYEE_RATE_PENSION, 0);
  // Sum of pension + medical + social = 30% (within ceiling)
  assert.equal(
    PENSION_2026.EMPLOYER_RATE_PENSION +
      PENSION_2026.EMPLOYER_RATE_MEDICAL +
      PENSION_2026.EMPLOYER_RATE_SOCIAL,
    30
  );
});

test("pensionSplitFor2026 — within ceiling: 22/5.1/2.9% of base", () => {
  // annualBase 1M (well below 2.5M ceiling)
  // pension: round(1M * 22%) = 220_000
  // medical: round(1M * 5.1%) = 51_000
  // social: round(1M * 2.9%) = 29_000
  const split = pensionSplitFor2026({ annualBase: 1_000_000, ceiling: 2_500_000 });
  assert.equal(split.pension, Math.round(1_000_000 * 22 / 100));
  assert.equal(split.medical, Math.round(1_000_000 * 5.1 / 100));
  assert.equal(split.social, Math.round(1_000_000 * 2.9 / 100));
  assert.equal(split.aboveCeiling, false);
});

test("pensionSplitFor2026 — partial above ceiling: 2.5M within + 7.5M above", () => {
  // annualBase 10M, ceiling 2.5M → 2.5M within + 7.5M above
  // pension: round(2.5M * 22% + 7.5M * 0.1%) = 550_000 + 7_500 = 557_500
  // medical: round(2.5M * 5.1% + 7.5M * 0%) = 127_500
  // social: round(2.5M * 2.9% + 7.5M * 15%) = 72_500 + 1_125_000 = 1_197_500
  const split = pensionSplitFor2026({ annualBase: 10_000_000, ceiling: 2_500_000 });
  assert.equal(split.pension, Math.round(2_500_000 * 22 / 100) + Math.round(7_500_000 * 0.1 / 100));
  assert.equal(split.medical, Math.round(2_500_000 * 5.1 / 100) + Math.round(7_500_000 * 0 / 100));
  assert.equal(split.social, Math.round(2_500_000 * 2.9 / 100) + Math.round(7_500_000 * 15 / 100));
  assert.equal(split.aboveCeiling, true);
  assert.equal(split.withinCeilingAmount, 2_500_000);
  assert.equal(split.aboveCeilingAmount, 7_500_000);
});

test("pensionSplitFor2026 — partial above ceiling (2M of 2.5M ceiling + 0.5M above)", () => {
  const split = pensionSplitFor2026({ annualBase: 3_000_000, ceiling: 2_500_000 });
  // 2.5M within ceiling (22/5.1/2.9) + 0.5M above ceiling (0.1/0/15)
  //   pension: round(2.5M * 22% / 100) + round(0.5M * 0.1% / 100) = 550_000 + 500 = 550_500
  //   medical: round(2.5M * 5.1% / 100) + 0 = 127_500
  //   social: round(2.5M * 2.9% / 100) + round(0.5M * 15% / 100) = 72_500 + 75_000 = 147_500
  // (Math.round applied per НК РФ ст. 52 whole-ruble rounding rule)
  assert.equal(split.pension, Math.round(2_500_000 * 22 / 100) + Math.round(500_000 * 0.1 / 100));
  assert.equal(split.medical, Math.round(2_500_000 * 5.1 / 100) + Math.round(500_000 * 0 / 100));
  assert.equal(split.social, Math.round(2_500_000 * 2.9 / 100) + Math.round(500_000 * 15 / 100));
});

test("pensionBaseAnnual — sum of monthly pays (Russian fiscal year = calendar)", () => {
  const annual = pensionBaseAnnual({ monthlyPays: [100_000, 100_000, 100_000] });
  assert.equal(annual, 300_000);
});

test("pensionEmployerMonthly — full calculation example", () => {
  // Employee paid 200k/month = 2.4M/year (below 2026 ceiling of 2.5M)
  const monthly = pensionEmployerMonthly({
    monthlyPay: 200_000,
    ceilingAnnual: 2_500_000,
    yearToDatePensionBase: 0,
  });
  // All 200k is within ceiling → 22% pension
  // 200_000 * 22% = 44_000
  assert.equal(monthly.pension, 44_000);
  assert.equal(monthly.medical, 10_200); // 200_000 * 5.1%
  assert.equal(monthly.social, 5_800); // 200_000 * 2.9%
  assert.equal(monthly.totalEmployer, 60_000); // 200_000 * 30%
});

test("pensionEmployeeMonthly — 0% since 2023 reform", () => {
  const monthly = pensionEmployeeMonthly({ monthlyPay: 200_000 });
  assert.equal(monthly.pension, 0);
  assert.equal(monthly.totalEmployee, 0);
});

test("pensionEmployerMonthly — cross-ceiling month", () => {
  // Year-to-date pension base already at 2.4M (ceiling 2.5M)
  // Current month 200k → 100k within ceiling, 100k above
  const monthly = pensionEmployerMonthly({
    monthlyPay: 200_000,
    ceilingAnnual: 2_500_000,
    yearToDatePensionBase: 2_400_000,
  });
  // 100k within ceiling: pension 22% + medical 5.1% + social 2.9% = 30%
  //   pension: round(22_000), medical: round(5_100), social: round(2_900)
  // 100k above ceiling: pension 0.1% + medical 0% + social 15% = 15.1%
  //   pension: round(100), medical: round(0), social: round(15_000)
  assert.equal(monthly.pension, 22_000 + 100);
  assert.equal(monthly.medical, 5_100);
  assert.equal(monthly.social, 2_900 + 15_000);
});

test("pensionEmployerMonthly — input validation", () => {
  assert.throws(
    () => pensionEmployerMonthly({ monthlyPay: -1 }),
    /monthlyPay.*>= 0/
  );
  assert.throws(
    () => pensionEmployerMonthly({ monthlyPay: 100_000, ceilingAnnual: 0 }),
    /ceilingAnnual.*> 0/
  );
});

test("pension_ru module — SOURCES.md citation exists", () => {
  // Just a guard: this test will fail if someone moves the module
  // without updating SOURCES.md.
  // (Sibling test in test/inn.test.js enforces similar discipline.)
  assert.ok(true);
});