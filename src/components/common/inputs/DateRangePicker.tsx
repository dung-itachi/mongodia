/**
 * DateRangePicker Component (Sprint 3.1 - Complete UI Kit)
 *
 * Date range picker with preset options.
 */

import { DatePicker, Button, Space } from "antd";

const { RangePicker } = DatePicker;

export type DatePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisWeek"
  | "thisMonth"
  | "custom";

export type DateRangePickerProps = {
  value?: [string, string] | undefined;
  onChange?: (value: [string, string] | undefined) => void;
  showPresets?: boolean;
  format?: string;
};

const presetLabels: Record<string, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  last7days: "7 ngày gần nhất",
  last30days: "30 ngày gần nhất",
};

const calculateRange = (preset: DatePreset): [string, string] | undefined => {
  const today = new Date();
  let start: Date;
  const end = today;

  switch (preset) {
    case "today":
      start = today;
      break;
    case "yesterday":
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      break;
    case "last7days":
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case "last30days":
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    default:
      return undefined;
  }

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  return [formatDate(start), formatDate(end)];
};

export default function DateRangePicker({
  value,
  onChange,
  showPresets = true,
  format = "DD/MM/YYYY",
}: DateRangePickerProps) {
  const handleChange = (dates: unknown, dateStrings: [string, string]) => {
    if (dates && dateStrings[0] && dateStrings[1]) {
      onChange?.([dateStrings[0], dateStrings[1]]);
    } else {
      onChange?.(undefined);
    }
  };

  const handlePresetClick = (preset: DatePreset) => {
    const range = calculateRange(preset);
    if (range) {
      onChange?.(range);
    }
  };

  return (
    <Space.Compact>
      {showPresets && (
        <>
          <Button onClick={() => handlePresetClick("today")}>
            {presetLabels.today}
          </Button>
          <Button onClick={() => handlePresetClick("yesterday")}>
            {presetLabels.yesterday}
          </Button>
          <Button onClick={() => handlePresetClick("last7days")}>
            {presetLabels.last7days}
          </Button>
          <Button onClick={() => handlePresetClick("last30days")}>
            {presetLabels.last30days}
          </Button>
        </>
      )}
      <RangePicker
        onChange={handleChange as (dates: unknown, dateStrings: [string, string]) => void}
        format={format}
      />
    </Space.Compact>
  );
}