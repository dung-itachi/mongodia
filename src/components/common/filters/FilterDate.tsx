/**
 * Filter Date Component (Sprint 3 - Common UI Kit)
 */

import { DatePicker } from "antd";
import type { FilterItem } from "../types";

type DateFilterItem = Extract<FilterItem, { type: "date" }>;

type FilterDateProps = {
  item: DateFilterItem;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
};

export default function FilterDate({
  item,
  value,
  onChange,
}: FilterDateProps) {
  return (
    <DatePicker
      onChange={(date) => {
        if (date) {
          onChange(date.format("YYYY-MM-DD"));
        } else {
          onChange(undefined);
        }
      }}
      placeholder={item.label}
      style={{ width: 160 }}
    />
  );
}
