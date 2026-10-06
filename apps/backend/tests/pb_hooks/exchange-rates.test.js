const {
  normalizeRatesByMainCurrency,
  providerRequiresApiKey,
  upperCaseRates,
} = require("../../pb_hooks/lib/pure/exchange-rates.js");

describe("pb_hooks/lib/pure/exchange-rates.js", () => {
  it("normalizes rates relative to the main currency and injects EUR=1", () => {
    expect(
      normalizeRatesByMainCurrency({ USD: 1.08, BRL: 5.4 }, "BRL", ["USD", "BRL", "EUR"]),
    ).toEqual({
      USD: 0.2,
      BRL: 1,
      EUR: 0.18518518518518517,
    });
  });

  it("ignores currencies missing from the provider payload", () => {
    expect(
      normalizeRatesByMainCurrency({ USD: 1.08, EUR: 1 }, "EUR", ["USD", "EUR", "GBP"]),
    ).toEqual({
      USD: 1.08,
      EUR: 1,
    });
  });

  it("throws when the main currency is absent", () => {
    expect(() =>
      normalizeRatesByMainCurrency({ USD: 1.08 }, "BRL", ["USD", "BRL"]),
    ).toThrow("Main currency 'BRL' was not found in the API response.");
  });

  it("treats a null eurRates argument as an empty map and still works when main is EUR", () => {
    // covers the `eurRates || {}` fallback branch on line 2
    expect(normalizeRatesByMainCurrency(null, "EUR", ["EUR"])).toEqual({ EUR: 1 });
  });

  it("returns 1 for the main currency even when it also exists in the rates map", () => {
    expect(
      normalizeRatesByMainCurrency({ USD: 1.08, EUR: 1 }, "USD", ["USD", "EUR"]),
    ).toEqual({
      USD: 1,
      EUR: 0.9259259259259258,
    });
  });

  it("injects 1 for an explicit base currency", () => {
    // 1 USD = 80 RUB, 1 EUR = 100 RUB, expressed as units per 1 RUB.
    const usdMain = normalizeRatesByMainCurrency({ USD: 1 / 80, EUR: 1 / 100 }, "USD", ["RUB", "USD", "EUR"], "RUB");

    expect(usdMain.USD).toBe(1);
    expect(usdMain.RUB).toBeCloseTo(80);
    expect(usdMain.EUR).toBeCloseTo(0.8);
  });

  it("requires an API key for every provider except exchange-api", () => {
    expect(providerRequiresApiKey("fixer")).toBe(true);
    expect(providerRequiresApiKey("apilayer")).toBe(true);
    expect(providerRequiresApiKey("exchangeapi")).toBe(false);
  });

  it("uppercases exchange-api codes and drops non-positive or non-numeric rates", () => {
    expect(upperCaseRates({ usd: 1.12, rub: 95.1, eur: 1, bad: 0, neg: -1, str: "1", nul: null })).toEqual({
      USD: 1.12,
      RUB: 95.1,
      EUR: 1,
    });
  });

  it("treats a missing exchange-api payload as empty", () => {
    expect(upperCaseRates(undefined)).toEqual({});
  });
});
