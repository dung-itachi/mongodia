/**
 * Filter Input Component (Sprint 3 - Common UI Kit)
 */

import { Input } from "antd";
import type { FilterItem } from "../types";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

type InputFilterItem = Extract<FilterItem, { type: "input" }>;

type FilterInputProps = {
  item: InputFilterItem;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
};

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export default function FilterInput({
  item,
  value,
  onChange,
}: FilterInputProps) {
  const placeholder = item.placeholder || getTranslated(item.label);

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={placeholder}
      style={{ width: 200 }}
    />
  );
}
