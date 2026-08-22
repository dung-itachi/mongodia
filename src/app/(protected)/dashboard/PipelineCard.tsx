/**
 * Pipeline Component (Sprint 4.1 - Dashboard Foundation)
 *
 * Pipeline visualization for the Dashboard.
 * Shows stages: New, KNM, Closed, Shipping, Delivered, Returned
 */

import type { DashboardPipeline } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type PipelineItem = {
  label: string;
  value: number;
  color: string;
};

export type PipelineCardProps = {
  pipeline: DashboardPipeline;
};

const STAGE_COLORS: Record<keyof DashboardPipeline, string> = {
  new: "#1890ff",
  contacted: "#13c2c2",
  closed: "#722ed1",
  shipping: "#fa8c16",
  delivered: "#52c41a",
  returned: "#ff4d4f",
  cancelled: "#8c8c8c",
};

const STAGE_LABEL_KEYS: Record<keyof DashboardPipeline, string> = {
  new: "Mới",
  contacted: "KNM",
  closed: "Chốt",
  shipping: "Đang giao",
  delivered: "Giao TC",
  returned: "Hoàn hàng",
  cancelled: "Đã hủy",
};

export default function PipelineCard({ pipeline }: PipelineCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const total = Object.values(pipeline).reduce((sum, val) => sum + val, 0);

  const items: PipelineItem[] = (
    Object.keys(pipeline) as (keyof DashboardPipeline)[]
  ).map((key) => ({
    label: t(STAGE_LABEL_KEYS[key], lang),
    value: pipeline[key],
    color: STAGE_COLORS[key],
  }));

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            color: "#262626",
          }}
        >
          {t("Quy trình", lang)}
        </h3>
        <span
          style={{
            fontSize: 12,
            color: "#8c8c8c",
          }}
        >
          {t("Tổng:", lang)} {formatNumber(total)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: "#262626",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#8c8c8c",
                    }}
                  >
                    {percent.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#262626",
                      minWidth: 60,
                      textAlign: "right",
                    }}
                  >
                    {formatNumber(item.value)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 8,
                  width: "100%",
                  backgroundColor: "#f0f0f0",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    backgroundColor: item.color,
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}