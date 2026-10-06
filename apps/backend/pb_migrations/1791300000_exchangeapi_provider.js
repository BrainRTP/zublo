/// <reference path="../pb_data/types.d.ts" />

/**
 * Adds exchange-api (github.com/fawazahmed0/exchange-api) as an exchange
 * rate provider. It is free and needs no key, so fixer_settings.api_key stays
 * empty for it.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");
    for (const field of col.fields) {
      if (field.name !== "provider") continue;

      // field.values is a Go slice; copy it into a plain array before editing.
      const values = [];
      for (let i = 0; i < field.values.length; i++) values.push(field.values[i]);
      if (values.indexOf("exchangeapi") === -1) values.push("exchangeapi");
      field.values = values;
    }
    app.save(col);
  },
  (app) => {
    // Records still pointing at exchange-api would fail validation on their
    // next save, so they fall back to the default provider before the value goes.
    const records = app.findRecordsByFilter("fixer_settings", "provider = 'exchangeapi'", "", 0, 0);
    for (const record of records) {
      record.set("provider", "fixer");
      record.set("enabled", false);
      app.save(record);
    }

    const col = app.findCollectionByNameOrId("fixer_settings");
    for (const field of col.fields) {
      if (field.name !== "provider") continue;

      const values = [];
      for (let i = 0; i < field.values.length; i++) {
        if (field.values[i] !== "exchangeapi") values.push(field.values[i]);
      }
      field.values = values;
    }
    app.save(col);
  },
);
