"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SECTIONS,
  STANDARD_ACCOUNTS,
  accountByCode,
  accountsBySection,
  accountsByNature,
  sectionOf,
  normalBalance,
  isValidAccountCode,
} = require("../src/chartOfAccounts");

test("totals: 73 accounts (62 balance-sheet + 11 off-balance)", () => {
  // 94н verbatim: 62 synthetic balance-sheet accounts (counted from the order's
  // account list) + 11 забалансовые = 73. Data is the ground truth.
  assert.equal(STANDARD_ACCOUNTS.length, 73);
  const offBalance = STANDARD_ACCOUNTS.filter((a) => a.section === "offBalance");
  assert.equal(offBalance.length, 11);
  assert.equal(STANDARD_ACCOUNTS.length - offBalance.length, 62);
});

test("SECTIONS: 9 sections (8 balance-sheet + off-balance) with ranges", () => {
  assert.equal(SECTIONS.length, 9);
  const ids = SECTIONS.map((s) => s.id);
  assert.deepEqual(ids, ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "offBalance"]);
  for (const s of SECTIONS) {
    assert.equal(typeof s.ru, "string");
    assert.equal(typeof s.en, "string");
    assert.equal(Array.isArray(s.range), true);
    assert.equal(s.range.length, 2);
    assert.equal(s.range[0] <= s.range[1], true);
  }
});

test("accountByCode: lookup by string code", () => {
  assert.equal(accountByCode("51").ru, "Расчётные счета");
  assert.equal(accountByCode("51").nature, "active");
  assert.equal(accountByCode("51").section, "V");
  assert.equal(accountByCode("01").ru, "Основные средства");
  assert.equal(accountByCode("001").ru, "Арендованные основные средства");
  assert.equal(accountByCode("001").section, "offBalance");
});

test("accountByCode: invalid / null / garbage returns null", () => {
  assert.equal(accountByCode("99999"), null);
  assert.equal(accountByCode("zz"), null);
  assert.equal(accountByCode(""), null);
  assert.equal(accountByCode(null), null);
  assert.equal(accountByCode(undefined), null);
  assert.equal(accountByCode({}), null);
  assert.equal(accountByCode("12"), null); // not a real account (gap in range)
});

test("accountByCode: tolerates numeric and whitespace input", () => {
  assert.equal(accountByCode(51).code, "51");
  assert.equal(accountByCode(" 51 ").code, "51");
});

test("accountsBySection: returns all accounts in a section", () => {
  const sectionV = accountsBySection("V");
  assert.equal(sectionV.length, 7); // 50,51,52,55,57,58,59
  assert.equal(sectionV.every((a) => a.section === "V"), true);
  assert.equal(accountsBySection("offBalance").length, 11);
  assert.equal(accountsBySection("I").length, 8);
});

test("accountsBySection: invalid / null returns []", () => {
  assert.deepEqual(accountsBySection("XYZ"), []);
  assert.deepEqual(accountsBySection(""), []);
  assert.deepEqual(accountsBySection(null), []);
  assert.deepEqual(accountsBySection(undefined), []);
});

test("accountsByNature: filter by character of account", () => {
  const active = accountsByNature("active");
  const passive = accountsByNature("passive");
  const ap = accountsByNature("active-passive");
  assert.equal(active.every((a) => a.nature === "active"), true);
  assert.equal(passive.every((a) => a.nature === "passive"), true);
  assert.equal(ap.every((a) => a.nature === "active-passive"), true);
  // counts must sum to total
  assert.equal(active.length + passive.length + ap.length, 73);
  // spot: 02 passive, 16 active-passive
  assert.equal(passive.some((a) => a.code === "02"), true);
  assert.equal(ap.some((a) => a.code === "16"), true);
});

test("accountsByNature: invalid / null returns []", () => {
  assert.deepEqual(accountsByNature("debit"), []);
  assert.deepEqual(accountsByNature(""), []);
  assert.deepEqual(accountsByNature(null), []);
  assert.deepEqual(accountsByNature(undefined), []);
});

test("sectionOf: returns SECTION object by numeric range", () => {
  assert.equal(sectionOf("70").id, "VI");
  assert.equal(sectionOf("01").id, "I");
  assert.equal(sectionOf("10").id, "II");
  assert.equal(sectionOf("20").id, "III");
  assert.equal(sectionOf("40").id, "IV");
  assert.equal(sectionOf("50").id, "V");
  assert.equal(sectionOf("80").id, "VII");
  assert.equal(sectionOf("90").id, "VIII");
});

test("sectionOf: off-balance accounts 001-011 map to offBalance", () => {
  assert.equal(sectionOf("001").id, "offBalance");
  assert.equal(sectionOf("011").id, "offBalance");
  assert.equal(sectionOf("006").id, "offBalance");
});

