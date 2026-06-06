# A1-Localization-RU

**Russian (Russian Federation) localization + fiscal engines.** Pure,
dependency-free JavaScript modules that encode RF-specific correctness:
taxpayer/registration IDs, the ruble, the chart of accounts, VAT (НДС),
payroll (НДФЛ + страховые взносы), and e-invoicing (УПД).

Sibling to [`a1-localization-am`](https://github.com/SamStep74/A1-Localization-AM)
(Armenia). This is the single source of truth for RF fiscal logic, consumed by the
**Russian-market configuration of A1 Suite** by vendoring (copy `index.js` + `src/`,
require by relative path — see [INTEGRATION.md](./INTEGRATION.md) once published).

> ⚠️ **Tax software — handle with care.** These engines compute real fiscal
> obligations. Rules are sourced from official RF publications (Налоговый кодекс РФ,
> Приказы Минфина/ФНС, ФНС/ЦБ РФ specs) and covered by tests, but are **not a
> substitute for a licensed accountant**. Rate-driven rules (НДФЛ scale, страховые
> взносы limits, НДС) change annually — anything unconfirmed from a primary source is
> left as an explicit, documented seam, never guessed.

## Status

🚧 **Work in progress.** The stable, structure-defined kernel is shipped + tested;
the rate-driven engines are being built from sourced 2026 RF fiscal data.

| Module | Status |
|--------|--------|
| `inn.js` — ИНН (10/12), КПП, ОГРН, ОГРНИП, СНИЛС validation | ✅ shipped (checksums verified against real registry numbers) |
| `money.js` — RUB/копейка round, format, parse | ✅ shipped |
| `vat.js` — НДС (2026 rates: base **22%**, settlement math, УСН 5%/7%) | ✅ shipped |
| `payroll.js` — НДФЛ 5-band progressive + страховые взносы (ЕПВБ/МСП, 2026) | ✅ shipped |
| `chartOfAccounts.js` — План счетов (Приказ Минфина 94н) | ⏳ next (data sourced) |
| `einvoice.js` — УПД / electronic счёт-фактура | ⏳ roadmap |
| `locale/ru.json` — Russian-only UI catalog | ⏳ lands with A1 Suite UI wiring |

## Install / use

Zero runtime dependencies. Node ≥ 18 (built-in test runner).

```js
const { inn, money } = require("a1-localization-ru");

inn.validateInn("7707083893");   // → { ok:true, normalized:"7707083893", kind:"legal", error:null }
inn.isValidOgrn("1027700132195"); // → true
money.roundRub(1234.567);        // → 1234.57  (kopecks)
money.formatRub(1234567.89);     // → "1 234 567,89 ₽"
money.parseRub("1 234,56 ₽");    // → { ok:true, amount:1234.56, error:null }
```

## Modules (`src/`)

| Module | Responsibility |
|--------|----------------|
| `inn.js` | Validate ИНН (10-digit legal / 12-digit individual, weighted mod-11 checksums), КПП (structure), ОГРН (mod 11), ОГРНИП (mod 13), СНИЛС (mod 101). |
| `money.js` | RUB money: `roundRub` (2-decimal kopecks), `roundToWholeRubles` (tax bases, НК РФ ст. 52), `formatRub` ("1 234,56 ₽"), `parseRub` (strict, locale-tolerant `{ok,amount,error}`). |

## Testing

```
npm test
```

Pure-function unit tests via the Node built-in runner (capped concurrency to stay light
on constrained machines). No server, no database, no network. Identifier checksums are
tested against **real registry numbers** (e.g. ИНН `7707083893`, ОГРН `1027700132195`).
