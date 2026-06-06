"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ratesFor, vatFromNet, vatFromGross, netFromGross, isValidVatRate, VAT_RATES } = require("../src/vat");

test("2026 standard rate is 22% (post-reform)", () => {
  assert.equal(ratesFor(2026).standard, 22);
  assert.equal(ratesFor().standard, 22); // default = current year
  assert.equal(VAT_RATES[2025].standard, 20); // pre-reform retained for back-dated docs
});

test("vatFromNet: adds VAT on a net amount", () => {
  assert.equal(vatFromNet(1000, 22), 220);
  assert.equal(vatFromNet(1000, 10), 100);
  assert.equal(vatFromNet(1000, 0), 0);
});

test("vatFromGross: extracts VAT via settlement rate r/(100+r)", () => {
  assert.equal(vatFromGross(1220, 22), 220); // 1220 * 22/122
  assert.equal(vatFromGross(1100, 10), 100); // 1100 * 10/110
  assert.equal(vatFromGross(1000, 0), 0);
});

test("netFromGross: gross minus contained VAT", () => {
  assert.equal(netFromGross(1220, 22), 1000);
  assert.equal(netFromGross(1100, 10), 1000);
});

test("isValidVatRate: general vs УСН", () => {
  assert.equal(isValidVatRate(22), true);
  assert.equal(isValidVatRate(20), false); // not a 2026 general rate
  assert.equal(isValidVatRate(5), false); // 5% only on УСН
  assert.equal(isValidVatRate(5, { regime: "usn" }), true);
  assert.equal(isValidVatRate(7, { regime: "usn" }), true);
});
