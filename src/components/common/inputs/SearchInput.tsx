/**
 * SearchInput Component (Sprint 3.1 - Complete UI Kit)
 */

import { Input } from "antd";

export type SearchInputProps = {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  allowClear?: boolean;
  size?: "small" | "middle" | "large";
  style?: React.CSSProperties;
};

const { Search } = Input;

export default function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  allowClear = true,
  size = "middle",
  style,
}: SearchInputProps) {
  return (
    <Search
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowClear={allowClear}
      size={size}
      style={{ width: 280, ...style }}
    />
  );
}
