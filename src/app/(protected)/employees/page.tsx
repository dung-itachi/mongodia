"use client";

/**
 * Employees Page (Sprint Org Chart)
 *
 * Renders the organization chart for the company hierarchy.
 * The chart is purely a PRESENTATION view — it derives a tree from
 * existing manager / leader / employee relationships without mutating
 * any data.
 *
 * Hierarchy rules:
 *   ADMIN → MANAGER → LEADER → EMPLOYEE
 *
 * The page exposes:
 *   - Toolbar (search, zoom +/-, fit, center, expand/collapse all)
 *   - Pan: hold-and-drag inside the chart
 *   - Zoom: ctrl/cmd + wheel (or the toolbar buttons)
 *   - Search: highlights matches + their ancestors, auto-expands
 *     collapsed parents and centers the viewport on the first hit
 */

import { useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/common";
import { useOrgChart } from "@/hooks/useOrgChart";
import OrganizationChart from "@/components/orgchart/OrganizationChart";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function EmployeesPage() {
  const lang = useLanguageStore((s) => s.language);
  const { data, isLoading, isError, error, refetch } = useOrgChart();

  const orgChart = useMemo(() => {
    if (!data) return null;
    return {
      root: data.root,
      flat: data.flat,
    };
  }, [data]);

  return (
    <PageContainer>
      <PageHeader
        title={t("Sơ đồ tổ chức", lang)}
        subtitle={t("Trực quan hóa cơ cấu quản lý · Admin → Manager → Leader → Employee", lang)}
      />

      {isError ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {t("Không thể tải sơ đồ tổ chức:", lang)} {(error as Error)?.message ?? t("Lỗi không xác định", lang)}
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              marginLeft: 12,
              padding: "4px 10px",
              border: "1px solid #b91c1c",
              borderRadius: 4,
              background: "#fff",
              color: "#b91c1c",
              cursor: "pointer",
            }}
          >
            {t("Thử lại", lang)}
          </button>
        </div>
      ) : null}

      {orgChart ? (
        <OrganizationChart
          root={orgChart.root}
          flat={orgChart.flat}
          loading={isLoading}
        />
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: 48,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          {isLoading ? t("Đang tải sơ đồ…", lang) : t("Chưa có dữ liệu", lang)}
        </div>
      )}
    </PageContainer>
  );
}
