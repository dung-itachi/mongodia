"use client";

/**
 * MarketingDashboardAdvancedFilters Component (Sprint 7.3 — Drill-down & Export)
 *
 * Advanced filter bar for Marketing Dashboard.
 * Filters: Date Range, Facebook Page, Marketing Employee, Campaign, Source, Status.
 *
 * Shared filter state managed via callback - parent holds state.
 */

import { memo } from "react";
import { DatePicker, Select, Space, Button, Divider } from "antd";
import {
  FilterOutlined,
  CalendarOutlined,
  FacebookOutlined,
  UserOutlined,
  FlagOutlined,
  ClusterOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type {
  MarketingDashboardFilter,
  DateRange,
} from "@/types/marketing-dashboard-filter";
import type { LeadStatus } from "@/constants/leadStatus";
import type { LeadSource } from "@/constants/leadSource";
import { LEAD_SOURCE_OPTIONS } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS } from "@/constants/leadStatus";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./marketing.module.css";

const { RangePicker } = DatePicker;

export type MarketingDashboardAdvancedFiltersProps = {
  filter: MarketingDashboardFilter;
  onFilterChange: (filter: MarketingDashboardFilter) => void;
  facebookPageOptions: { value: string; label: string }[];
  employeeOptions: { value: string; label: string }[];
  campaignOptions: { value: string; label: string }[];
  loading?: boolean;
};

function MarketingDashboardAdvancedFiltersInner({
  filter,
  onFilterChange,
  facebookPageOptions,
  employeeOptions,
  campaignOptions,
  loading,
}: MarketingDashboardAdvancedFiltersProps) {
  const lang = useLanguageStore((s) => s.language);

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      onFilterChange({ ...filter, dateRange: undefined });
      return;
    }
    const dateRange: DateRange = {
      startDate: dates[0].format("YYYY-MM-DD"),
      endDate: dates[1].format("YYYY-MM-DD"),
    };
    onFilterChange({ ...filter, dateRange });
  };

  const handleFacebookPageChange = (value: string | undefined) => {
    onFilterChange({ ...filter, facebookPageId: value || undefined });
  };

  const handleEmployeeChange = (value: string | undefined) => {
    onFilterChange({ ...filter, marketingEmployeeId: value || undefined });
  };

  const handleCampaignChange = (value: string | undefined) => {
    onFilterChange({ ...filter, campaignId: value || undefined });
  };

  const handleSourceChange = (value: LeadSource | undefined) => {
    onFilterChange({ ...filter, source: value || undefined });
  };

  const handleStatusChange = (value: LeadStatus | undefined) => {
    onFilterChange({ ...filter, status: value || undefined });
  };

  const handleClearFilters = () => {
    onFilterChange({ period: filter.period });
  };

  const hasActiveFilters = Boolean(
    filter.dateRange ||
      filter.facebookPageId ||
      filter.marketingEmployeeId ||
      filter.campaignId ||
      filter.source ||
      filter.status
  );

  const statusOptions = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({
    value: value as LeadStatus,
    label,
  }));

  return (
    <div className={styles["mk-adv-filters"]}>
      <div className={styles["mk-adv-filters-header"]}>
        <FilterOutlined />
        <span>{t("Bộ lọc nâng cao", lang)}</span>
      </div>

      <div className={styles["mk-adv-filters-body"]}>
        <Space wrap size={12}>
          {/* Date Range */}
          <div className={styles["mk-adv-filter-item"]}>
            <CalendarOutlined className={styles["mk-adv-filter-icon"]} />
            <RangePicker
              value={
                filter.dateRange
                  ? [dayjs(filter.dateRange.startDate), dayjs(filter.dateRange.endDate)]
                  : null
              }
              onChange={handleDateRangeChange}
              format="DD/MM/YYYY"
              placeholder={[t("Từ ngày", lang), t("Đến ngày", lang)]}
              allowClear
              size="small"
              style={{ width: 240 }}
            />
          </div>

          {/* Facebook Page */}
          <div className={styles["mk-adv-filter-item"]}>
            <FacebookOutlined className={styles["mk-adv-filter-icon"]} />
            <Select
              value={filter.facebookPageId}
              onChange={handleFacebookPageChange}
              options={facebookPageOptions}
              placeholder={t("Facebook Page", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 160 }}
            />
          </div>

          {/* Marketing Employee */}
          <div className={styles["mk-adv-filter-item"]}>
            <UserOutlined className={styles["mk-adv-filter-icon"]} />
            <Select
              value={filter.marketingEmployeeId}
              onChange={handleEmployeeChange}
              options={employeeOptions}
              placeholder={t("Nhân viên Marketing", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 160 }}
            />
          </div>

          {/* Campaign */}
          <div className={styles["mk-adv-filter-item"]}>
            <FlagOutlined className={styles["mk-adv-filter-icon"]} />
            <Select
              value={filter.campaignId}
              onChange={handleCampaignChange}
              options={campaignOptions}
              placeholder={t("Campaign", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 160 }}
            />
          </div>

          {/* Source */}
          <div className={styles["mk-adv-filter-item"]}>
            <ClusterOutlined className={styles["mk-adv-filter-icon"]} />
            <Select
              value={filter.source}
              onChange={handleSourceChange}
              options={LEAD_SOURCE_OPTIONS}
              placeholder={t("Nguồn Lead", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 140 }}
            />
          </div>

          {/* Status */}
          <div className={styles["mk-adv-filter-item"]}>
            <CheckCircleOutlined className={styles["mk-adv-filter-icon"]} />
            <Select
              value={filter.status}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder={t("Trạng thái", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 140 }}
            />
          </div>
        </Space>

        {hasActiveFilters && (
          <>
            <Divider type="vertical" style={{ height: 24, margin: "0 4px" }} />
            <Button
              type="link"
              size="small"
              onClick={handleClearFilters}
              disabled={loading}
            >
              {t("Xóa lọc", lang)}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const MarketingDashboardAdvancedFilters = memo(MarketingDashboardAdvancedFiltersInner);
export default MarketingDashboardAdvancedFilters;
