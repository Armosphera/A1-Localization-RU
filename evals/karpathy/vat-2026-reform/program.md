# vat-2026-reform

Locks the **2026 Russian tax reform contract** per НК РФ гл. 21 +
ФЗ № 425-ФЗ от 28.11.2025 (effective 2026-01-01).

## Why this lane exists

The 2026 reform changed multiple Russian fiscal rates:
- **Standard VAT**: 20% → **22%** (the headline change)
- **Reduced VAT**: 10% (unchanged, food/medicine/children)
- **Zero-rated**: 0% (unchanged, exports/medical equipment)
- **Pension ceiling**: 1,917,000 → **2,500,000** RUB/year
- **Above-ceiling rates**: pension 0.1%, medical 0%, social 15% (was 10%)
- **УСН special rates**: 5% (income) / 7% (income - expenses)
- **Employee rate**: 0% (post-2023 reform, unchanged)

Any drift in these rates = wrong tax liabilities for thousands of
Russian businesses.

## What's frozen (17 checks)

### VAT rates (in `src/vat.js`)

| Constant | Value | Why |
|----------|-------|-----|
| `VAT_RATES.2026.standard` | 22 | Post-reform standard |
| `VAT_RATES.2026.reduced` | 10 | Unchanged |
| `VAT_RATES.2026.zero` | 0 | Unchanged |
| `VAT_RATES.2025.standard` | 20 | Pre-reform, for back-dated docs |
| `VAT_RATES.2026.usnLow` | 5 | УСН income |
| `VAT_RATES.2026.usnHigh` | 7 | УСН income-expenses |
| `CURRENT_YEAR` | 2026 | Default year |

### Pension rates (in `src/pension_ru.js`)

| Constant | Value |
|----------|-------|
| `PENSION_2026.EMPLOYER_RATE_PENSION` | 22 |
| `PENSION_2026.EMPLOYER_RATE_MEDICAL` | 5.1 |
| `PENSION_2026.EMPLOYER_RATE_SOCIAL` | 2.9 |
| `PENSION_2026.EMPLOYER_TOTAL_WITHIN_CEILING` | 30 (= 22 + 5.1 + 2.9) |
| `PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_PENSION` | 0.1 |
| `PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_MEDICAL` | 0 |
| `PENSION_2026.EMPLOYER_RATE_ABOVE_CEILING_SOCIAL` | 15 |
| `PENSION_2026.EMPLOYER_TOTAL_ABOVE_CEILING` | 15.1 (= 0.1 + 0 + 15) |
| `PENSION_2026.EMPLOYEE_TOTAL` | 0 (post-2023 reform) |
| `PENSION_2026.DEFAULT_ANNUAL_CEILING_RUB` | 2,500,000 |
| `Math.round(...)` (kopecks rounding, st. 52) | ≥3 usages |

## Allowed changes (additive only)

- Adding a new year key (e.g. `VAT_RATES.2027`)
- Adding new rate fields per existing year
- Adding new functions (e.g. helpers)

## Disallowed changes

- Changing any frozen rate value
- Removing the 2025 backward-compat entry
- Removing the pension ceiling
- Removing Math.round (would violate НК РФ ст. 52)

## Run

```bash
node evals/karpathy/vat-2026-reform/check.js
```

## Source

- `src/vat.js` (VAT rates + УСН)
- `src/pension_ru.js` (pension/medical/social rates)
- `test_vat_ru.py` (43 dedicated tests, this session)
- НК РФ гл. 21
- ФЗ № 425-ФЗ от 28.11.2025
- ФЗ № 306-ФЗ от 24.07.2023 (employee rate = 0% since 2023)

## Companion lanes

- `vat-einvoice-contract` — locks the e-invoice format
- `pension-ru-ceiling-crossing` — locks the ceiling crossing math