/**
 * TopMarketingChart Component
 *
 * Top 5 nhân viên marketing theo DOANH THU từ đơn hàng.
 *
 * Có bộ lọc Day / Week / Month (Segmented control).
 * - day  : hôm nay
 * - week : 7 ngày gần nhất
 * - month: 30 ngày gần nhất
 *
 * Mỗi hàng hiển thị:
 *   # | Tên MKT | Doanh thu (₫) | Số đơn | progress bar
 *
 * NOTE: API đã lọc scope theo user — non-GLOBAL chỉ thấy doanh thu của chính mình.
 */

import { useMemo } from "react";
import { ChartContainer } from "@/components/common";
import { Segmented } from "antd";
import type { TopMarketingItem, TopMarketingRange } from "@/types/dashboard-chart";
import { formatCompact, formatNumber } from "@/lib/format";

export type TopMarketingChartProps = {
  data: TopMarketingItem[];
  loading?: boolean;
  /** Lọc hiện tại (đồng bộ với queryKey của useDashboardCharts). */
  range?: TopMarketingRange;
  /** Callback khi user đổi filter. */
  onRangeChange?: (next: TopMarketingRange) => void;
};

const RANGE_OPTIONS: { label: string; value: TopMarketingRange }[] = [
  { label: "Ngày", value: "day" },
  { label: "Tuần", value: "week" },
  { label: "Tháng", value: "month" },
];

export default function TopMarketingChart({
  data,
  loading,
  range = "month",
  onRangeChange,
}: TopMarketingChartProps) {
  const handleRangeChange = (value: string | number) => {
    onRangeChange?.(value as TopMarketingRange);
  };

  const maxRevenue = useMemo(
    () => data.reduce((max, item) => (item.revenue > max ? item.revenue : max), 0),
    [data]
  );

  const totalRevenue = useMemo(
    () => data.reduce((sum, item) => sum + item.revenue, 0),
    [data]
  );
  const totalOrders = useMemo(
    () => data.reduce((sum, item) => sum + item.orders, 0),
    [data]
  );

  const hasData = data.length > 0;

  return (
    <ChartContainer
      title="Top Marketing"
      subtitle="Top 5 nhân viên marketing theo doanh thu từ đơn hàng"
      loading={loading}
      height={320}
      actions={
        <Segmented
          options={RANGE_OPTIONS}
          value={range}
          onChange={handleRangeChange}
          size="small"
        />
      }
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "0 4px",
        }}
      >
        {/* Sub-header: tổng doanh thu / tổng đơn */}
        {hasData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#595959",
              paddingBottom: 8,
              borderBottom: "1px dashed #f0f0f0",
              marginBottom: 4,
            }}
          >
            <span>
              Tổng{" "}
              <strong style={{ color: "#722ed1" }}>
                {formatCompact(totalRevenue)} ₫
              </strong>
            </span>
            <span>
              Tổng đơn: <strong>{formatNumber(totalOrders)}</strong>
            </span>
          </div>
        )}

        {!hasData ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#bfbfbf",
              fontSize: 13,
            }}
          >
            Chưa có dữ liệu doanh thu trong kỳ này
          </div>
        ) : (
          data.map((item, index) => {
            const widthPercent =
              maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;

            return (
              <div
                key={item.employeeId || `${item.name}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor:
                      index === 0
                        ? "#faad14"
                        : index === 1
                          ? "#bfbfbf"
                          : index === 2
                            ? "#d4880d"
                            : "#f0f0f0",
                    color: index < 3 ? "#fff" : "#595959",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#262626",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#722ed1",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      title={`${formatNumber(item.revenue)} ₫`}
                    >
                      {formatCompact(item.revenue)} ₫
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      backgroundColor: "#f0f0f0",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${widthPercent}%`,
                        backgroundColor: "#722ed1",
                        borderRadius: 3,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "#8c8c8c",
                    }}
                  >
                    <span>{item.orders} đơn</span>
                    <span>
                      {totalRevenue > 0
                        ? `${((item.revenue / totalRevenue) * 100).toFixed(1)}% tổng`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ChartContainer>
  );
}