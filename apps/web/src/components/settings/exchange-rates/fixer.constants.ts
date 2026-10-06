import type { ExchangeRateProvider } from "@/types";

export const FIXER_PROVIDER_LINKS: Record<ExchangeRateProvider, string> = {
  fixer: "https://fixer.io/product",
  apilayer: "https://apilayer.com/marketplace/fixer-api",
  exchangeapi: "https://github.com/fawazahmed0/exchange-api",
};

export const FIXER_PROVIDER_NAMES: Record<ExchangeRateProvider, string> = {
  fixer: "Fixer.io",
  apilayer: "APILayer",
  exchangeapi: "Exchange API",
};

/** exchange-api is free and keyless; the backend applies the same rule. */
export function providerRequiresApiKey(provider: ExchangeRateProvider): boolean {
  return provider !== "exchangeapi";
}
