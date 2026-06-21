"use strict";

/**
 * pension_ru.js — Russian Federation funded pension contribution engine
 *
 * Pure functions for calculating pension, medical, and social insurance
 * contributions (страховые взносы) per the unified tariff introduced by
 * Federal Law 425-ФЗ от 28.11.2025 (effective 2026-01-01).
 *
 * PRIMARY SOURCES:
 *   - НК РФ ст. 425-430 (unified social insurance tariff)
 *   - ФЗ № 167-ФЗ "Об обязательном пенсионном страховании в РФ"
 *   - ФЗ № 400-ФЗ "О страховых пенсиях"
 *   - ФЗ № 425-ФЗ от 28.11.2025 (rate reform effective 2026-01-01)
 *
 * SPLIT WITHIN UNIFIED 30% TARIFF:
 *   - Pension:   22% (employer)  + 0% (employee, since 2023 reform)
 *   - Medical:   5.1% (employer)
 *   - Social:    2.9% (employer)
 *   = 30% within annual base (up to ceiling)
 *
 * ABOVE CEILING (15.1%):
 *   - Pension:   0.1% (employer)  + 0% (employee)
 *   - Medical:   0%   (since 2023 reform)
 *   - Social:    15%  (employer)
 *   = 15.1% above ceiling
 *
 * The 2026 ceiling per ФЗ № 425-ФЗ: 2_500_000 RUB/year.
 * (Was 1_917_000 in 2024; updated for 2026 reform.)
 *
 * NOTE: This module handles ONLY the contribution rates and calculations.
 * It does NOT compute the actual pension benefit (which depends on
 * individual contribution history and life expectancy tables).
 * For pension benefits, see ФЗ № 400-ФЗ, ст. 15-17.
 */

// ─── 2026 constants ─────────────────────────────────────────────────

const PENSION_2026 = Object.freeze({
  // Within annual ceiling (up to 2_500_000 RUB)
  EMPLOYER_RATE_PENSION: 22, // %
  EMPLOYER_RATE_MEDICAL: 5.1, // %
  EMPLOYER_RATE_SOCIAL: 2.9, // %
  EMPLOYER_TOTAL_WITHIN_CEILING: 30, // % (= 22 + 5.1 + 2.9)

  // Above annual ceiling
  EMPLOYER_RATE_ABOVE_CEILING_PENSION: 0.1, // %
  EMPLOYER_RATE_ABOVE_CEILING_MEDICAL: 0, // %
  EMPLOYER_RATE_ABOVE_CEILING_SOCIAL: 15, // %
  EMPLOYER_TOTAL_ABOVE_CEILING: 15.1, // % (= 0.1 + 0 + 15)

  // Employee (zero since 2023 reform, per ФЗ № 306-ФЗ от 24.07.2023)
  EMPLOYEE_RATE_PENSION: 0, // %
  EMPLOYEE_RATE_MEDICAL: 0, // %
  EMPLOYEE_RATE_SOCIAL: 0, // %
  EMPLOYEE_TOTAL: 0, // %

  // Annual ceiling (per ФЗ № 425-ФЗ effective 2026-01-01)
  DEFAULT_ANNUAL_CEILING_RUB: 2_500_000,
});

/**
 * Validate inputs to pension functions. Throws TypeError on invalid input.
 */
function validateInputs(opts, required) {
  if (!opts || typeof opts !== "object") {
    throw new TypeError("pension_ru: opts must be an object");
  }
  for (const key of required) {
    if (opts[key] === undefined || opts[key] === null) {
      throw new TypeError(`pension_ru: required option '${key}' missing`);
    }
    if (typeof opts[key] !== "number") {
      throw new TypeError(
        `pension_ru: option '${key}' must be number, got ${typeof opts[key]}`
      );
    }
    if (opts[key] < 0) {
      throw new RangeError(
        `pension_ru: option '${key}' must be >= 0, got ${opts[key]}`
      );
    }
  }
  // Validate ceilingAnnual if present (must be > 0)
  if (opts.ceilingAnnual !== undefined && opts.ceilingAnnual !== null) {
    if (typeof opts.ceilingAnnual !== "number") {
      throw new TypeError(
        `pension_ru: ceilingAnnual must be number, got ${typeof opts.ceilingAnnual}`
      );
    }
    if (opts.ceilingAnnual <= 0) {
      throw new RangeError(
        `pension_ru: ceilingAnnual must be > 0, got ${opts.ceilingAnnual}`
      );
    }
  }
}

/**
 * Sum monthly pays to annual base.
 * Per НК РФ ст. 421: pension base = total compensation in calendar year.
 *
 * @param {object} opts
 * @param {number[]} opts.monthlyPays - 12 monthly pays (or N if mid-year start)
 * @returns {number} - annual pension base in rubles
 */
