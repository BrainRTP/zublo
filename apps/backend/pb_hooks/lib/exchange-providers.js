/// <reference path="../../pb_data/types.d.ts" />

/**
 * Fetches raw exchange rates from the user's configured provider.
 *
 * Returns { base, rates } where rates[X] is "units of X per 1 unit of base";
 * callers normalize it to the user's main currency. Throws an Error with a
 * message that is safe to show to the user when the provider fails.
 */

// Cloudflare Pages publishes the daily file first; jsDelivr caches @latest
// and lags up to a day, so it is only the fallback.
const EXCHANGE_API_URLS = [
  "https://latest.currency-api.pages.dev/v1/currencies/eur.min.json",
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json",
];

function errorMessage(err) {
  return err && err.message ? err.message : String(err);
}

function fetchFixerRates(provider, apiKey) {
  let url, headers;
  if (provider === "apilayer") {
    url = "https://api.apilayer.com/fixer/latest?base=EUR";
    headers = { apikey: apiKey };
  } else {
    url = "https://data.fixer.io/api/latest?access_key=" + apiKey;
    headers = {};
  }

  const res = $http.send({ url: url, method: "GET", headers: headers, timeout: 30 });

  // Fixer returns HTTP 200 even for errors, so the body is checked first.
  if (res.json && res.json.success === false) {
    throw new Error(
      res.json.error && res.json.error.info
        ? res.json.error.info
        : "Fixer error code " + (res.json.error && res.json.error.code),
    );
  }
  if (res.statusCode !== 200 || !res.json || !res.json.rates) {
    throw new Error("Exchange rate API failed (HTTP " + res.statusCode + ")");
  }

  return { base: "EUR", rates: res.json.rates };
}

function fetchExchangeApiRates() {
  const exchangeRates = require(__hooks + "/lib/pure/exchange-rates.js");

  let lastError = null;
  for (let i = 0; i < EXCHANGE_API_URLS.length; i++) {
    try {
      const res = $http.send({ url: EXCHANGE_API_URLS[i], method: "GET", timeout: 30 });
      if (res.statusCode === 200 && res.json && res.json.eur) {
        return { base: "EUR", rates: exchangeRates.upperCaseRates(res.json.eur) };
      }
      lastError = new Error("Exchange API failed (HTTP " + res.statusCode + ")");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function fetchRates(provider, apiKey) {
  try {
    if (provider === "exchangeapi") return fetchExchangeApiRates();
    return fetchFixerRates(provider, apiKey);
  } catch (err) {
    // Go errors from $http.send (DNS, TLS) are not JS Errors; unify them.
    throw new Error(errorMessage(err));
  }
}

module.exports = {
  fetchRates,
};
