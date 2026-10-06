/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: Update exchange rates for the authenticated user
// POST /api/fixer/update
//
// Providers answer in EUR (Fixer.io and APILayer free plans, exchange-api).
// The rates are normalized to the user's main currency so existing
// conversion formulas keep working:
//
//   stored_rate[X] = base_rates[X] / base_rates[mainCode]
//
// This means: "how many units of X per 1 unit of main currency".
// Conversion in UI: price_in_main = price_in_X / stored_rate[X]
//
// NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
// reliably available inside router callbacks. Require helpers inside
// each callback so the runtime can always resolve them at request time.
// ================================================================
routerAdd("POST", "/api/fixer/update", (e) => {
  const exchangeRates = require(__hooks + "/lib/pure/exchange-rates.js");
  const exchangeProviders = require(__hooks + "/lib/exchange-providers.js");
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  // Load fixer settings for this user.
  // Load by owner and validate the persisted secret in JavaScript. This also
  // avoids filtering on the secret itself.
  const fixerCandidates = $app.findRecordsByFilter(
    "fixer_settings", "user = {:u}", "", 1, 0, { u: userId }
  );
  const fixer = fixerCandidates[0];
  const apiKey = fixer ? fixer.get("api_key") : "";
  const provider = (fixer && fixer.get("provider")) || "fixer";
  if (!fixer || (exchangeRates.providerRequiresApiKey(provider) && !String(apiKey || "").trim())) {
    return e.json(400, { error: "No exchange rate API key configured." });
  }

  // Resolve the user's main currency code via is_main flag (authoritative)
  const mainCurrencies = $app.findRecordsByFilter("currencies", "user = {:u} && is_main = true", "", 1, 0, { u: userId });
  if (mainCurrencies.length === 0) {
    return e.json(400, { error: "No main currency set." });
  }
  const mainCode = mainCurrencies[0].get("code");

  const currencies = $app.findRecordsByFilter("currencies", "user = {:u}", "", 0, 0, { u: userId });
  const currencyCodes = currencies.map(function (record) { return record.get("code"); });

  let fetched;
  try {
    fetched = exchangeProviders.fetchRates(provider, apiKey);
  } catch (err) {
    return e.json(502, { error: err.message });
  }

  let normalizedRates;
  try {
    normalizedRates = exchangeRates.normalizeRatesByMainCurrency(
      fetched.rates,
      mainCode,
      currencyCodes,
      fetched.base
    );
  } catch (_) {
    return e.json(400, {
      error: "Main currency '" + mainCode + "' was not found in the API response. " +
             "Make sure you have the correct currency code (e.g. BRL, USD, EUR)."
    });
  }
  let updated = 0;

  for (let i = 0; i < currencies.length; i++) {
    const code = currencies[i].get("code");
    if (normalizedRates[code] !== undefined) {
      currencies[i].set("rate", normalizedRates[code]);
      $app.save(currencies[i]);
      updated++;
    }
  }

  // Update exchange_log
  try {
    const logs = $app.findRecordsByFilter("exchange_log", "", "", 1, 0);
    if (logs.length > 0) {
      logs[0].set("last_update", new Date().toISOString());
      logs[0].set("provider", provider);
      logs[0].set("status", "success");
      $app.save(logs[0]);
    } else {
      const lc = $app.findCollectionByNameOrId("exchange_log");
      const lr = new Record(lc);
      lr.set("last_update", new Date().toISOString());
      lr.set("provider", provider);
      lr.set("status", "success");
      $app.save(lr);
    }
  } catch (_) {}

  return e.json(200, { updated: updated, base: mainCode });
});
