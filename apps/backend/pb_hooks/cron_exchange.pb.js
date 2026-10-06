/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// CRON 2: Update Exchange Rates (twice daily at 00:00 and 12:00)
//
// Providers answer in EUR (Fixer.io and APILayer free plans, exchange-api).
// Rates are normalized to each user's main currency:
//   stored_rate[X] = baseRates[X] / baseRates[mainCode]
// ================================================================
cronAdd("updateExchange", "0 0,12 * * *", () => {
  const exchangeRates = require(__hooks + "/lib/pure/exchange-rates.js");
  const exchangeProviders = require(__hooks + "/lib/exchange-providers.js");

  // Fetch settings first and validate the persisted secret in JavaScript rather
  // than filtering on the secret itself.
  const fixerRecords = $app.findRecordsByFilter("fixer_settings", "1=1", "", 0, 0);

  for (const fixer of fixerRecords) {
    const apiKey = fixer.get("api_key");
    const provider = fixer.get("provider") || "fixer";
    // Skip records where a key-based provider has no key stored yet
    if (exchangeRates.providerRequiresApiKey(provider) && !String(apiKey || "").trim()) continue;
    const userId = fixer.get("user");

    // Use is_main flag as authoritative source — user.main_currency may be stale
    const mainCurrencies = $app.findRecordsByFilter("currencies", "user = {:u} && is_main = true", "", 1, 0, { u: userId });
    if (mainCurrencies.length === 0) continue;
    const mainCode = mainCurrencies[0].get("code");

    try {
      const currencies = $app.findRecordsByFilter(
        "currencies", "user = {:u}", "", 0, 0, { u: userId }
      );
      const currencyCodes = currencies.map((cur) => cur.get("code"));
      const fetched = exchangeProviders.fetchRates(provider, apiKey);

      let normalizedRates;
      try {
        normalizedRates = exchangeRates.normalizeRatesByMainCurrency(
          fetched.rates, mainCode, currencyCodes, fetched.base
        );
      } catch (_) {
        console.log("[Zublo] updateExchange: unknown main currency '" + mainCode + "' for user " + userId);
        continue;
      }

      for (const cur of currencies) {
        const rate = normalizedRates[cur.get("code")];
        if (rate !== undefined) {
          cur.set("rate", rate);
          $app.save(cur);
        }
      }

      try {
        const logs = $app.findRecordsByFilter("exchange_log", "", "", 1, 0);
        if (logs.length > 0) {
          logs[0].set("last_update", new Date().toISOString());
          $app.save(logs[0]);
        } else {
          const logCol = $app.findCollectionByNameOrId("exchange_log");
          const logRecord = new Record(logCol);
          logRecord.set("last_update", new Date().toISOString());
          $app.save(logRecord);
        }
      } catch (_) {}

      console.log("[Zublo] updateExchange: updated rates for user " + userId + " (provider: " + provider + ", base: " + mainCode + ")");
    } catch (err) {
      console.log("[Zublo] updateExchange error:", err);
    }
  }
});
