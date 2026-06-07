"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REGIONS,
  REGION_CODES,
  regionByCode,
  isValidRegionCode,
  findRegion,
  citiesForRegion,
} = require("../src/regions");

// ISO 3166-2:RU defines 83 internationally-recognized federal subjects.
const EXPECTED_COUNT = 83;

test("REGIONS: total count matches ISO 3166-2:RU standard", () => {
  assert.equal(REGIONS.length, EXPECTED_COUNT);
  assert.equal(REGION_CODES.length, EXPECTED_COUNT);
});

test("REGIONS: every code matches /^RU-[A-Z0-9]{2,3}$/", () => {
  for (const r of REGIONS) {
    assert.match(r.code, /^RU-[A-Z0-9]{2,3}$/, `bad code: ${r.code}`);
  }
});

test("REGIONS: codes are unique", () => {
  const set = new Set(REGION_CODES);
  assert.equal(set.size, REGIONS.length);
});

test("REGION_CODES mirrors REGIONS codes in order", () => {
  assert.deepEqual(REGION_CODES, REGIONS.map((r) => r.code));
});

test("REGIONS: every entry is well-formed", () => {
  const types = new Set([
    "республика",
    "край",
    "область",
    "город федерального значения",
    "автономная область",
    "автономный округ",
  ]);
  for (const r of REGIONS) {
    assert.equal(typeof r.code, "string");
    assert.ok(r.ru && typeof r.ru === "string", `missing ru: ${r.code}`);
    assert.ok(r.en && typeof r.en === "string", `missing en: ${r.code}`);
    assert.ok(types.has(r.type), `bad type for ${r.code}: ${r.type}`);
    assert.ok(r.center && typeof r.center === "string", `missing center: ${r.code}`);
    assert.ok(Array.isArray(r.cities) && r.cities.length >= 1, `bad cities: ${r.code}`);
    assert.equal(r.cities[0], r.center, `centre must be first city: ${r.code}`);
  }
});

test("REGIONS: contains the two cities of federal significance", () => {
  const fed = REGIONS.filter((r) => r.type === "город федерального значения");
  const codes = fed.map((r) => r.code).sort();
  assert.deepEqual(codes, ["RU-MOW", "RU-SPE"]);
});

test("REGIONS: contains the single autonomous oblast (RU-YEV)", () => {
  const ao = REGIONS.filter((r) => r.type === "автономная область");
  assert.equal(ao.length, 1);
  assert.equal(ao[0].code, "RU-YEV");
});

test("REGIONS: contains the four autonomous okrugs", () => {
  const okr = REGIONS.filter((r) => r.type === "автономный округ").map((r) => r.code).sort();
  assert.deepEqual(okr, ["RU-CHU", "RU-KHM", "RU-NEN", "RU-YAN"]);
});

test("spot-check: RU-MOW → Moscow city", () => {
  const r = regionByCode("RU-MOW");
  assert.ok(r);
  assert.equal(r.type, "город федерального значения");
  assert.equal(r.ru, "Москва");
  assert.equal(r.en, "Moscow");
  assert.equal(r.center, "Москва");
});

test("spot-check: RU-TA → Tatarstan republic, centre Казань", () => {
  const r = regionByCode("RU-TA");
  assert.ok(r);
  assert.equal(r.type, "республика");
  assert.equal(r.en, "Tatarstan");
  assert.equal(r.center, "Казань");
});

test("spot-check: RU-KDA → Krasnodar krai", () => {
  const r = regionByCode("RU-KDA");
  assert.ok(r);
  assert.equal(r.type, "край");
  assert.equal(r.en, "Krasnodar Krai");
  assert.equal(r.center, "Краснодар");
});

test("spot-check: RU-SPE → Saint Petersburg city", () => {
  const r = regionByCode("RU-SPE");
  assert.ok(r);
  assert.equal(r.type, "город федерального значения");
  assert.equal(r.center, "Санкт-Петербург");
});

test("spot-check: RU-SA → Sakha (Yakutia), centre Якутск", () => {
  const r = regionByCode("RU-SA");
  assert.ok(r);
  assert.equal(r.type, "республика");
  assert.equal(r.center, "Якутск");
});

test("regionByCode: case-insensitive and trims", () => {
  assert.equal(regionByCode("ru-mow").code, "RU-MOW");
  assert.equal(regionByCode("  RU-TA  ").code, "RU-TA");
  assert.equal(regionByCode("Ru-Kda").code, "RU-KDA");
});