function pensionBaseAnnual(opts) {
  if (!opts || !Array.isArray(opts.monthlyPays)) {
    throw new TypeError("pension_ru: monthlyPays must be an array of numbers");
  }
  if (opts.monthlyPays.length === 0) return 0;
  for (let i = 0; i < opts.monthlyPays.length; i++) {
    if (typeof opts.monthlyPays[i] !== "number" || opts.monthlyPays[i] < 0) {
      throw new RangeError(
        `pension_ru: monthlyPays[${i}] must be non-negative number`
      );
    }
  }
  return opts.monthlyPays.reduce((sum, m) => sum + m, 0);
}

/**
 * Split annual pension base into within-ceiling + above-ceiling portions,
 * applying the 2026 rate structure.
 *
 * @param {object} opts
 * @param {number} opts.annualBase - total compensation in calendar year
 * @param {number} [opts.ceiling=2_500_000] - annual ceiling in rubles
 * @returns {object} - { pension, medical, social, aboveCeiling, withinCeilingAmount, aboveCeilingAmount }
 */
function pensionSplitFor2026(opts) {
  validateInputs(opts, ["annualBase"]);
  const ceiling = opts.ceiling || PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB;

  if (opts.annualBase <= ceiling) {
    // All within ceiling: 30% total
    // Math.round per НК РФ ст. 52 (whole-ruble rounding)
    return {
      pension: Math.round((opts.annualBase * PENSION_2026.EMPLOYER_RATE_PENSION) / 100),
      medical: Math.round((opts.annualBase * PENSION_2026.EMPLOYER_RATE_MEDICAL) / 100),
      social: Math.round((opts.annualBase * PENSION_2026.EMPLOYER_RATE_SOCIAL) / 100),
      aboveCeiling: false,
      withinCeilingAmount: opts.annualBase,
      aboveCeilingAmount: 0,
    };
  } else {
    // Split: within ceiling (30%) + above ceiling (15.1%)
    const within = ceiling;
    const above = opts.annualBase - ceiling;
    return {
      pension: Math.round(
        (within * PENSION_2026.EMPLOYER_RATE_PENSION) / 100 +
        (above * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION) / 100
      ),
      medical: Math.round(
        (within * PENSION_2026.EMPLOYER_RATE_MEDICAL) / 100 +
        (above * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL) / 100
      ),
      social: Math.round(
        (within * PENSION_2026.EMPLOYER_RATE_SOCIAL) / 100 +
        (above * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL) / 100
      ),
      aboveCeiling: true,
      withinCeilingAmount: within,
      aboveCeilingAmount: above,
    };
  }
}

/**
 * Compute employer's monthly pension contribution.
 * Handles cross-ceiling correctly: prorates within vs above based on
 * year-to-date pension base.
 *
 * @param {object} opts
 * @param {number} opts.monthlyPay - this month's gross pay
 * @param {number} [opts.ceilingAnnual=2_500_000] - annual ceiling
 * @param {number} [opts.yearToDatePensionBase=0] - pension base accrued YTD
 * @returns {object} - { pension, medical, social, totalEmployer, withinCeiling, aboveCeiling }
 */
function pensionEmployerMonthly(opts) {
  validateInputs(opts, ["monthlyPay"]);
  const ceiling = opts.ceilingAnnual || PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB;
  const ytd = opts.yearToDatePensionBase || 0;

  // How much room is left within the ceiling?
  const remaining = Math.max(0, ceiling - ytd);
  // Split this month's pay into within-ceiling and above-ceiling portions
  const withinThisMonth = Math.min(opts.monthlyPay, remaining);
  const aboveThisMonth = opts.monthlyPay - withinThisMonth;

  // Round to whole rubles (НК РФ ст. 52 mandates whole-ruble rounding for
  // tax contributions). JS float arithmetic produces 5099.999999999999
  // instead of 5100, which would fail strict-equality tests.
  const pension = Math.round(
    (withinThisMonth * PENSION_2026.EMPLOYER_RATE_PENSION) / 100 +
    (aboveThisMonth * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION) / 100
  );
  const medical = Math.round(
    (withinThisMonth * PENSION_2026.EMPLOYER_RATE_MEDICAL) / 100 +
    (aboveThisMonth * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL) / 100
  );
  const social = Math.round(
    (withinThisMonth * PENSION_2026.EMPLOYER_RATE_SOCIAL) / 100 +
    (aboveThisMonth * PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL) / 100
  );

  return {
    pension,
    medical,
    social,
    totalEmployer: pension + medical + social,
    withinCeiling: withinThisMonth,
    aboveCeiling: aboveThisMonth,
  };
}

/**
 * Compute employee's monthly pension contribution.
 * Per ФЗ № 306-ФЗ от 24.07.2023: employee rate is 0% across the board.
 *
 * @param {object} opts
 * @param {number} opts.monthlyPay - this month's gross pay (informational)
 * @returns {object} - { pension, totalEmployee }
 */
function pensionEmployeeMonthly(opts) {
  validateInputs(opts, ["monthlyPay"]);
  return {
    pension: 0,
    totalEmployee: 0,
  };
}

module.exports = {
  PENSION_2026,
  pensionBaseAnnual,
  pensionSplitFor2026,
  pensionEmployerMonthly,
  pensionEmployeeMonthly,
};