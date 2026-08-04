/**
 * Marketing Lead Toolbar Component (Sprint 5.2 — Marketing Input)
 *
 * Toolbar for debounced search, filters, and actions.
 */

import { memo, useEffect, useState } from "react";
import { ActionButton, FilterBar, SearchInput } from "@/components/common";
import { ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { MarketingLeadFilters } from "@/hooks/useMarketingLeads";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/constants/marketing";
import styles from "./marketing-input.module.css";

export type MarketingLeadToolbarProps = {
  filters: MarketingLeadFilters;
  onFiltersChange: (filters: MarketingLeadFilters) => void;
  onRefresh: () => void;
  onCreate: () => void;
  loading?: boolean;
};

function MarketingLeadToolbarInner({
  filters,
  onFiltersChange,
  onRefresh,
  onCreate,
  loading,
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
        <ActionButton
          type="primary"
          icon={<PlusOutlined />}
          label="Thêm Lead"
          onClick={onCreate}
        />
      </div>
    </div>
  );
}

const MarketingLeadToolbar = memo(MarketingLeadToolbarInner);
export default MarketingLeadToolbar;
