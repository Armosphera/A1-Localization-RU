"use strict";

// A1-Localization-RU — Russian (Russian Federation) localization + fiscal engines.
//
// Sibling to a1-localization-am (Armenia). Single source of truth for RF fiscal
// correctness, consumed by A1 Suite (Russian-market configuration) via vendoring.
//
//   const { inn, money } = require("a1-localization-ru");
//
// Namespaces are added as engines land (see README "Roadmap").
module.exports = {
  inn: require("./src/inn"),
  money: require("./src/money"),
  vat: require("./src/vat"), // НДС (2026: base 22%)
  payroll: require("./src/payroll"), // НДФЛ + страховые взносы (2026)
  // chartOfAccounts: require("./src/chartOfAccounts"),  // План счетов (94н) — next
  // einvoice:        require("./src/einvoice"),         // УПД / e-invoice — roadmap
};
