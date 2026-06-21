# A1-Localization-RU

> **Source-available, not on npm.** This package is consumed by **vendoring**
> (copy into your project's `vendor/` directory). See
> [Install / use (vendored)](#install--use-vendored) below. Public npm publish
> is intentionally avoided to preserve the local-first / self-hostable
> posture.

**Russian (Russian Federation) localization + fiscal engines.** Pure,
dependency-free JavaScript modules that encode RF-specific correctness:
taxpayer/registration IDs, the ruble, the chart of accounts, VAT (НДС),
payroll (НДФЛ + страховые взносы), and e-invoicing (УПД).

Sibling to [`a1-localization-am`](https://github.com/Armosphera/A1-Localization-AM)
(Armenia). This is the single source of truth for RF fiscal logic, consumed by
products via **vendoring** (copy `index.js` + `src/` into a `vendor/` dir,
require by relative path — see [INTEGRATION.md](./INTEGRATION.md) once
published). **Not published to npm** — the engines are deliberately
source-available (see [LICENSE](./LICENSE)) and the local-first / self-hostable
posture is preserved by avoiding public registry dependency.

> ⚠️ **Tax software — handle with care.** These engines compute real fiscal
> obligations. Rules are sourced from official RF publications (Налоговый кодекс РФ,
> Приказы Минфина/ФНС, ФНС/ЦБ РФ specs) and covered by tests, but are **not a
> substitute for a licensed accountant**. Rate-driven rules (НДФЛ scale, страховые
> взносы limits, НДС) change annually — anything unconfirmed from a primary source is
> left as an explicit, documented seam, never guessed.

## Status

✅ **Engines complete.** All fiscal + localization engines are shipped and tested
(**131 tests green**, `node --test`). The only remaining piece is the Russian UI
catalog (`locale/ru.json`), which lands with A1 Suite Russian-market UI wiring.

| Module | Status |
|--------|--------|
| `inn.js` — ИНН (10/12), КПП, ОГРН, ОГРНИП, СНИЛС validation | ✅ shipped (checksums verified against real registry numbers) |
| `money.js` — RUB/копейка round, format, parse | ✅ shipped |
| `vat.js` — НДС (2026 rates: base **22%**, settlement math, УСН 5%/7%) | ✅ shipped |
| `payroll.js` — НДФЛ 5-band progressive + страховые взносы (ЕПВБ/МСП, 2026) | ✅ shipped |
| `chartOfAccounts.js` — План счетов (Приказ Минфина 94н; 62 synthetic + 11 off-balance = 73) | ✅ shipped |
| `regions.js` — субъекты РФ (ISO 3166-2:RU, 83 subjects) | ✅ shipped |
| `phone.js` — +7 / 10-digit НСН normalize, e164, format | ✅ shipped |
| `einvoice.js` — УПД / electronic счёт-фактура (формат 5.03; ЭДО/КЭП seams) | ✅ shipped |
| `locale/ru.json` — Russian-only UI catalog | ⏳ lands with A1 Suite UI wiring |

## Install / use (vendored)

**This package is not published to npm.** Products consume it by **vendoring**
(copy `index.js` + `src/` into a `vendor/` directory of your project, then
require by relative path). This keeps the local-first / self-hostable contract
intact and avoids depending on a public registry at runtime.

```bash
# 1. Vendor this repo into your project (run from your project root):
mkdir -p vendor
cp -R <path-to-clone>/index.js vendor/a1-localization-ru-index.js
cp -R <path-to-clone>/src vendor/a1-localization-ru-src

# 2. Use it:
```

```js
// Adjust the path to match where you placed the vendor copy.
const { inn, money } = require("./vendor/a1-localization-ru-src");

inn.validateInn("7707083893");   // → { ok:true, normalized:"7707083893", kind:"legal", error:null }
inn.isValidOgrn("1027700132195"); // → true
money.roundRub(1234.567);        // → 1234.57  (kopecks)
money.formatRub(1234567.89);     // → "1 234 567,89 ₽"
money.parseRub("1 234,56 ₽");    // → { ok:true, amount:1234.56, error:null }
```

### Why vendor instead of `npm install`?

- **Local-first guarantee** — no registry round-trip at install or runtime.
- **Sovereignty posture** — your build and your runtime depend only on files
  you physically have on disk.
- **Single source of truth** — fixes land here first, then re-vendor into
  consumers. Patching a vendored copy re-introduces the drift this extraction
  removed.
- **License boundary** — the engines are source-available (see
  [LICENSE](./LICENSE)); vendoring under your own project is the supported way
  to consume them without re-publishing.

See [INTEGRATION.md](./INTEGRATION.md) once published for the full recipe
(including `package.json` overrides, UMD/browser build for HayHashvapah-style
PWAs, and the per-engine re-export shim pattern).

## Modules (`src/`)

| Module | Responsibility |
|--------|----------------|
| `inn.js` | Validate ИНН (10-digit legal / 12-digit individual, weighted mod-11 checksums), КПП (structure), ОГРН (mod 11), ОГРНИП (mod 13), СНИЛС (mod 101). |
| `money.js` | RUB money: `roundRub` (2-decimal kopecks), `roundToWholeRubles` (tax bases, НК РФ ст. 52), `formatRub` ("1 234,56 ₽"), `parseRub` (strict, locale-tolerant `{ok,amount,error}`). |
| `vat.js` | НДС (2026): year-keyed rates (base 22%, reduced 10%, 0%; УСН 5%/7%), `vatFromNet`/`vatFromGross`/`netFromGross` settlement math, `isValidVatRate`. |
| `payroll.js` | НДФЛ 5-band progressive (cumulative annual base) + страховые взносы (единый тариф / ЕПВБ / МСП), child standard deductions, full monthly gross→net. |
| `chartOfAccounts.js` | План счетов (94н): `STANDARD_ACCOUNTS` (73), `SECTIONS`, `accountByCode`, `accountsBySection`, `accountsByNature`, `sectionOf`, `normalBalance`, `isValidAccountCode`. |
| `regions.js` | Федеральные субъекты (ISO 3166-2:RU, 83): `REGIONS`, `REGION_CODES`, `regionByCode`, `isValidRegionCode`, `findRegion`, `citiesForRegion`. |
| `phone.js` | Телефоны РФ (+7): `normalizeNsn`, `isValidRussianPhone`, `e164`, `formatPhone` ("+7 (XXX) XXX-XX-XX"). |
| `einvoice.js` | УПД / счёт-фактура: `normalizeLine`, `eInvoiceTotals`, `buildEInvoiceXml`, `validateEInvoice` (fail-closed); RUB kopeck amounts; ЭДО/КЭП seams. |

## Testing

```
npm test
```

Pure-function unit tests via the Node built-in runner (capped concurrency to stay light
on constrained machines). No server, no database, no network. Identifier checksums are
tested against **real registry numbers** (e.g. ИНН `7707083893`, ОГРН `1027700132195`).

## Karpathy evals

This repo can run A1 product-research eval lanes through the shared
`../../A1-AI-Core` runner in the local Armosphera workspace:

```
node scripts/karpathy-eval.mjs --list
node scripts/karpathy-eval.mjs --program vat-einvoice-contract
node scripts/karpathy-eval.mjs --run vat-einvoice-contract
```

The `vat-einvoice-contract` lane verifies the Russian VAT and e-invoice engines:
2026 issue rates, 2025 back-dated rate behavior, settlement math, kopeck totals,
fail-closed invoice validation, and the no-I/O transport/signing seam.