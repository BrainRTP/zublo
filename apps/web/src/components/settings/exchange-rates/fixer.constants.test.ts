import {
  FIXER_PROVIDER_LINKS,
  FIXER_PROVIDER_NAMES,
  providerRequiresApiKey,
} from "@/components/settings/exchange-rates/fixer.constants";

describe("fixer.constants", () => {
  it("maps each provider to the correct product page", () => {
    expect(FIXER_PROVIDER_LINKS).toEqual({
      fixer: "https://fixer.io/product",
      apilayer: "https://apilayer.com/marketplace/fixer-api",
      exchangeapi: "https://github.com/fawazahmed0/exchange-api",
    });
  });

  it("names every provider that has a link", () => {
    expect(Object.keys(FIXER_PROVIDER_NAMES)).toEqual(Object.keys(FIXER_PROVIDER_LINKS));
  });

  it("requires an API key for every provider except exchange-api", () => {
    expect(providerRequiresApiKey("fixer")).toBe(true);
    expect(providerRequiresApiKey("apilayer")).toBe(true);
    expect(providerRequiresApiKey("exchangeapi")).toBe(false);
  });
});
