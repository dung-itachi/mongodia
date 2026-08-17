/**
 * RevenueChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Visualizes revenue trend over time as a bar/line chart.
 * Uses ChartContainer from UI Kit.
 * Supports toggle between bar chart and line chart views.
 */

import { useState } from "react";
import { ChartContainer } from "@/components/common";
import { Button, Space, Tooltip } from "antd";
import { BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import type { RevenueChartItem } from "@/types/dashboard-chart";
import { formatCurrency, formatCompact } from "@/lib/format";
import styles from "../dashboard.module.css";

export type RevenueChartProps = {
  data: RevenueChartItem[];
  loading?: boolean;
};

type ChartViewType = "bar" | "line";

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  const [chartType, setChartType] = useState<ChartViewType>("bar");

  const maxRevenue = data.reduce(
    (max, item) => (item.revenue > max ? item.revenue : max),
    0
  );

  const renderBarChart = () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 8,
        padding: "0 8px",
      }}
    >
      {data.map((item) => {
        const heightPercent =
          maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
        return (
          <div
            key={item.date}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#8c8c8c",
                fontWeight: 500,
              }}
            >
              {formatCompact(item.revenue)}
            </div>
            <div
              style={{
                width: "100%",
                height: `${heightPercent}%`,
                minHeight: 4,
                backgroundColor: "#1890ff",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s ease",
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: "#595959",
                marginTop: 4,
              }}
            >
              {item.date}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLineChart = () => {
    const SVG_W = 920;
    const SVG_H = 260;
    const PAD_LEFT = 60;
    const PAD_RIGHT = 16;
    const PAD_TOP = 20;
    const PAD_BOTTOM = 40;
    const innerW = SVG_W - PAD_LEFT - PAD_RIGHT;
    const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data.map((d, i) => ({
      x: PAD_LEFT + i * xStep,
      y: PAD_TOP + innerH - (maxRevenue > 0 ? (d.revenue / maxRevenue) * innerH : 0),
      revenue: d.revenue,
      date: d.date,
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
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: 220, display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1890ff" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#1890ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Vertical grid lines */}
          {points.map((p) => (
            <line
              key={`vgrid-${p.date}`}
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
            <path d={areaPath} fill="url(#revenue-gradient)" />
          )}

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#1890ff"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Dots + labels */}
          {points.map((p, i) => (
            <g key={p.date || i}>
              <circle cx={p.x} cy={p.y} r={5} fill="#1890ff" />
              <text
                x={p.x}
                y={PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#595959"
              >
                {p.date}
              </text>
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize={10}
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
      title="Doanh thu"
      subtitle="Doanh thu theo tháng"
      loading={loading}
      height={280}
      actions={
        <Space.Compact size="small">
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
        </Space.Compact>
      }
    >
      {chartType === "bar" ? renderBarChart() : renderLineChart()}
    </ChartContainer>
  );
}