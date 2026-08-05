/**
 * Marketing Expense Toolbar (Sprint 6.9 — Marketing Expense List UI)
 * Sprint 6.10 — Added Facebook Page & Marketing Employee filters + Drawer support
 *
 * Gồm: SearchInput (debounce 500ms), FilterBar (Status / FB Page / MKT Employee / DateRange),
 * và nút "Tạo mới" (mở Drawer).
 */

import { Button, Space } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { FilterItem } from "@/components/common/types";

import FilterBar from "@/components/common/filters/FilterBar";
import SearchInput from "@/components/common/inputs/SearchInput";
import PermissionGate from "@/components/common/PermissionGate";

import type { MarketingExpenseFilter } from "@/hooks/useMarketingExpenses";
import { useFacebookPages, useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";

interface MarketingExpenseToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  filters: Partial<MarketingExpenseFilter>;
  onFiltersChange: (filters: Partial<MarketingExpenseFilter>) => void;
  loading?: boolean;
  onRefresh?: () => void;
  onCreate?: () => void;
}

export default function MarketingExpenseToolbar({
  keyword,
  onKeywordChange,
  filters,
  onFiltersChange,
  loading,
  onRefresh,
  onCreate,
}: MarketingExpenseToolbarProps) {
  const { pages } = useFacebookPages();
  const { employees } = useMarketingEmployees();

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onKeywordChange(e.target.value);
  };

  const handleFilterChange = (values: Record<string, unknown>) => {
    const dateRange = values.dateRange as [string, string] | undefined;
    const rawStatus = (values.status as string) || undefined;
    const rawFacebookPage = (values.facebookPage as string) || undefined;
    const rawEmployee = (values.marketingEmployee as string) || undefined;

    onFiltersChange({
      ...filters,
      status: rawStatus as MarketingExpenseFilter["status"],
      facebookPageId: rawFacebookPage || undefined,
      marketingEmployeeId: rawEmployee || undefined,
      dateFrom: dateRange?.[0],
      dateTo: dateRange?.[1],
    });
  };

  const filterItems: FilterItem[] = [
    {
      type: "select",
      key: "status",
      label: "Trạng thái",
      options: [
        { label: "Tất cả", value: "" },
        { label: "Nháp", value: "DRAFT" },
        { label: "Đã khóa", value: "LOCKED" },
        { label: "Đã mở lại", value: "REOPENED" },
      ],
      placeholder: "Chọn trạng thái",
    },
    {
      type: "select",
      key: "facebookPage",
      label: "Facebook Page",
      options: [
        { label: "Tất cả", value: "" },
        ...pages.map((p) => ({ label: p.label, value: p.value })),
      ],
      placeholder: "Chọn Facebook Page",
    },
    {
      type: "select",
      key: "marketingEmployee",
      label: "Nhân viên Marketing",
      options: [
        { label: "Tất cả", value: "" },
        ...employees.map((e) => ({ label: e.label, value: e.value })),
      ],
      placeholder: "Chọn nhân viên",
    },
    {
      type: "dateRange",
      key: "dateRange",
      label: "Ngày báo cáo",
    },
  ];

  return (
    <div className="me-toolbar">
      <div className="me-toolbar-left">
        <SearchInput
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="Tìm kiếm ghi chú..."
          allowClear
        />
        <FilterBar
          items={filterItems}
          values={{
            status: filters.status ?? "",
            facebookPage: filters.facebookPageId ?? "",
            marketingEmployee: filters.marketingEmployeeId ?? "",
            dateRange: filters.dateFrom && filters.dateTo
              ? [filters.dateFrom, filters.dateTo]
              : undefined,
          }}
          onChange={handleFilterChange}
          loading={loading}
        />
      </div>

      <div className="me-toolbar-right">
        <Space>
          {onRefresh && (
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={onRefresh}
              disabled={loading}
            >
              Làm mới
            </Button>
          )}
          <PermissionGate permission="marketing-expense.create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreate}
            >
              Tạo mới
            </Button>
          </PermissionGate>
        </Space>
      </div>
    </div>
  );
}
