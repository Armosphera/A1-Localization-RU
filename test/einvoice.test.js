"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  VAT_RATES_2026,
  xmlEscape,
  normalizeLine,
  eInvoiceTotals,
  buildEInvoiceXml,
  validateEInvoice,
} = require("../src/einvoice");

// --- Fixtures -------------------------------------------------------------
// Valid ИНН/КПП used across cases. ИНН checksums must pass src/inn.js validateInn:
//   seller legal entity ИНН "7707083893" (Сбербанк-style, 10-digit, valid checksum).
//   buyer legal entity ИНН "7728168971" (valid 10-digit checksum).
//   buyer ИП ИНН "500100732259" (valid 12-digit checksum).
const SELLER_INN = "7707083893";
const BUYER_INN = "7728168971";
const SELLER_KPP = "770701001";
const BUYER_KPP = "772801001";

function validInvoice() {
  return {
    number: "СФ-2026-0001",
    date: "2026-03-15",
    currency: "RUB",
    seller: { name: 'ООО "Ромашка"', inn: SELLER_INN, kpp: SELLER_KPP, address: "г. Москва, ул. Тверская, 1" },
    buyer: { name: 'АО "Василёк"', inn: BUYER_INN, kpp: BUYER_KPP, address: "г. Казань, ул. Баумана, 5" },
    lines: [
      { description: "Услуги консультационные", quantity: 2, netAmount: 1000, vatRate: 22 },
      { description: "Товар льготный (продукты)", quantity: 1, netAmount: 500, vatRate: 10 },
    ],
  };
}

// --- VAT_RATES_2026 -------------------------------------------------------
test("VAT_RATES_2026: allowed issued rates for 2026", () => {
  assert.deepEqual(VAT_RATES_2026, [0, 10, 22]);
});

test("VAT_RATES_2026: frozen — cannot be mutated", () => {
  assert.equal(Object.isFrozen(VAT_RATES_2026), true);
  assert.throws(() => {
    VAT_RATES_2026.push(20);
  }, TypeError);
  assert.throws(() => {
    VAT_RATES_2026[0] = 99;
  }, TypeError);
  assert.deepEqual(VAT_RATES_2026, [0, 10, 22]);
});

// --- xmlEscape ------------------------------------------------------------
test("xmlEscape: escapes the five XML metacharacters", () => {
  assert.equal(xmlEscape('<a href="x">b & c\'d</a>'), "&lt;a href=&quot;x&quot;&gt;b &amp; c&apos;d&lt;/a&gt;");
});

test("xmlEscape: null/undefined render as empty string", () => {
  assert.equal(xmlEscape(null), "");
  assert.equal(xmlEscape(undefined), "");
  assert.equal(xmlEscape(0), "0");
});

// --- normalizeLine --------------------------------------------------------
test("normalizeLine: kopeck precision (2 decimals), derives vat/total", () => {
  const l = normalizeLine({ description: "X", quantity: 2, netAmount: 1000, vatRate: 22 });
  assert.equal(l.net, 1000);
  assert.equal(l.rate, 22);
  assert.equal(l.vat, 220); // 1000 * 22 / 100
  assert.equal(l.total, 1220); // net + vat
  assert.equal(l.unitPrice, 500); // net / quantity = 1000 / 2
  assert.equal(l.quantity, 2);
  assert.equal(l.description, "X");
});

test("normalizeLine: keeps kopecks (NOT whole units)", () => {
  const l = normalizeLine({ description: "Y", quantity: 3, netAmount: 100, vatRate: 22 });
  assert.equal(l.net, 100);
  assert.equal(l.vat, 22); // 100 * 22 / 100
  assert.equal(l.total, 122);
  assert.equal(l.unitPrice, 33.33); // 100/3 = 33.333... → kopeck rounded
});

test("normalizeLine: explicit vatAmount/unitPrice/lineTotal override derivation", () => {
  const l = normalizeLine({
    description: "Z", quantity: 4, netAmount: 200, vatRate: 22,
    vatAmount: 44.5, unitPrice: 49.99, lineTotal: 244.5,
  });
  assert.equal(l.vat, 44.5);
  assert.equal(l.unitPrice, 49.99);
  assert.equal(l.total, 244.5);
});

test("normalizeLine: defaults — quantity 1, never NaN, rate 0", () => {
  const l = normalizeLine({ description: "D", netAmount: 99.99 });
  assert.equal(l.quantity, 1);
  assert.equal(l.rate, 0);
  assert.equal(l.vat, 0);
  assert.equal(l.unitPrice, 99.99);
  assert.equal(l.total, 99.99);
});

