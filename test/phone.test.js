"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COUNTRY_CODE,
  NSN_LENGTH,
  normalizeNsn,
  isValidRussianPhone,
  e164,
  formatPhone,
} = require("../src/phone");

test("constants", () => {
  assert.equal(COUNTRY_CODE, "7");
  assert.equal(NSN_LENGTH, 10);
});

test("normalizeNsn: +7 with spaces and dashes", () => {
  assert.equal(normalizeNsn("+7 999 123-45-67"), "9991234567");
});

test("normalizeNsn: domestic trunk prefix 8 with punctuation", () => {
  assert.equal(normalizeNsn("8 (999) 123-45-67"), "9991234567");
});

test("normalizeNsn: 11 digits starting with 8 → drop 8", () => {
  assert.equal(normalizeNsn("89991234567"), "9991234567");
});

test("normalizeNsn: 11 digits starting with 7 → drop 7", () => {
  assert.equal(normalizeNsn("79991234567"), "9991234567");
});

test("normalizeNsn: bare 10-digit NSN kept", () => {
  assert.equal(normalizeNsn("9991234567"), "9991234567");
});

test("normalizeNsn: international Moscow landline 495", () => {
  assert.equal(normalizeNsn("+74951234567"), "4951234567");
});

test("normalizeNsn: bare with arbitrary punctuation/spaces", () => {
  assert.equal(normalizeNsn(" +7 (495) 123.45.67 "), "4951234567");
});

test("normalizeNsn: leading digit boundaries 3 and 9 accepted", () => {
  assert.equal(normalizeNsn("3001234567"), "3001234567");
  assert.equal(normalizeNsn("9001234567"), "9001234567");
});

test("normalizeNsn: rejects leading 0/1/2", () => {
  assert.equal(normalizeNsn("0991234567"), "");
  assert.equal(normalizeNsn("1991234567"), "");
  assert.equal(normalizeNsn("2991234567"), "");
});

test("normalizeNsn: rejects too short", () => {
  assert.equal(normalizeNsn("999123456"), "");
  assert.equal(normalizeNsn("+7 999 12"), "");
});

test("normalizeNsn: rejects too long", () => {
  assert.equal(normalizeNsn("999123456789"), "");
  assert.equal(normalizeNsn("899912345678"), "");
});

test("normalizeNsn: 11 digits starting with 8 but bad area leading digit", () => {
  // after dropping 8 → "0991234567", leading 0 invalid
  assert.equal(normalizeNsn("80991234567"), "");
});

test("normalizeNsn: null/undefined/empty → ''", () => {
  assert.equal(normalizeNsn(null), "");
  assert.equal(normalizeNsn(undefined), "");
  assert.equal(normalizeNsn(""), "");
  assert.equal(normalizeNsn("   "), "");
  assert.equal(normalizeNsn("abc"), "");
});

test("isValidRussianPhone: happy paths", () => {
  assert.equal(isValidRussianPhone("+7 999 123-45-67"), true);
  assert.equal(isValidRussianPhone("8 (999) 123-45-67"), true);
  assert.equal(isValidRussianPhone("89991234567"), true);
  assert.equal(isValidRussianPhone("9991234567"), true);
  assert.equal(isValidRussianPhone("+74951234567"), true);
});

test("isValidRussianPhone: invalid", () => {
  assert.equal(isValidRussianPhone("0991234567"), false);
  assert.equal(isValidRussianPhone("999123456"), false);
  assert.equal(isValidRussianPhone("999123456789"), false);
  assert.equal(isValidRussianPhone(null), false);
  assert.equal(isValidRussianPhone(""), false);
});

test("e164: +7 + NSN", () => {
  assert.equal(e164("8 (999) 123-45-67"), "+79991234567");
  assert.equal(e164("+7 999 123-45-67"), "+79991234567");
  assert.equal(e164("+74951234567"), "+74951234567");
});

test("e164: null on invalid", () => {
  assert.equal(e164("0991234567"), null);
  assert.equal(e164("999123456"), null);
  assert.equal(e164(null), null);
  assert.equal(e164(""), null);
});

test("formatPhone: +7 (XXX) XXX-XX-XX grouping", () => {
  assert.equal(formatPhone("89991234567"), "+7 (999) 123-45-67");
  assert.equal(formatPhone("+7 999 123-45-67"), "+7 (999) 123-45-67");
  assert.equal(formatPhone("9991234567"), "+7 (999) 123-45-67");
});

test("formatPhone: Moscow landline reads +7 (495) ...", () => {
  assert.equal(formatPhone("+74951234567"), "+7 (495) 123-45-67");
});

test("formatPhone: null on invalid", () => {
  assert.equal(formatPhone("0991234567"), null);
  assert.equal(formatPhone("999123456"), null);
  assert.equal(formatPhone(null), null);
  assert.equal(formatPhone(""), null);
});

test("exported constants are immutable primitives (no shared mutable state)", () => {
  // COUNTRY_CODE / NSN_LENGTH are primitives — immutable by nature. Mutating a
  // local copy must never bleed back into the module's view of them.
  let cc = COUNTRY_CODE;
  let len = NSN_LENGTH;
  cc = "1";
  len = 99;
  const fresh = require("../src/phone");
  assert.equal(fresh.COUNTRY_CODE, "7");
  assert.equal(fresh.NSN_LENGTH, 10);
  // Pure functions hold no internal state across calls.
  assert.equal(normalizeNsn("89991234567"), "9991234567");
  assert.equal(normalizeNsn("89991234567"), "9991234567");
});