test("regionByCode: null on miss / invalid input", () => {
  assert.equal(regionByCode("RU-ZZ"), null);
  assert.equal(regionByCode(""), null);
  assert.equal(regionByCode(null), null);
  assert.equal(regionByCode(undefined), null);
  assert.equal(regionByCode(123), null);
  assert.equal(regionByCode("Moscow"), null);
});

test("isValidRegionCode: true for known codes, false otherwise", () => {
  assert.equal(isValidRegionCode("RU-MOW"), true);
  assert.equal(isValidRegionCode("ru-ta"), true);
  assert.equal(isValidRegionCode("  RU-SPE "), true);
  assert.equal(isValidRegionCode("RU-ZZ"), false);
  assert.equal(isValidRegionCode(""), false);
  assert.equal(isValidRegionCode(null), false);
  assert.equal(isValidRegionCode(42), false);
});

test("findRegion: by code", () => {
  assert.equal(findRegion("RU-TA").code, "RU-TA");
  assert.equal(findRegion("ru-mow").code, "RU-MOW");
});

test("findRegion: round-trips by ru name (case-insensitive)", () => {
  for (const r of REGIONS) {
    assert.equal(findRegion(r.ru).code, r.code, `ru lookup failed: ${r.ru}`);
    assert.equal(findRegion(r.ru.toLowerCase()).code, r.code);
  }
});

test("findRegion: round-trips by en name (case-insensitive)", () => {
  for (const r of REGIONS) {
    assert.equal(findRegion(r.en).code, r.code, `en lookup failed: ${r.en}`);
    assert.equal(findRegion(r.en.toUpperCase()).code, r.code);
  }
});

test("findRegion: trims surrounding whitespace", () => {
  assert.equal(findRegion("  Москва  ").code, "RU-MOW");
  assert.equal(findRegion("  Tatarstan  ").code, "RU-TA");
});

test("findRegion: null on miss / invalid input", () => {
  assert.equal(findRegion("Atlantis"), null);
  assert.equal(findRegion(""), null);
  assert.equal(findRegion(null), null);
  assert.equal(findRegion(undefined), null);
  assert.equal(findRegion(99), null);
});

test("citiesForRegion: returns the centre first", () => {
  const cities = citiesForRegion("RU-TA");
  assert.equal(cities[0], "Казань");
});

test("citiesForRegion: returns a COPY (mutation does not affect REGIONS)", () => {
  const cities = citiesForRegion("RU-MOW");
  const before = regionByCode("RU-MOW").cities.length;
  cities.push("MUTATED");
  cities[0] = "MUTATED";
  assert.equal(regionByCode("RU-MOW").cities.length, before);
  assert.equal(regionByCode("RU-MOW").cities[0], "Москва");
  // distinct array identity
  assert.notEqual(citiesForRegion("RU-MOW"), regionByCode("RU-MOW").cities);
});

test("citiesForRegion: case-insensitive, [] on miss", () => {
  assert.deepEqual(citiesForRegion("ru-mow"), citiesForRegion("RU-MOW"));
  assert.deepEqual(citiesForRegion("RU-ZZ"), []);
  assert.deepEqual(citiesForRegion(""), []);
  assert.deepEqual(citiesForRegion(null), []);
});

test("immutability: REGIONS array is frozen", () => {
  assert.ok(Object.isFrozen(REGIONS));
  assert.throws(() => {
    REGIONS.push({ code: "RU-XX" });
  }, /Cannot add property|object is not extensible/);
});

test("immutability: each REGION element is frozen (deep)", () => {
  for (const r of REGIONS) {
    assert.ok(Object.isFrozen(r), `not frozen: ${r.code}`);
    assert.ok(Object.isFrozen(r.cities), `cities not frozen: ${r.code}`);
  }
  const m = REGIONS[0];
  const originalRu = m.ru;
  try {
    m.ru = "HACKED";
  } catch (_e) {
    /* frozen throws in strict mode */
  }
  assert.equal(REGIONS[0].ru, originalRu);
});

test("immutability: REGION_CODES is frozen", () => {
  assert.ok(Object.isFrozen(REGION_CODES));
  assert.throws(() => {
    REGION_CODES.push("RU-XX");
  }, /Cannot add property|object is not extensible/);
});
