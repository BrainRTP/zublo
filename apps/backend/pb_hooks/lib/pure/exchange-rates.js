/**
 * Rates map convention used across Zublo: rates[X] is "how many units of X
 * per 1 unit of the base currency". Fixer/APILayer free plans and
 * exchange-api all answer in EUR; the base is passed explicitly anyway.
 */
function normalizeRatesByMainCurrency(baseRates, mainCode, currencyCodes, baseCode) {
  const rates = Object.assign({}, baseRates || {});
  rates[baseCode || "EUR"] = 1;

  const mainRate = rates[mainCode];
  if (!mainRate) {
    throw new Error("Main currency '" + mainCode + "' was not found in the API response.");
  }

  const normalized = {};
  for (let index = 0; index < currencyCodes.length; index++) {
    const code = currencyCodes[index];
    if (code === mainCode) {
      normalized[code] = 1;
    } else if (rates[code] !== undefined) {
      normalized[code] = rates[code] / mainRate;
    }
  }

  return normalized;
}

// exchange-api (fawazahmed0) is free and needs no key.
function providerRequiresApiKey(provider) {
  return provider !== "exchangeapi";
}

// exchange-api uses lowercase codes and mixes in crypto tokens; keep only
// positive numeric rates under ISO-style uppercase codes.
function upperCaseRates(rates) {
  const result = {};
  const source = rates || {};
  Object.keys(source).forEach(function (code) {
    const value = source[code];
    if (typeof value === "number" && value > 0) result[code.toUpperCase()] = value;
  });
  return result;
}

module.exports = {
  normalizeRatesByMainCurrency,
  providerRequiresApiKey,
  upperCaseRates,
};
