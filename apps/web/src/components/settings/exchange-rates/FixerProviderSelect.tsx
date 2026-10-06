import { useTranslation } from "react-i18next";

import { FIXER_PROVIDER_NAMES } from "@/components/settings/exchange-rates/fixer.constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExchangeRateProvider } from "@/types";

interface FixerProviderSelectProps {
  provider: ExchangeRateProvider;
  onProviderChange: (value: ExchangeRateProvider) => void;
}

export function FixerProviderSelect({
  provider,
  onProviderChange,
}: FixerProviderSelectProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{t("fixer_provider")}</label>
      <Select value={provider} onValueChange={onProviderChange}>
        <SelectTrigger className="rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {(Object.keys(FIXER_PROVIDER_NAMES) as ExchangeRateProvider[]).map((value) => (
            <SelectItem key={value} value={value}>
              {FIXER_PROVIDER_NAMES[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
