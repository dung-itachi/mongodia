/**
 * Filter Select Component (Sprint 3 - Common UI Kit)
 */

import { Select } from "antd";
import type { FilterItem } from "../types";

type SelectFilterItem = Extract<FilterItem, { type: "select" }>;

type FilterSelectProps = {
  item: SelectFilterItem;
  value?: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
};

export default function FilterSelect({
  item,
  value,
  onChange,
}: FilterSelectProps) {
  return (
    <div style={{ minWidth: 160 }}>
      <Select
        value={value}
        onChange={onChange}
        placeholder={item.placeholder || item.label}
        allowClear
        style={{ width: "100%" }}
        mode={item.multiple ? "multiple" : undefined}
        options={item.options}
      />
    </div>
  );
}
