"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ndflOnAnnualBase,
  ndflMonthly,
  insuranceUnified,
  insuranceSmeMonthly,
  childDeductionMonthly,
  computeMonthlyPayroll,
} = require("../src/payroll");

test("НДФЛ: marginal 5-band scale on cumulative annual base (2026)", () => {
  assert.equal(ndflOnAnnualBase(0), 0);
  assert.equal(ndflOnAnnualBase(2_400_000), 312_000); // 13% of 2.4M
  assert.equal(ndflOnAnnualBase(5_000_000), 702_000); // 312k + 15%·2.6M
  assert.equal(ndflOnAnnualBase(20_000_000), 3_402_000); // 702k + 18%·15M
  assert.equal(ndflOnAnnualBase(50_000_000), 9_402_000); // 3.402M + 20%·30M
  assert.equal(ndflOnAnnualBase(60_000_000), 11_602_000); // 9.402M + 22%·10M
});

test("НДФЛ: non-resident flat 30%, no deductions", () => {
  assert.equal(ndflOnAnnualBase(1_000_000, { resident: false }), 300_000);
});

test("НДФЛ monthly (cumulative): month within band 1, and a band-crossing month", () => {
  assert.equal(ndflMonthly({ ytdBaseBefore: 0, monthBase: 100_000 }), 13_000);
  // crossing the 2.4M edge: 50k taxed at 13% + 50k at 15% = 6 500 + 7 500
  assert.equal(ndflMonthly({ ytdBaseBefore: 2_350_000, monthBase: 100_000 }), 14_000);
});

test("страховые: unified 30% within ЕПВБ (2 979 000), 15.1% above", () => {
  assert.equal(insuranceUnified(2_979_000), 893_700);
  assert.equal(insuranceUnified(3_979_000), 1_044_700); // 893 700 + 15.1%·1M
});

test("страховые МСП: 30% up to 1.5×МРОТ (40 639,50), 15% above", () => {
  assert.equal(insuranceSmeMonthly(27_093), 8_127.9); // all within
  assert.equal(insuranceSmeMonthly(40_639.5), 12_191.85); // at the threshold
  // above the threshold: must be less than a flat 30% would charge
  assert.ok(insuranceSmeMonthly(100_000) < 100_000 * 0.30);
});

test("child standard deductions (ст. 218) with income cap", () => {
  assert.equal(childDeductionMonthly({ ytdIncome: 100_000, children: [{ order: 1 }, { order: 2 }] }), 4_200);
  assert.equal(childDeductionMonthly({ ytdIncome: 100_000, children: [{ order: 3, disabled: true }] }), 18_000); // 6000 + 12000
  assert.equal(childDeductionMonthly({ ytdIncome: 500_000, children: [{ order: 1 }] }), 0); // over 450k cap
});

test("computeMonthlyPayroll: month-1 ordinary resident", () => {
  const r = computeMonthlyPayroll({ monthGross: 100_000 });
  assert.equal(r.ndfl, 13_000);
  assert.equal(r.net, 87_000);
  assert.equal(r.employerInsurance, 30_000); // unified 30%
  assert.equal(r.employerCost, 130_000);
});

test("computeMonthlyPayroll: МСП employer uses the reduced monthly tariff", () => {
  const r = computeMonthlyPayroll({ monthGross: 100_000, sme: true });
  assert.equal(r.ndfl, 13_000); // НДФЛ unaffected
  assert.ok(r.employerInsurance < 30_000); // reduced vs the 30 000 unified
});
