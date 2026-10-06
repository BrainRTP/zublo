const providers = require("../../pb_hooks/lib/exchange-providers.js");

const CLOUDFLARE = "https://latest.currency-api.pages.dev/v1/currencies/eur.min.json";
const JSDELIVR = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json";

beforeEach(() => {
  globalThis.$http = { send: vi.fn() };
  globalThis.__hooks = require("node:path").join(__dirname, "../../pb_hooks");
});

afterEach(() => {
  for (const key of ["$http", "__hooks"]) Reflect.deleteProperty(globalThis, key);
});

describe("pb_hooks/lib/exchange-providers.js", () => {
  describe("fixer and apilayer", () => {
    it("fetches EUR-based rates from Fixer.io by default", () => {
      globalThis.$http.send.mockReturnValue({ statusCode: 200, json: { success: true, rates: { USD: 1.1 } } });

      expect(providers.fetchRates("fixer", "key-1")).toEqual({ base: "EUR", rates: { USD: 1.1 } });
      expect(globalThis.$http.send).toHaveBeenCalledWith(expect.objectContaining({
        url: "https://data.fixer.io/api/latest?access_key=key-1",
        method: "GET",
      }));
    });

    it("sends the APILayer key as a header", () => {
      globalThis.$http.send.mockReturnValue({ statusCode: 200, json: { rates: { USD: 1.1 } } });

      providers.fetchRates("apilayer", "key-2");
      expect(globalThis.$http.send).toHaveBeenCalledWith(expect.objectContaining({
        url: "https://api.apilayer.com/fixer/latest?base=EUR",
        headers: { apikey: "key-2" },
      }));
    });

    it("surfaces Fixer errors reported with HTTP 200", () => {
      globalThis.$http.send.mockReturnValue({ statusCode: 200, json: { success: false, error: { info: "Invalid key" } } });
      expect(() => providers.fetchRates("fixer", "bad")).toThrow("Invalid key");

      globalThis.$http.send.mockReturnValue({ statusCode: 200, json: { success: false, error: { code: 101 } } });
      expect(() => providers.fetchRates("fixer", "bad")).toThrow("Fixer error code 101");
    });

    it("rejects non-200 responses and bodies without rates", () => {
      globalThis.$http.send.mockReturnValue({ statusCode: 503, json: null });
      expect(() => providers.fetchRates("fixer", "k")).toThrow("Exchange rate API failed (HTTP 503)");
    });
  });

  describe("exchangeapi", () => {
    it("reads EUR-based rates from Cloudflare without a key", () => {
      globalThis.$http.send.mockReturnValue({ statusCode: 200, json: { date: "2026-10-06", eur: { usd: 1.12, rub: 95.1, eur: 1 } } });

      expect(providers.fetchRates("exchangeapi", "")).toEqual({
        base: "EUR",
        rates: { USD: 1.12, RUB: 95.1, EUR: 1 },
      });
      expect(globalThis.$http.send).toHaveBeenCalledTimes(1);
      expect(globalThis.$http.send.mock.calls[0][0].url).toBe(CLOUDFLARE);
    });

    it("falls back to jsDelivr when Cloudflare fails or answers without rates", () => {
      globalThis.$http.send
        .mockReturnValueOnce({ statusCode: 200, json: {} })
        .mockReturnValueOnce({ statusCode: 200, json: { eur: { usd: 1.1 } } });
      expect(providers.fetchRates("exchangeapi", "").rates).toEqual({ USD: 1.1 });
      expect(globalThis.$http.send.mock.calls[1][0].url).toBe(JSDELIVR);

      globalThis.$http.send = vi.fn()
        .mockImplementationOnce(() => { throw new Error("dial tcp: timeout"); })
        .mockReturnValueOnce({ statusCode: 200, json: { eur: { usd: 1.2 } } });
      expect(providers.fetchRates("exchangeapi", "").rates).toEqual({ USD: 1.2 });
    });

    it("reports the last failure when both mirrors fail", () => {
      globalThis.$http.send
        .mockImplementationOnce(() => { throw new Error("dial tcp: timeout"); })
        .mockReturnValueOnce({ statusCode: 404, json: null });

      expect(() => providers.fetchRates("exchangeapi", "")).toThrow("Exchange API failed (HTTP 404)");
    });
  });

  it("wraps transport errors that are not JS Errors", () => {
    globalThis.$http.send = vi.fn(() => { throw "x509: certificate signed by unknown authority"; });

    expect(() => providers.fetchRates("fixer", "k")).toThrow("x509: certificate signed by unknown authority");
  });
});
