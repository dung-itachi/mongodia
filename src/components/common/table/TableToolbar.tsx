/**
 * TableToolbar Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard toolbar for data tables.
 */

import { Button, Space } from "antd";
import { ReloadOutlined, ExportOutlined } from "@ant-design/icons";
import { ReactNode } from "react";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

/**
 * Get translated text synchronously (for default props)
 */
function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export type TableToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  selectedCount?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  loading?: boolean;
};

export default function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  actions,
  selectedCount,
  onRefresh,
  onExport,
  onFilter,
  loading,
}: TableToolbarProps) {
  const defaultPlaceholder = searchPlaceholder ?? getTranslated("Tìm kiếm...");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <Space>
        <input
          type="text"
          value={searchValue || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={defaultPlaceholder}
          style={{
            width: 280,
            height: 32,
            padding: "0 12px",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            outline: "none",
          }}
        />
        {onFilter && (
          <Button onClick={onFilter}>{getTranslated("Tìm kiếm")}</Button>
        )}
        {onRefresh && (
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            disabled={loading}
          >
            {getTranslated("Làm mới")}
          </Button>
        )}
        {onExport && (
          <Button icon={<ExportOutlined />}>{getTranslated("Xuất kho")}</Button>
        )}
      </Space>

      <Space>
        {selectedCount !== undefined && selectedCount > 0 && (
          <span style={{ color: "#8c8c8c" }}>
            {getTranslated("Đã chọn")}: {selectedCount}
          </span>
        )}
        {actions}
      </Space>
    </div>
  );
}
