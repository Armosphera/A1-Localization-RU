# Engine roadmap — a1-localization-ru

Status checklist. `[x]` = shipped + tests green + SOURCES.md updated + README.md
updated + `.orchestration/<engine>-done` touched.

## Engines shipped (already in src/)

- [x] `inn.js` — ИНН / КПП / ОГРН / ОГРНИП / СНИЛС
- [x] `money.js` — RUB/копейка round/format/parse
- [x] `vat.js` — НДС 22% / 10% / 0% / УСН 5%/7%
- [x] `payroll.js` — НДФЛ 5-band + страховые взносы
- [x] `chartOfAccounts.js` — 73 accounts / 9 sections (Приказ 94н)
- [x] `regions.js` — 83 субъекта РФ
- [x] `phone.js` — +7 phone NSN/E.164
- [x] `einvoice.js` — УПД format 5.03

## Engines to add (roadmap)

- [ ] `pension_ru` — dedicated funded pension calculator
- [ ] `insurance_ru` — health + social + medical insurance separate from payroll
- [ ] `currency_fx.js` — RUB ↔ foreign currency (CB RF source)
- [ ] `usn.js` — separate УСН calculator (currently inside vat.js)
- [ ] `patent.js` — патентная система налогообложения

## Tests to add

- [ ] Cross-year rate bump test (2026 → 2027) — both fixtures pass
- [ ] Edge cases for `parseRub` — locale boundary
- [ ] `einvoice.buildEInvoiceXml` validation against published samples
- [ ] `payroll.computePayroll` cumulative annual base — multi-month fixtures

## Coordination

- Sibling `A1-Localization-AM` has a parallel roadmap — port both engines when one
  is added.
- `A1-Suite-Local-ANT`, `A1-Suite-Local-MAX` vendor this repo under
  `vendor/a1-localization-ru/`. Notify them on public-API changes.