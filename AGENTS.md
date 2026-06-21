# AGENTS.md — A1-Localization-RU (Russian fiscal engines)

This file applies to every agent (human or AI) that touches the
`armosphera/A1-Localization-RU` repository. It extends, and never weakens, the global
rules in `https://github.com/Armosphera/A1-portfolio/blob/main/LICENSING.md`.

## 1. What this repo is

`a1-localization-ru` is the **Russian Federation (RF) localization + fiscal engines** —
the single source of truth for RF fiscal logic across the entire A1 product family:

- ИНН (10/12) / КПП / ОГРН / ОГРНИП / СНИЛС validation (mod-11/mod-101 checksums
  verified against real registry numbers)
- RUB money round/format/parse (копейки)
- НДС (2026 rates: base 22%, reduced 10%, 0%; УСН 5%/7%)
- НДФЛ 5-band progressive (cumulative annual base) + страховые взносы
  (единый тариф / ЕПВБ / МСП, 2026)
- План счетов (Приказ Минфина 94н; 62 synthetic + 11 off-balance = 73 accounts)
- ISO 3166-2:RU regions (83 subjects)
- УПД / electronic счёт-фактура (формат 5.03; ЭДО/КЭП seams)

**This is regulatory territory. Wrong numbers are tax liabilities.**

## 2. Source-available, NOT on npm

Consumed via **vendoring** (copy `index.js` + `src/` into a `vendor/a1-localization-ru/`
directory). Recipe in `INTEGRATION.md`. `package.json` has `"private": true` and a
`publishConfig.registry` pointing at GitHub Packages (org-private) — never override to
public npm.

**Never edit a vendored copy in place.** Fix upstream here, then re-vendor.

## 3. Workflow — Test-Driven Development (TDD)

**Mandatory for every non-trivial change.**

1. Write the test first (RED) in `test/<name>.test.js`. Use real RF registry numbers
   (e.g. ИНН `7707083893`, ОГРН `1027700132195`) — never synthetic.
2. Run `npm test` and confirm it fails for the right reason.
3. Write the minimum implementation in `src/<name>.js` (GREEN).
4. Re-export from `index.js`.
5. Run `npm test` and confirm green.
6. Update README module table.
7. Commit with conventional prefix.

## 4. The 2 files you must NOT edit

- **`src/money.js` rounding rules** — НК РФ ст. 52 mandates whole-ruble rounding for
  tax bases. Any change here breaks every downstream consumer's tax math.
- **`*.data.js`** — pure data tables (regions, chart of accounts). Auto-regenerated.

## 5. Coverage Floor — 80%

- Unit tests in `test/` (`node --test`), measured per touched module.
- CI runs across Node 18, 20, 22 (matrix in `.github/workflows/ci.yml`).
- Coverage check: every non-`*.data.js` `src/*.js` must have a corresponding test file
  (enforced by CI guard).

## 6. Conventional Commits

```
<type>(<scope>): <description>

<optional body> — must cite the regulatory source if touching fiscal logic
```

Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`.

- Subject line ≤72 chars, imperative mood, no trailing period.
- Body explains **why**, and **cites the official source** (e.g. "НК РФ ст. 52",
  "Приказ Минфина 94н", "ФНС письмо № …") when touching rates, deductions, or
  chart-of-accounts structure.

## 7. No Hardcoded Secrets

- API keys, customer data, real taxpayer IDs (other than published test fixtures)
  must never appear in source or tests.
- Public test fixtures (e.g. government-published sample numbers) are OK with citation.

## 8. Porting over Net-New Invention

`src/` modules are pure ports from official RF publications (НК РФ, Приказы Минфина/ФНС,
ФНС/ЦБ РФ specs). **Before** writing a new fiscal engine, search the relevant
publication. Cite it in the commit body. If the rule is ambiguous or unconfirmed from
a primary source, **leave it as an explicit, documented seam** (see README "Known
seams") — never guess.

## 9. Files, Functions, Nesting

- One concept per file. Pure functions only — no I/O, no network, no filesystem.
- Functions: <50 lines, single responsibility.
- No nesting deeper than 4 levels. Prefer early returns.

## 10. JavaScript Discipline

- Zero runtime dependencies. CommonJS.
- Node ≥ 18 (engines in `package.json`). CI runs across node 18/20/22.
- Test runner: `node --test --test-concurrency=4 [--test-timeout=60000]` (the
  `--test-timeout` flag is Node 20+ only; CI guards).
- No TypeScript, no transpilation. Plain ES2022 + CommonJS.

## 11. No Debug Noise in Shipped Code

- `console.log` is for development only.
- No commented-out code in PRs.

## 12. Local-First, Offline-Capable

This repo runs in a sovereign context — every downstream consumer is air-gapped.

- No outbound network calls at runtime.
- No telemetry, no auto-update checks.
- All fixtures are real public-record numbers.

## 13. Question Before Damage

If an instruction is ambiguous and a wrong move would publish wrong tax rates, break
2+ consumer apps, or rewrite a lot of working code, **ask first**. Otherwise, prefer
momentum: small, reversible, well-tested steps.

## 14. Day-One Checklist

```
1. cat AGENTS.md             # this file
2. cat README.md             # install + quick start
3. cat INTEGRATION.md        # vendor recipe (consumers read this)
4. cat SOURCES.md            # regulatory citations
5. ls src/                   # note *.data.js is auto-generated
6. npm install && npm test   # confirm baseline green
7. Now edit.
```

If `npm test` baseline fails on a fresh clone: STOP, file an issue.

---

*Adapted from `armosphera/SBOS-A1-ERP/AGENTS.md`. Sibling: `A1-Localization-AM`.*
*License: Proprietary (`LicenseRef-Armosphera-Proprietary`). See `LICENSE`.*