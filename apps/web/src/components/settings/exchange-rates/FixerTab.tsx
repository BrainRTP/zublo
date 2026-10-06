import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { useEffect,useState } from "react";
import { useTranslation } from "react-i18next";

import {
  FIXER_PROVIDER_LINKS,
  providerRequiresApiKey,
} from "@/components/settings/exchange-rates/fixer.constants";
import { FixerActions } from "@/components/settings/exchange-rates/FixerActions";
import { FixerApiKeyField } from "@/components/settings/exchange-rates/FixerApiKeyField";
import { FixerProviderSelect } from "@/components/settings/exchange-rates/FixerProviderSelect";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { fixerService } from "@/services/fixer";
import type { ExchangeRateProvider, FixerSettings } from "@/types";

export function FixerTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [removeStoredApiKey, setRemoveStoredApiKey] = useState(false);
  const [provider, setProvider] = useState<ExchangeRateProvider>("fixer");

  const { data: settings } = useQuery({
    queryKey: ["fixer_settings", user?.id ?? ""],
    queryFn: () => fixerService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  // Derived state: is there a key saved on the server?
  const isKeySavedOnServer = settings?.api_key_configured ?? false;
  const needsApiKey = providerRequiresApiKey(provider);

  useEffect(() => {
    if (settings) {
      setApiKey("");
      setRemoveStoredApiKey(false);
      setProvider(settings.provider || "fixer");
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => {
      const trimmedApiKey = apiKey.trim();
      const hasEffectiveApiKey =
        !removeStoredApiKey && (trimmedApiKey.length > 0 || isKeySavedOnServer);

      const payload: Partial<FixerSettings> = {
        provider,
        enabled: needsApiKey ? hasEffectiveApiKey : true,
        user: user!.id,
      };

      // A keyless provider leaves any stored key untouched for switching back.
      if (!needsApiKey) {
        return settings?.id
          ? fixerService.updateSettings(settings.id, payload)
          : fixerService.createSettings(payload);
      }

      // API Key Logic:
      // 1. Explicitly requested removal
      if (removeStoredApiKey) {
        payload.api_key = "";
      }
      // 2. User typed a new key
      else if (trimmedApiKey) {
        payload.api_key = trimmedApiKey;
      }
      // 3. Updating an existing record where no key is currently saved
      else if (!isKeySavedOnServer) {
        payload.api_key = "";
      }
      // 4. Otherwise (isKeySavedOnServer === true and trimmedApiKey is empty):
      //    Do NOT include api_key in 'payload' so the server keeps the existing value.
      // api_key_configured is derived server-side (security.pb.js) from api_key.

      return settings?.id
        ? fixerService.updateSettings(settings.id, payload)
        : fixerService.createSettings(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixer_settings", user?.id ?? ""] });
      setApiKey("");
      setRemoveStoredApiKey(false);
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateRatesMut = useMutation({
    mutationFn: () => fixerService.updateRates(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      toast.success(t("update_exchange") + ` (${data.updated})`);
    },
    onError: (err: Error) => toast.error(err.message || t("error")),
  });

  const savedKeyless = !!settings && !providerRequiresApiKey(settings.provider || "fixer");
  const canSave =
    !needsApiKey || removeStoredApiKey || apiKey.trim().length > 0 || isKeySavedOnServer;
  const canUpdateRates = needsApiKey
    ? !removeStoredApiKey && (isKeySavedOnServer || apiKey.trim().length > 0)
    : savedKeyless;
  const ratesConfigured = needsApiKey
    ? isKeySavedOnServer && !removeStoredApiKey
    : savedKeyless;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          {t("fixer_api")}
        </h2>
        <p className="text-muted-foreground">{t("convert_currency_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-6 ">
        <FixerProviderSelect provider={provider} onProviderChange={setProvider} />

        {needsApiKey ? (
          <FixerApiKeyField
            apiKey={apiKey}
            apiKeyConfigured={isKeySavedOnServer}
            provider={provider}
            providerLink={FIXER_PROVIDER_LINKS[provider]}
            removeStoredApiKey={removeStoredApiKey}
            onApiKeyChange={(value) => {
              setApiKey(value);
              setRemoveStoredApiKey(false);
            }}
            onRemoveStoredApiKey={() => {
              setApiKey("");
              setRemoveStoredApiKey(true);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("exchangeapi_hint")}{" "}
            <a
              href={FIXER_PROVIDER_LINKS[provider]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
          </p>
        )}

        <FixerActions
          canSave={canSave}
          canUpdateRates={canUpdateRates}
          saving={saveMut.isPending}
          updatingRates={updateRatesMut.isPending}
          onSave={() => saveMut.mutate()}
          onUpdateRates={() => updateRatesMut.mutate()}
        />

        {ratesConfigured && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            {t("fixer_configured_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