test("normalizeLine: bad quantity never emits NaN", () => {
  const l = normalizeLine({ description: "BadQty", quantity: "abc", netAmount: 100, vatRate: 10 });
  assert.equal(Number.isNaN(l.quantity), false);
  assert.equal(Number.isNaN(l.unitPrice), false);
  assert.equal(Number.isNaN(l.total), false);
});

test("normalizeLine: empty/null line yields a safe zeroed object", () => {
  const l = normalizeLine();
  assert.equal(l.description, "");
  assert.equal(l.quantity, 1);
  assert.equal(l.net, 0);
  assert.equal(l.vat, 0);
  assert.equal(l.total, 0);
});

// --- eInvoiceTotals -------------------------------------------------------
test("eInvoiceTotals: sums net/vat/total in kopecks", () => {
  const t = eInvoiceTotals(validInvoice().lines);
  // line1: net 1000, vat 220, total 1220 ; line2: net 500, vat 50, total 550
  assert.equal(t.net, 1500);
  assert.equal(t.vat, 270);
  assert.equal(t.total, 1770);
});

test("eInvoiceTotals: kopeck summation stays exact (no float drift)", () => {
  const t = eInvoiceTotals([
    { description: "a", netAmount: 0.1, vatRate: 0 },
    { description: "b", netAmount: 0.2, vatRate: 0 },
  ]);
  assert.equal(t.net, 0.3);
  assert.equal(t.total, 0.3);
});

test("eInvoiceTotals: empty/undefined input → zeros", () => {
  assert.deepEqual(eInvoiceTotals([]), { net: 0, vat: 0, total: 0 });
  assert.deepEqual(eInvoiceTotals(undefined), { net: 0, vat: 0, total: 0 });
});

// --- buildEInvoiceXml -----------------------------------------------------
test("buildEInvoiceXml: well-formed XML, starts with <?xml, contains seller ИНН + 22% line", () => {
  const xml = buildEInvoiceXml(validInvoice());
  assert.equal(xml.startsWith("<?xml"), true);
  assert.match(xml, new RegExp(SELLER_INN));
  assert.match(xml, /<VatRate>22<\/VatRate>/);
  assert.match(xml, /<TotalNet>1500<\/TotalNet>/);
  assert.match(xml, /<TotalVat>270<\/TotalVat>/);
  assert.match(xml, /<TotalAmount>1770<\/TotalAmount>/);
});

test("buildEInvoiceXml: currency defaults to RUB and code 643", () => {
  const xml = buildEInvoiceXml(validInvoice());
  assert.match(xml, /currency="RUB"/);
  assert.match(xml, /643/); // ISO 4217 numeric code for RUB
});

test("buildEInvoiceXml: includes ON_NSCHFDOPPR / format-5.03 mapping comment + ЭДО/КЭП seams", () => {
  const xml = buildEInvoiceXml(validInvoice());
  assert.match(xml, /ON_NSCHFDOPPR/);
  assert.match(xml, /5\.03/);
  assert.match(xml, /ЭДО/);
  assert.match(xml, /КЭП/);
});

test("buildEInvoiceXml: escapes all text (quotes in seller name)", () => {
  const inv = validInvoice();
  inv.seller.name = 'ООО "A&B" <X>';
  const xml = buildEInvoiceXml(inv);
  assert.match(xml, /&quot;A&amp;B&quot; &lt;X&gt;/);
  // raw unescaped form must NOT appear inside a Name element
  assert.equal(xml.includes('<Name>ООО "A&B" <X></Name>'), false);
});

test("buildEInvoiceXml: empty invoice still builds well-formed XML", () => {
  const xml = buildEInvoiceXml();
  assert.equal(xml.startsWith("<?xml"), true);
  assert.match(xml, /<\/Schet-Faktura>|<\/Document>/);
});

// --- validateEInvoice -----------------------------------------------------
test("validateEInvoice: passes a fully valid invoice", () => {
  const res = validateEInvoice(validInvoice());
  assert.equal(res.ok, true);
  assert.deepEqual(res.errors, []);
});

test("validateEInvoice: never throws on null/garbage input", () => {
  assert.doesNotThrow(() => validateEInvoice());
  assert.doesNotThrow(() => validateEInvoice(null));
  assert.doesNotThrow(() => validateEInvoice("garbage"));
  assert.equal(validateEInvoice().ok, false);
});

function codes(res) {
  return res.errors.map((e) => e.code);
}

