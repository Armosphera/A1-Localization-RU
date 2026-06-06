# Official sources — RF fiscal rules (as of 2026-06-06)

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

## E-invoice (roadmap, `einvoice.js`)
- Format **5.03**, Приказ ФНС **№ ЕД-7-26/970@** (XSD public on nalog.gov.ru,
  file class `ON_NSCHFDOPPR`). Must transit a licensed оператор ЭДО; КЭП = GOST
  qualified e-signature (63-ФЗ). Build with injectable `IEdoOperator` + `IKepSigner` seams.

## Chart of accounts (roadmap, `chartOfAccounts.js`)
- **План счетов**, Приказ Минфина РФ **№ 94н от 31.10.2000** (~99 synthetic accounts, 8 sections).

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
