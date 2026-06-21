# program.md — add a new fiscal engine to a1-localization-ru

You are an autonomous porting agent. Your job: **add a new fiscal engine (or update
an existing one) to `armosphera/A1-Localization-RU`** by porting the corresponding
upstream module from `armosphera/autoresearch-sboss/examples/<name>/`.

## ⚠️ REGULATORY TERRITORY — read this first

This is RF fiscal code. Wrong numbers are tax liabilities. You must:

1. **Find the authoritative primary source** (НК РФ, Приказы Минфина/ФНС, ФНС/ЦБ РФ
   specs). Cite it in the commit body.
2. **Use real public-record fixtures** (e.g. published sample ИНН `7707083893`,
   ОГРН `1027700132195`).
3. **Never guess.** If the rule is ambiguous or unconfirmed from a primary source,
   leave it as an explicit, documented seam — see "Known seams" in `README.md`.

If you cannot cite a primary source for a rate, deduction, or formula, **STOP** and
file an issue. Do not invent.

## The task

Given a target engine (e.g. "add `pension_ru`" or "update `vat.js` for 2027 rates"),
produce:

1. A pure-function module in `src/<name>.js`.
2. A test file in `test/<name>.test.js` with real fixtures.
3. Re-export from `index.js`.
4. Update `README.md` module table.
5. Update `SOURCES.md` with the primary-source citation.

## The loop

```
1. Read AGENTS.md (rules) + this file (loop)
2. Pick the next engine from .orchestration/engine-roadmap.md
3. Read the upstream: armosphera/autoresearch-sboss/examples/<name>/
4. Find the primary source for every rate, tier, threshold
5. Implement src/<name>.js (GREEN)
6. Write tests in test/<name>.test.js (real fixtures only)
7. Re-export from index.js
8. Run npm test
9. Update README.md + SOURCES.md
10. Commit with conventional prefix + source citation in body
11. Mark .orchestration/<engine>-done
12. Pick next, repeat
```

## Files you'll touch

| File | Why |
|---|---|
| `src/<name>.js` | The pure-function engine |
| `src/<name>.data.js` | If pure data (auto-generated tables) |
| `test/<name>.test.js` | Tests with real fixtures |
| `index.js` | Re-export |
| `README.md` | Module table |
| `SOURCES.md` | Primary-source citations |

## Files you must NOT touch

- `src/money.js` rounding rules — НК РФ ст. 52 mandates whole-ruble rounding for
  tax bases. Any change here breaks every downstream consumer's tax math.
- `package.json` `"private": true` and `publishConfig.registry` — this package is
  not on public npm by design; publishes go to GitHub Packages (org-private only).
- `INTEGRATION.md` consumer recipe — changes here break downstream apps.

## Rules of engagement

- **Cite primary sources in every commit body.** Format:
  ```
  Per НК РФ ст. 52, tax bases round to whole rubles.
  Per Приказ Минфина 94н, chart of accounts has 73 entries across 9 sections.
  Per ФНС письмо № …, НДС rate base = 22% from 2026.
  ```
- **Pure functions only.** No I/O, no network, no filesystem.
- **Real fixtures only.** Use the published sample numbers.
- **Coverage ≥80% per touched module.**
- **Cross-year rate bumps need new test fixtures.**

## Environment

- Node ≥ 18. CI matrix: 18, 20, 22.
- `npm install` (zero runtime deps).
- `npm test`.

## When to stop

- **Roadmap complete.**
- **Rate source ambiguous:** file an issue, leave the seam.
- **Coverage drops below 80%:** split the diff.

## Logging

Use conventional commits with `feat(<engine>): add <name> per <source>` or
`fix(<engine>): correct <field> per <source>`.

## Coordination

- **Sibling AM engine:** if RA and RF have a parallel engine, port both.
- **Consumer apps:** ANT, MAX vendor this repo. Notify on public-API changes.

---

*Companion to `AGENTS.md`. AGENTS.md = rules. This file = day-to-day loop.*