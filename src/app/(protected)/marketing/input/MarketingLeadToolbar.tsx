/**
 * Marketing Lead Toolbar Component (Sprint 5.2, 8.5, 8.x)
 *
 * Toolbar for debounced search, filters, and actions.
 * Sprint 8.5: Added "Đẩy sang Sale" button for bulk push.
 * Sprint 8.x: Added Team, MKT, and Area filters for /marketing/orders page.
 */

import { memo, useEffect, useState } from "react";
import { Button } from "antd";
import { ActionButton, FilterBar, SearchInput } from "@/components/common";
import { ReloadOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import type { MarketingLeadFilters } from "@/hooks/useMarketingLeads";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/constants/marketing";
import { useTeamsForMarketingDashboard, useMarketingEmployeesByTeam } from "@/hooks/useMarketingExpenseLookups";
import { useAreas } from "@/hooks/useAreas";
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
  /** Show Team and MKT filters (default: true) */
  showTeamFilters?: boolean;
  /** Show Area filter (default: true) - Sprint 8.x */
  showAreaFilter?: boolean;
};

function MarketingLeadToolbarInner({
  filters,
  onFiltersChange,
  onRefresh,
  onCreate,
  onPushToSale,
  selectedCount,
  loading,
  createLabel = "Thêm Khách hàng",
  showTeamFilters = true,
  showAreaFilter = true,
}: MarketingLeadToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.keyword ?? "");

  // Sprint 8.x: Team, MKT, and Area filter hooks
  const { teams, loading: teamsLoading } = useTeamsForMarketingDashboard();
  const { employees: mktEmployees, loading: mktLoading } = useMarketingEmployeesByTeam(
    showTeamFilters ? filters.teamId : undefined
  );
  const { areas, loading: areasLoading } = useAreas();

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
    teamId: filters.teamId ?? "",
    marketingEmployeeId: filters.marketingEmployeeId ?? "",
    areaId: filters.areaId ?? "",
  };

  const filterItems = [
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
  ];

  // Sprint 8.x: Add Team, MKT, and Area filters
  if (showTeamFilters) {
    filterItems.push(
      {
        type: "select",
        key: "areaId",
        label: "Khu vực",
        placeholder: "Khu vực",
        options: [
          { value: "", label: "Tất cả khu vực" },
          ...(areas ?? []).map((area) => ({ value: area._id, label: area.name })),
        ],
      },
      {
        type: "select",
        key: "teamId",
        label: "Team",
        placeholder: "Team",
        options: [
          { value: "", label: "Tất cả team" },
          ...teams,
        ],
      },
      {
        type: "select",
        key: "marketingEmployeeId",
        label: "MKT",
        placeholder: "MKT",
        options: [
          { value: "", label: "Tất cả MKT" },
          ...mktEmployees,
        ],
      }
    );
  }

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
          items={filterItems}
          values={filterValues}
          onChange={(values) =>
            onFiltersChange({
              ...filters,
              status: typeof values.status === "string" ? values.status : undefined,
              source:
                typeof values.source === "string"
                  ? (values.source as MarketingLeadFilters["source"])
                  : undefined,
              areaId: typeof values.areaId === "string" ? values.areaId : undefined,
              teamId: typeof values.teamId === "string" ? values.teamId : undefined,
              marketingEmployeeId:
                typeof values.marketingEmployeeId === "string"
                  ? values.marketingEmployeeId
                  : undefined,
              page: 1,
            })
          }
          loading={loading || teamsLoading || mktLoading || areasLoading}
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
