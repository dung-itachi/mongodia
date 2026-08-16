/**
 * Marketing Lead Toolbar Component (Sprint 5.2, 8.5)
 *
 * Toolbar for debounced search, filters, and actions.
 * Sprint 8.5: Added "Đẩy sang Sale" button for bulk push.
 */

import { memo, useEffect, useState } from "react";
import { Button } from "antd";
import { ActionButton, FilterBar, SearchInput } from "@/components/common";
import { ReloadOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import type { MarketingLeadFilters } from "@/hooks/useMarketingLeads";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/constants/marketing";
import styles from "./marketing-input.module.css";

export type MarketingLeadToolbarProps = {
  filters: MarketingLeadFilters;
  onFiltersChange: (filters: MarketingLeadFilters) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onPushToSale: () => void;
  selectedCount: number;
  loading?: boolean;
  /** Label for the primary create button. Defaults to "Thêm Lead". */
  createLabel?: string;
};

function MarketingLeadToolbarInner({
  filters,
  onFiltersChange,
  onRefresh,
  onCreate,
  onPushToSale,
  selectedCount,
  loading,
  createLabel = "Thêm Lead",
}: MarketingLeadToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.keyword ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchValue !== (filters.keyword ?? "")) {
        onFiltersChange({ ...filters, keyword: searchValue, page: 1 });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [filters, onFiltersChange, searchValue]);

  const filterValues: Record<string, unknown> = {
    status: filters.status ?? "",
    source: filters.source ?? "",
  };

  return (
    <div className={styles["mi-toolbar"]}>
      <div className={styles["mi-toolbar-left"]}>
        <SearchInput
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Tìm kiếm tên, SĐT..."
          allowClear
          style={{ width: 240 }}
        />
        <FilterBar
          items={[
            {
              type: "select",
              key: "status",
              label: "Trạng thái",
              placeholder: "Trạng thái",
              options: [
                { value: "", label: "Tất cả trạng thái" },
                ...LEAD_STATUS_OPTIONS,
              ],
            },
            {
              type: "select",
              key: "source",
              label: "Nguồn",
              placeholder: "Nguồn",
              options: [
                { value: "", label: "Tất cả nguồn" },
                ...LEAD_SOURCE_OPTIONS,
              ],
            },
          ]}
          values={filterValues}
          onChange={(values) =>
            onFiltersChange({
              ...filters,
              status: typeof values.status === "string" ? values.status : undefined,
              source:
                typeof values.source === "string"
                  ? (values.source as MarketingLeadFilters["source"])
                  : undefined,
              page: 1,
            })
          }
          loading={loading}
        />
      </div>

      <div className={styles["mi-toolbar-right"]}>
        <ActionButton
          type="secondary"
          icon={<ReloadOutlined spin={loading} />}
          label="Làm mới"
          onClick={onRefresh}
          disabled={loading}
        />
        
        {/* Sprint 8.5: Push to Sale button */}
        {selectedCount > 0 && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onPushToSale}
            loading={loading}
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          >
            Đẩy sang Sale ({selectedCount})
          </Button>
        )}
        
        <ActionButton
          type="primary"
          icon={<PlusOutlined />}
          label={createLabel}
          onClick={onCreate}
        />
      </div>
    </div>
  );
}

const MarketingLeadToolbar = memo(MarketingLeadToolbarInner);
export default MarketingLeadToolbar;
