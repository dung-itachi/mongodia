/**
 * Filter Date Range Component (Sprint 3 - Common UI Kit)
 */

import { DatePicker } from "antd";
import type { FilterItem } from "../types";

type DateRangeFilterItem = Extract<FilterItem, { type: "dateRange" }>;

type FilterDateRangeProps = {
  item: DateRangeFilterItem;
  value?: [string, string] | undefined;
  onChange: (value: [string, string] | undefined) => void;
};

const { RangePicker } = DatePicker;

export default function FilterDateRange({
  item,
  value,
  onChange,
}: FilterDateRangeProps) {
  return (
    <RangePicker
      value={
        value
          ? [
              value[0] ? undefined : undefined,
              value[1] ? undefined : undefined,
            ]
          : undefined
      }
      onChange={(dates) => {
        if (dates && dates[0] && dates[1]) {
          onChange([
            dates[0].format("YYYY-MM-DD"),
            dates[1].format("YYYY-MM-DD"),
          ]);
        } else {
          onChange(undefined);
        }
      }}
      placeholder={[item.label + " Từ", item.label + " Đến"]}
      style={{ width: 280 }}
    />
  );
}
