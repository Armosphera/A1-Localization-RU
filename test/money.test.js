"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { roundRub, roundToWholeRubles, formatRub, parseRub, KOPECKS_PER_RUBLE } = require("../src/money");

test("kopeck constant", () => {
  assert.equal(KOPECKS_PER_RUBLE, 100);
});

test("roundRub: rounds to kopecks (2 decimals)", () => {
  assert.equal(roundRub(1234.567), 1234.57);
  assert.equal(roundRub(1234.564), 1234.56);
  assert.equal(roundRub(1234.5), 1234.5);
  assert.equal(roundRub(100), 100);
  assert.equal(roundRub("50.1"), 50.1);
  assert.equal(roundRub(NaN), 0);
});

test("roundToWholeRubles: tax-base rounding (НК РФ ст. 52)", () => {
  assert.equal(roundToWholeRubles(1234.49), 1234);
  assert.equal(roundToWholeRubles(1234.5), 1235);
  assert.equal(roundToWholeRubles(0.4), 0);
});

test("formatRub: Russian currency format", () => {
  assert.equal(formatRub(1234.5), "1 234,50 ₽");
  assert.equal(formatRub(1234567.891), "1 234 567,89 ₽");
  assert.equal(formatRub(0), "0,00 ₽");
  assert.equal(formatRub(-50), "-50,00 ₽");
  assert.equal(formatRub(1234.5, { symbol: false }), "1 234,50");
});

test("parseRub: locale-tolerant strict parse", () => {
  assert.deepEqual(parseRub("1 234,56 ₽"), { ok: true, amount: 1234.56, error: null });
  assert.deepEqual(parseRub("1234.56"), { ok: true, amount: 1234.56, error: null });
  assert.deepEqual(parseRub("1 234,56 ₽".replace(/ /g, " ")), { ok: true, amount: 1234.56, error: null });
  assert.equal(parseRub("").ok, false);
  assert.equal(parseRub("   ").ok, false);
  assert.equal(parseRub("abc").ok, false);
  assert.equal(parseRub(null).ok, false);
});
