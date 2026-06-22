# pension-ru-ceiling-crossing

Locks the **Russian funded pension cross-ceiling-month contract** per
НК РФ ст. 425-430 + ФЗ № 425-ФЗ от 28.11.2025. Fails if:
the rates, ceiling, or cross-ceiling-month math drift from the
regulatory source.

## Why this matters

This is **regulatory territory**. Wrong numbers = tax liabilities
(per `AGENTS.md` §3). The pension formula has 2 regimes (within vs
above the 2.5M annual ceiling) — a bug at the boundary or in the
cross-ceiling-month math would silently mis-withhold for thousands
of Russian employees.

## What's frozen

### Constants (per НК РФ ст. 425, ФЗ № 425-ФЗ)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `EMPLOYER_RATE_PENSION` | 22% | Pension share within ceiling |
| `EMPLOYER_RATE_MEDICAL` | 5.1% | Medical share within ceiling |
| `EMPLOYER_RATE_SOCIAL` | 2.9% | Social share within ceiling |
| `EMPLOYER_RATE_ABOVE_CEILING_PENSION` | 0.1% | Pension share above ceiling |
| `EMPLOYER_RATE_ABOVE_CEILING_MEDICAL` | 0% | Medical share above ceiling (since 2023 reform) |
| `EMPLOYER_RATE_ABOVE_CEILING_SOCIAL` | 15% | Social share above ceiling |
| `EMPLOYEE_TOTAL` | 0% | Post-2023 reform (ФЗ № 306-ФЗ) |
| `DEFAULT_ANNUAL_CEILING_RUB` | 2,500,000 | Per ФЗ № 425-ФЗ effective 2026-01-01 |

### Sums

- Within ceiling: 22 + 5.1 + 2.9 = **30%**
- Above ceiling: 0.1 + 0 + 15 = **15.1%**

### Math.round per ст. 52 (whole-ruble rounding)

All contributions are rounded to whole rubles per НК РФ ст. 52.
JS float arithmetic produces 22,000.22 instead of 22,000 — `Math.round`
handles this drift.

### Cross-ceiling month handling

When `yearToDatePensionBase` approaches `ceilingAnnual`, the current
month's pay is split:
- within = min(monthlyPay, ceiling - ytd)
- above = monthlyPay - within
- contribution = (within × within_rate) + (above × above_rate)

## Allowed changes (additive only)

- Adding new test fixtures
- Adding new exported helpers
- Bumping the year in `PENSION_2026` (e.g. `PENSION_2027`)

## Disallowed changes

- Changing rates (`EMPLOYER_RATE_PENSION`, etc.)
- Changing ceiling (`DEFAULT_ANNUAL_CEILING_RUB`)
- Removing `Math.round` (would violate ст. 52)
- Wrong cross-ceiling month math
- Adding I/O (network, filesystem, environment reads)

## Run

```bash
node evals/karpathy/pension-ru-ceiling-crossing/check.js
```

## Source

- `src/pension_ru.js` (the contract surface)
- НК РФ ст. 425-430 (unified social insurance tariff)
- ФЗ № 167-ФЗ "Об обязательном пенсионном страховании в РФ"
- ФЗ № 400-ФЗ "О страховых пенсиях"
- ФЗ № 425-ФЗ от 28.11.2025 (effective 2026-01-01)
- ФЗ № 306-ФЗ от 24.07.2023 (employee rate = 0)
- `SOURCES.md` (regulatory citations)

## Consumers

- `armosphera/A1-Localization-RU` (vendored by ANT, MAX, sovereign, SBOS-A1-ERP)
- 146/146 unit tests pass + this lane pass = 100% green

## Companion lane

- `pension-am-tier-boundary` in A1-Localization-AM — Armenian counterpart
  (RA Tax Code Art. 156 + Decree N 1332-Ն)