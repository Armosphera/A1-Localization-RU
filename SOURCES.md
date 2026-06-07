# Official sources — RF fiscal rules (as of 2026-06-07)

Every rate/threshold encoded in `src/` traces to a primary or authoritative source below.
**Rate-driven rules change annually** — re-confirm against the cited law before each tax year.

> ⚠️ **2026 reform.** A major tax reform took effect **2026-01-01**: НДС base rate
> **20% → 22%**, УСН gained a VAT obligation (special 5%/7%), profit tax 25%, deflator
> 1.09. 2026 values are NOT 2025 carried forward.

## Identifiers (`inn.js`) — stable, structure-defined (not annual)
- **ИНН** 10/12-digit weighted mod-11 checksums; **ОГРН** 13-digit mod-11; **ОГРНИП**
  15-digit mod-13; **СНИЛС** 11-digit mod-101; **КПП** 9-char structure.
- ФНС registration orders + ЦБ РФ Письмо № 515 (bank-account control key). Verified
  against real registry numbers (ИНН `7707083893`, ОГРН `1027700132195`, ОГРНИП `304500116000157`).

## Money (`money.js`)
- RUB minor unit = копейка (2 decimals). Tax bases round to whole rubles — **НК РФ ст. 52**.

## Regions (`regions.js`) — stable, standard-defined
- Federal subjects keyed on **ISO 3166-2:RU** (the internationally-recognized set, **83
  subjects**): 2 cities of federal significance, 21 republics, 9 krais, 46 oblasts, 1
  autonomous oblast, 4 autonomous okrugs. Neutral, machine-checkable identifiers; subjects
  outside the international standard are intentionally excluded (territorial-claim neutrality).
- Administrative centres reflect current status (e.g. Ленинградская обл. → Гатчина since 2021;
  Ингушетия → Магас; Московская обл. → Красногорск).

## Phone (`phone.js`) — stable, numbering-plan invariant
- Country code **+7**, 10-digit NSN (НСН), domestic trunk prefix **8**. Validates the stable
  invariant (10 digits, leading 3–9; mobile 9XX) rather than volatile operator prefixes.

## VAT (`vat.js`) — 2026
- Base rate **22%** (reduced 10%, 0% export); УСН special **5%/7%**. ФНС «Налоги 2026»
  (nalog.gov.ru/new2026), ФНС «НДС по новым правилам с 2026», ГАРАНТ 2040005.
- Settlement rates: 22/122, 10/110.

## Payroll (`payroll.js`) — 2026
- **НДФЛ** 5-band marginal progressive scale (13/15/18/20/22%) on the cumulative annual
  base — **НК РФ ст. 224** (effective 2025-01-01, unchanged 2026). Bands: 2.4M / 5M / 20M / 50M ₽.
- Non-resident default **30%** — НК РФ ст. 224 п. 3.
- Child standard deductions 1 400 / 2 800 / 6 000 / 12 000 ₽, income cap **450 000 ₽** — **НК РФ ст. 218**.
- **Страховые взносы** unified **30%** within base / **15.1%** above — **НК РФ ст. 425**.
- **ЕПВБ 2026 = 2 979 000 ₽** — **Пост. Правительства РФ № 1705 от 31.10.2025**
  (consultant.ru LAW_518016; nalog.gov.ru 16577139).
- **МРОТ 2026 = 27 093 ₽** — **ФЗ № 429-ФЗ от 28.11.2025**.
- **МСП** reduced tariff: 30% up to **1.5×МРОТ (40 639,50 ₽)** monthly, 15% above —
  **ФЗ № 425-ФЗ от 28.11.2025**, НК РФ ст. 427 (effective 2026-01-01).

## E-invoice (`einvoice.js`) — ✅ shipped
- Format **5.03**, Приказ ФНС **№ ЕД-7-26/970@** (XSD public on nalog.gov.ru,
  file class `ON_NSCHFDOPPR`). Must transit a licensed оператор ЭДО; КЭП = GOST
  qualified e-signature (63-ФЗ). Shipped as a structural XML builder + fail-closed
  validator; `IEdoOperator` (transport) + `IKepSigner` (КЭП) are documented seams,
  NOT implemented — the caller maps the output to the official `ON_NSCHFDOPPR` XSD
  and signs/submits via a licensed operator. Issued НДС rates 2026: 0 / 10 / 22%.

## Chart of accounts (`chartOfAccounts.js`) — ✅ shipped
- **План счетов**, Приказ Минфина РФ **№ 94н от 31.10.2000**: **62 synthetic
  (first-order) accounts + 11 off-balance (забалансовые 001–011) = 73**, across 8
  balance-sheet sections (разделы I–VIII). Per-account character (активный / пассивный /
  активно-пассивный) drives `normalBalance`. Synthetic level only — субсчета and
  entity-optional accounts are out of scope. Reserved gaps (06,12,13,17,18,22,24,27,
  30–39,47,48,53,54,56,61,64,65,72,74,78,85,87–89,92,93,95) are intentionally absent.

## ⚠️ Known seams — NOT modeled / needs primary-source confirmation
- **МСП eligibility** (priority-ОКВЭД per Распоряжение № 4125-р + the 70%-of-income test
  + revenue ceiling): out of `payroll.js` scope — pass `sme:true` only for an already-qualified
  employer. Confirm the revenue ceiling against ст. 427 text.
- **Injury contributions** (0.2–8.5%, risk class 1–32, ФЗ № 125-ФЗ): employer-specific, not encoded.
- **УСН ОС limit** 200 vs 218 млн ₽ (post-indexation) — unconfirmed.
- **АУСН income cap** 60 vs proposed 20 млн ₽ for 2026 — unconfirmed.
- **«ФЗ от 25.04.2026 № 104-ФЗ / реформа 3.0»** (ОКВЭД income-summing) — likely spurious;
  **do not implement** without verifying the law exists.
- E-invoice format versions beyond **5.03** — draft only; do not adopt until the amending Приказ publishes.
