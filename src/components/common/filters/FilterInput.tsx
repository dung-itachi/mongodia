/**
 * Filter Input Component (Sprint 3 - Common UI Kit)
 */

import { Input } from "antd";
import type { FilterItem } from "../types";

type InputFilterItem = Extract<FilterItem, { type: "input" }>;

type FilterInputProps = {
  item: InputFilterItem;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
};

export default function FilterInput({
  item,
  value,
  onChange,
}: FilterInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={item.placeholder || item.label}
      style={{ width: 200 }}
    />
  );
}
