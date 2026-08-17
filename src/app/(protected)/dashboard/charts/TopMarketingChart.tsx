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
 * Hỗ trợ toggle giữa biểu đồ cột và đường.
 *
 * Mỗi hàng hiển thị:
 *   # | Tên MKT | Doanh thu (₫) | Số đơn | progress bar
 *
 * NOTE: API đã lọc scope theo user — non-GLOBAL chỉ thấy doanh thu của chính mình.
 */

import { useMemo, useState } from "react";
import { ChartContainer } from "@/components/common";
import { Button, Segmented, Space, Tooltip } from "antd";
import { BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import type { TopMarketingItem, TopMarketingRange } from "@/types/dashboard-chart";
import { formatCompact, formatNumber } from "@/lib/format";
import styles from "../dashboard.module.css";

export type TopMarketingChartProps = {
  data: TopMarketingItem[];
  loading?: boolean;
  /** Lọc hiện tại (đồng bộ với queryKey của useDashboardCharts). */
  range?: TopMarketingRange;
  /** Callback khi user đổi filter. */
  onRangeChange?: (next: TopMarketingRange) => void;
};

type ChartViewType = "bar" | "line";

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
  const [chartType, setChartType] = useState<ChartViewType>("bar");

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

  const renderBarChart = () => (
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
  );

  const renderLineChart = () => {
    const SVG_W = 920;
    const SVG_H = 320;
    const PAD_LEFT = 60;
    const PAD_RIGHT = 16;
    const PAD_TOP = 28;
    const PAD_BOTTOM = 48;
    const innerW = SVG_W - PAD_LEFT - PAD_RIGHT;
    const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data.map((d, i) => ({
      x: PAD_LEFT + i * xStep,
      y: PAD_TOP + innerH - (maxRevenue > 0 ? (d.revenue / maxRevenue) * innerH : 0),
      revenue: d.revenue,
      name: d.name,
      orders: d.orders,
      index: i,
    }));

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPath =
      points.length > 1
        ? `M ${PAD_LEFT},${PAD_TOP + innerH} ` +
          points.map((p) => `L ${p.x},${p.y}`).join(" ") +
          ` L ${points[points.length - 1].x},${PAD_TOP + innerH} Z`
        : "";

    const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      ratio,
      y: PAD_TOP + innerH * (1 - ratio),
      value: maxRevenue * ratio,
    }));

    return (
      <div className={styles["mk-line-chart-wrap"]}>
        {/* Sub-header */}
        {hasData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#595959",
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px dashed #f0f0f0",
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

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: 260, display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="topmkt-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#722ed1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#722ed1" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Vertical grid lines */}
          {points.map((p) => (
            <line
              key={`vgrid-${p.index}`}
              x1={p.x}
              y1={PAD_TOP}
              x2={p.x}
              y2={PAD_TOP + innerH}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          ))}

          {/* Horizontal grid lines */}
          {yAxisLabels.map((lbl) => (
            <line
              key={`hgrid-${lbl.ratio}`}
              x1={PAD_LEFT}
              y1={lbl.y}
              x2={PAD_LEFT + innerW}
              y2={lbl.y}
              stroke="#e8e8e8"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((lbl) => (
            <text
              key={`ylabel-${lbl.ratio}`}
              x={PAD_LEFT - 6}
              y={lbl.y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#8c8c8c"
            >
              {formatCompact(lbl.value)}
            </text>
          ))}

          {/* X-axis baseline */}
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + innerH}
            x2={PAD_LEFT + innerW}
            y2={PAD_TOP + innerH}
            stroke="#d9d9d9"
            strokeWidth={1}
          />

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#topmkt-gradient)" />
          )}

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#722ed1"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Dots + labels */}
          {points.map((p) => (
            <g key={p.name || p.index}>
              <circle cx={p.x} cy={p.y} r={5} fill="#722ed1" />
              <text
                x={p.x}
                y={PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#595959"
              >
                {p.name.length > 10 ? p.name.substring(0, 10) + "..." : p.name}
              </text>
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize={9}
                fill="#8c8c8c"
                fontWeight={500}
              >
                {formatCompact(p.revenue)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <ChartContainer
      title="Top Marketing"
      subtitle="Top 5 nhân viên marketing theo doanh thu từ đơn hàng"
      loading={loading}
      height={320}
      actions={
        <Space size={8}>
          <Tooltip title="Biểu đồ cột">
            <Button
              icon={<BarChartOutlined />}
              type={chartType === "bar" ? "primary" : "default"}
              onClick={() => setChartType("bar")}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Biểu đồ đường">
            <Button
              icon={<LineChartOutlined />}
              type={chartType === "line" ? "primary" : "default"}
              onClick={() => setChartType("line")}
              size="small"
            />
          </Tooltip>
          <Segmented
            options={RANGE_OPTIONS}
            value={range}
            onChange={handleRangeChange}
            size="small"
          />
        </Space>
      }
    >
      {chartType === "bar" ? renderBarChart() : renderLineChart()}
    </ChartContainer>
  );
}
