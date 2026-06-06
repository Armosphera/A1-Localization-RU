"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateInn, isValidInn, isValidKpp, isValidOgrn, isValidOgrnip, isValidSnils } = require("../src/inn");

test("ИНН: valid 10-digit legal entity (Сбербанк 7707083893)", () => {
  assert.equal(isValidInn("7707083893"), true);
  const r = validateInn("7707083893");
  assert.equal(r.ok, true);
  assert.equal(r.kind, "legal");
  assert.equal(r.normalized, "7707083893");
});

test("ИНН: valid 12-digit individual (500100732259)", () => {
  assert.equal(isValidInn("500100732259"), true);
  assert.equal(validateInn("500100732259").kind, "individual");
});

test("ИНН: rejects bad checksum, wrong length, non-digits, empty", () => {
  assert.equal(isValidInn("7707083894"), false); // last digit wrong
  assert.equal(isValidInn("500100732258"), false);
  assert.equal(isValidInn("123456789"), false); // 9 digits
  assert.equal(isValidInn("abcdefghij"), false);
  assert.equal(validateInn("").ok, false);
  assert.equal(validateInn("7707083894").error, "неверная контрольная сумма ИНН");
  assert.equal(validateInn("123").error, "ИНН должен содержать 10 или 12 цифр");
});

test("КПП: 9-char structure", () => {
  assert.equal(isValidKpp("770701001"), true);
  assert.equal(isValidKpp("7707AB001"), true); // reason code may be A–Z
  assert.equal(isValidKpp("77070100"), false); // 8 chars
  assert.equal(isValidKpp("77070100X"), false); // serial must be digits
});

test("ОГРН: valid 13-digit (Сбербанк 1027700132195)", () => {
  assert.equal(isValidOgrn("1027700132195"), true);
  assert.equal(isValidOgrn("1027700132194"), false); // bad control
  assert.equal(isValidOgrn("102770013219"), false); // 12 digits
});

test("ОГРНИП: valid 15-digit (304500116000157)", () => {
  assert.equal(isValidOgrnip("304500116000157"), true);
  assert.equal(isValidOgrnip("304500116000156"), false); // bad control
  assert.equal(isValidOgrnip("30450011600015"), false); // 14 digits
});

test("СНИЛС: valid checksum (112-233-445 95), separators tolerated", () => {
  assert.equal(isValidSnils("11223344595"), true);
  assert.equal(isValidSnils("112-233-445 95"), true);
  assert.equal(isValidSnils("11223344594"), false); // bad check
  assert.equal(isValidSnils("1122334459"), false); // 10 digits
});