test("sectionOf: boundary edges of each range", () => {
  // Section I 01-09, II 10-19, III 20-39, IV 40-49, V 50-59, VI 60-79, VII 80-89, VIII 90-99
  assert.equal(sectionOf("09").id, "I");
  assert.equal(sectionOf("19").id, "II");
  assert.equal(sectionOf("39").id, "III");
  assert.equal(sectionOf("49").id, "IV");
  assert.equal(sectionOf("59").id, "V");
  assert.equal(sectionOf("79").id, "VI");
  assert.equal(sectionOf("89").id, "VII");
  assert.equal(sectionOf("99").id, "VIII");
});

test("sectionOf: invalid / null / out-of-range returns null", () => {
  assert.equal(sectionOf("100"), null); // synthetic 100 out of 01-99
  assert.equal(sectionOf("000"), null); // below off-balance range
  assert.equal(sectionOf("012"), null); // above off-balance range
  assert.equal(sectionOf("abc"), null);
  assert.equal(sectionOf(""), null);
  assert.equal(sectionOf(null), null);
  assert.equal(sectionOf(undefined), null);
  assert.equal(sectionOf({}), null);
});

test("normalBalance: derived from nature", () => {
  assert.equal(normalBalance("02"), "credit"); // passive
  assert.equal(normalBalance("51"), "debit"); // active
  assert.equal(normalBalance("84"), null); // active-passive
  assert.equal(normalBalance("01"), "debit");
  assert.equal(normalBalance("80"), "credit");
  assert.equal(normalBalance("60"), null); // active-passive
  assert.equal(normalBalance("001"), "debit"); // off-balance active
});

test("normalBalance: invalid / null returns null", () => {
  assert.equal(normalBalance("99999"), null);
  assert.equal(normalBalance(""), null);
  assert.equal(normalBalance(null), null);
  assert.equal(normalBalance(undefined), null);
});

test("isValidAccountCode: true only for real chart codes", () => {
  assert.equal(isValidAccountCode("51"), true);
  assert.equal(isValidAccountCode("001"), true);
  assert.equal(isValidAccountCode(51), true);
  assert.equal(isValidAccountCode(" 51 "), true);
  assert.equal(isValidAccountCode("12"), false); // gap
  assert.equal(isValidAccountCode("99999"), false);
  assert.equal(isValidAccountCode("abc"), false);
  assert.equal(isValidAccountCode(""), false);
  assert.equal(isValidAccountCode(null), false);
  assert.equal(isValidAccountCode(undefined), false);
  assert.equal(isValidAccountCode({}), false);
});

test("data integrity: every account section id exists in SECTIONS", () => {
  const sectionIds = new Set(SECTIONS.map((s) => s.id));
  for (const a of STANDARD_ACCOUNTS) {
    assert.equal(sectionIds.has(a.section), true, `unknown section ${a.section} for ${a.code}`);
    assert.equal(["active", "passive", "active-passive"].includes(a.nature), true);
    assert.equal(typeof a.code, "string");
    assert.equal(typeof a.ru, "string");
  }
});

test("data integrity: codes are unique", () => {
  const codes = STANDARD_ACCOUNTS.map((a) => a.code);
  assert.equal(new Set(codes).size, codes.length);
});

test("data integrity: sectionOf agrees with each account's stored section", () => {
  for (const a of STANDARD_ACCOUNTS) {
    const sec = sectionOf(a.code);
    assert.notEqual(sec, null, `sectionOf returned null for ${a.code}`);
    assert.equal(sec.id, a.section, `section mismatch for ${a.code}`);
  }
});

test("immutability: SECTIONS is frozen (array and elements)", () => {
  assert.equal(Object.isFrozen(SECTIONS), true);
  assert.equal(Object.isFrozen(SECTIONS[0]), true);
  assert.throws(() => {
    SECTIONS.push({ id: "X" });
  }, TypeError);
  // mutation attempt is silently ignored or throws — value must not change
  const before = SECTIONS[0].ru;
  try {
    SECTIONS[0].ru = "hacked";
  } catch (_e) {
    /* strict mode throws — acceptable */
  }
  assert.equal(SECTIONS[0].ru, before);
});

test("immutability: STANDARD_ACCOUNTS is frozen (array and elements)", () => {
  assert.equal(Object.isFrozen(STANDARD_ACCOUNTS), true);
  assert.equal(Object.isFrozen(STANDARD_ACCOUNTS[0]), true);
  assert.throws(() => {
    STANDARD_ACCOUNTS.push({ code: "999" });
  }, TypeError);
  const acct = accountByCode("51");
  const before = acct.nature;
  try {
    acct.nature = "passive";
  } catch (_e) {
    /* strict mode throws — acceptable */
  }
  assert.equal(accountByCode("51").nature, before);
});
