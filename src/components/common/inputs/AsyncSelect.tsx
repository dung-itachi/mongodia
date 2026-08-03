/**
 * AsyncSelect Component (Sprint 3.1 - Complete UI Kit)
 *
 * Select component ready for API search.
 * Does NOT call API - just provides the interface.
 */

import { Select, Spin } from "antd";
import { useState, useCallback } from "react";

export type SelectOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

export type AsyncSelectProps = {
  value?: string | number | undefined;
  onChange?: (value: string | number | undefined) => void;
  options?: SelectOption[];
  placeholder?: string;
  /** Enable search mode */
  searchable?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Allow clear */
  allowClear?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Mode: single or multiple */
  mode?: "multiple" | "tags";
  /** Style */
  style?: React.CSSProperties;
  /** Minimum characters before search */
  minSearchChars?: number;
  /** onSearch callback - implement API call in parent */
  onSearch?: (value: string) => void;
  /** Maximum number of options */
  maxCount?: number;
};

export default function AsyncSelect({
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  searchable = false,
  loading = false,
  allowClear = true,
  disabled = false,
  mode,
  style,
  minSearchChars = 0,
  onSearch,
  maxCount = 100,
}: AsyncSelectProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = useCallback(
    (val: string) => {
      setSearchValue(val);
      if (searchable && val.length >= minSearchChars && onSearch) {
        onSearch(val);
      }
    },
    [searchable, minSearchChars, onSearch]
  );

  const handleChange = useCallback(
    (val: string | number | undefined) => {
      onChange?.(val);
    },
    [onChange]
  );

  const displayOptions = options.slice(0, maxCount);

  return (
    <Select
      value={value}
      onChange={handleChange}
      onSearch={searchable ? handleSearch : undefined}
      showSearch={searchable}
      filterOption={
        searchable
          ? false // Let parent handle search via onSearch
          : undefined
      }
      options={displayOptions}
      placeholder={placeholder}
      loading={loading}
      allowClear={allowClear}
      disabled={disabled}
      mode={mode}
      style={{ width: "100%", ...style }}
      notFoundContent={loading ? <Spin size="small" /> : "Không có dữ liệu"}
    />
  );
}