test("validateEInvoice: missing number", () => {
  const inv = validInvoice();
  delete inv.number;
  const res = validateEInvoice(inv);
  assert.equal(res.ok, false);
  assert.ok(codes(res).includes("MISSING_NUMBER"));
});

test("validateEInvoice: missing/invalid date", () => {
  const inv1 = validInvoice();
  delete inv1.date;
  assert.ok(codes(validateEInvoice(inv1)).includes("MISSING_DATE"));

  const inv2 = validInvoice();
  inv2.date = "15.03.2026"; // not ISO
  assert.ok(codes(validateEInvoice(inv2)).includes("INVALID_DATE"));
});

test("validateEInvoice: missing seller name", () => {
  const inv = validInvoice();
  inv.seller.name = "";
  assert.ok(codes(validateEInvoice(inv)).includes("MISSING_SELLER_NAME"));
});

test("validateEInvoice: bad seller ИНН", () => {
  const inv = validInvoice();
  inv.seller.inn = "1234567890"; // bad checksum
  const res = validateEInvoice(inv);
  assert.equal(res.ok, false);
  assert.ok(codes(res).includes("INVALID_SELLER_INN"));
});

test("validateEInvoice: missing seller ИНН", () => {
  const inv = validInvoice();
  delete inv.seller.inn;
  assert.ok(codes(validateEInvoice(inv)).includes("INVALID_SELLER_INN"));
});

test("validateEInvoice: bad buyer ИНН", () => {
  const inv = validInvoice();
  inv.buyer.inn = "7728168972"; // wrong checksum (valid ИНН is 7728168971)
  assert.ok(codes(validateEInvoice(inv)).includes("INVALID_BUYER_INN"));
});

test("validateEInvoice: buyer ИП (12-digit ИНН, no КПП) is valid", () => {
  const inv = validInvoice();
  inv.buyer.inn = "500100732259"; // valid 12-digit individual ИНН
  delete inv.buyer.kpp;
  const res = validateEInvoice(inv);
  assert.equal(res.ok, true);
});

test("validateEInvoice: seller КПП present-but-invalid fails", () => {
  const inv = validInvoice();
  inv.seller.kpp = "12345"; // wrong length/format
  const res = validateEInvoice(inv);
  assert.equal(res.ok, false);
  assert.ok(codes(res).includes("INVALID_SELLER_KPP"));
});

test("validateEInvoice: vatRate 20 not allowed in 2026", () => {
  const inv = validInvoice();
  inv.lines[0].vatRate = 20;
  const res = validateEInvoice(inv);
  assert.equal(res.ok, false);
  assert.ok(codes(res).includes("INVALID_LINE_VAT_RATE"));
});

test("validateEInvoice: empty lines", () => {
  const inv = validInvoice();
  inv.lines = [];
  assert.ok(codes(validateEInvoice(inv)).includes("NO_LINES"));
});

test("validateEInvoice: missing line description", () => {
  const inv = validInvoice();
  inv.lines[0].description = "";
  assert.ok(codes(validateEInvoice(inv)).includes("INVALID_LINE_DESCRIPTION"));
});

test("validateEInvoice: non-positive quantity", () => {
  const inv = validInvoice();
  inv.lines[0].quantity = 0;
  assert.ok(codes(validateEInvoice(inv)).includes("INVALID_LINE_QUANTITY"));
});

test("validateEInvoice: negative net", () => {
  const inv = validInvoice();
  inv.lines[0].netAmount = -1;
  assert.ok(codes(validateEInvoice(inv)).includes("INVALID_LINE_NET"));
});

test("validateEInvoice: VAT mismatch (declared vatAmount inconsistent with rate)", () => {
  const inv = validInvoice();
  inv.lines[0].vatAmount = 999; // should be ~220 for 22% of 1000
  const res = validateEInvoice(inv);
  assert.equal(res.ok, false);
  assert.ok(codes(res).includes("LINE_VAT_MISMATCH"));
});

test("validateEInvoice: VAT within 1 ruble of expected is accepted", () => {
  const inv = validInvoice();
  inv.lines[0].vatAmount = 220.5; // expected 220, within 1 ruble
  const res = validateEInvoice(inv);
  assert.equal(res.ok, true);
});

test("validateEInvoice: error objects carry field/code/message", () => {
  const res = validateEInvoice({});
  assert.equal(res.ok, false);
  for (const e of res.errors) {
    assert.equal(typeof e.field, "string");
    assert.equal(typeof e.code, "string");
    assert.equal(typeof e.message, "string");
  }
});
