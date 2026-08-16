/**
 * Filter Date Range Component (Sprint 3 - Common UI Kit)
 */

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
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
  const rangeValue: [Dayjs, Dayjs] | undefined =
    value?.[0] && value?.[1]
      ? [dayjs(value[0]), dayjs(value[1])]
      : undefined;

  return (
    <RangePicker
      value={rangeValue}
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
