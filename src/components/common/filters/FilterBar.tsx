/**
 * FilterBar Component (Sprint 3.1 - Complete UI Kit)
 *
 * Render multiple filter controls.
 */

import { FilterItem } from "../types";
import FilterSelect from "./FilterSelect";
import FilterDate from "./FilterDate";
import FilterDateRange from "./FilterDateRange";
import FilterInput from "./FilterInput";

export type FilterBarProps = {
  items: FilterItem[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  loading?: boolean;
};

export default function FilterBar({
  items,
  values,
  onChange,
  loading: _loading,
}: FilterBarProps) {
  const handleValueChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  const renderFilterItem = (item: FilterItem) => {
    switch (item.type) {
      case "select":
        return (
          <FilterSelect
            key={item.key}
            item={item}
            value={values[item.key] as string | number | undefined}
            onChange={(val: string | number | undefined) =>
              handleValueChange(item.key, val)
            }
          />
        );
      case "date":
        return (
          <FilterDate
            key={item.key}
            item={item}
            value={values[item.key] as string | undefined}
            onChange={(val: string | undefined) =>
              handleValueChange(item.key, val)
            }
          />
        );
      case "dateRange":
        return (
          <FilterDateRange
            key={item.key}
            item={item}
            value={values[item.key] as [string, string] | undefined}
            onChange={(val: [string, string] | undefined) =>
              handleValueChange(item.key, val)
            }
          />
        );
      case "input":
        return (
          <FilterInput
            key={item.key}
            item={item}
            value={values[item.key] as string | undefined}
            onChange={(val: string | undefined) =>
              handleValueChange(item.key, val)
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {items.map(renderFilterItem)}
    </div>
  );
}