/**
 * MarketingDashboardCharts Component (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven charts rendering using CSS bars + SVG line chart.
 * Supports toggle between bar chart and line chart views.
 */

import { memo, useState } from "react";
import { Card, Skeleton, Button, Space, Tooltip } from "antd";
import { BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import { useMarketingChartData } from "@/hooks/useMarketingChartData";
import { MARKETING_DASHBOARD_CHARTS } from "./marketing-dashboard-chart.config";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type MarketingDashboardChartsProps = {
  period: ChartPeriod;
  onChartClick?: (chartId: string, label: string) => void;
};

type ChartViewType = "bar" | "line";

function MarketingDashboardChartsInner({ period, onChartClick }: MarketingDashboardChartsProps) {
  const [chartType, setChartType] = useState<ChartViewType>("bar");

  const { data, loading, error } = useMarketingChartData(period);

  if (loading) {
    return (
      <div className={styles["mk-charts-grid"]}>
        {MARKETING_DASHBOARD_CHARTS.slice(0, 2).map((chart) => (
          <Card key={chart.id} title={chart.title}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles["mk-charts-grid"]}>
        <Card title="Lỗi">Không thể tải dữ liệu biểu đồ</Card>
      </div>
    );
  }

  const formatValue = (value: number, format?: "currency" | "percent" | "number") => {
    switch (format) {
      case "currency":
        return formatNumber(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      default:
        return formatNumber(value);
    }
  };

  const CHART_BAR_MAX_HEIGHT = 160;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Space.Compact>
          <Tooltip title="Biểu đồ cột">
            <Button
              icon={<BarChartOutlined />}
              type={chartType === "bar" ? "primary" : "default"}
              onClick={() => setChartType("bar")}
            >
              Cột
            </Button>
          </Tooltip>
          <Tooltip title="Biểu đồ đường">
            <Button
              icon={<LineChartOutlined />}
              type={chartType === "line" ? "primary" : "default"}
              onClick={() => setChartType("line")}
            >
              Đường
            </Button>
          </Tooltip>
        </Space.Compact>
      </div>

      <div className={styles["mk-charts-grid"]}>
        {MARKETING_DASHBOARD_CHARTS.map((chart) => {
          const chartData = chart.selector(data);
          const sumValue = chartData.reduce((s, d) => s + Math.abs(d.value), 0);
          const maxValue = Math.max(sumValue, 1);
          const visibleData = chartData.slice(-7);

          return (
            <Card
              key={chart.id}
              title={chart.title}
              className={styles["mk-chart-card"]}
              onClick={() => onChartClick?.(chart.id, chart.title)}
              style={{ cursor: onChartClick ? "pointer" : "default" }}
            >
              {chartType === "bar" ? (
                <BarChartView
                  data={visibleData}
                  maxValue={maxValue}
                  sumValue={sumValue}
                  chart={chart}
                  formatValue={formatValue}
                  maxHeight={CHART_BAR_MAX_HEIGHT}
                />
              ) : (
                <LineChartView
                  data={visibleData}
                  maxValue={maxValue}
                  chart={chart}
                  formatValue={formatValue}
                />
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ─── Bar Chart ─── */
type BarChartViewProps = {
  data: { date: string; value: number }[];
  maxValue: number;
  sumValue: number;
  chart: (typeof MARKETING_DASHBOARD_CHARTS)[number];
  formatValue: (v: number, f?: "currency" | "percent" | "number") => string;
  maxHeight: number;
};

function BarChartView({ data, maxValue, sumValue, chart, formatValue, maxHeight }: BarChartViewProps) {
  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: maxValue * ratio,
  }));

  return (
    <div className={styles["mk-chart"]}>
      {/* Y-axis labels (left side) */}
      <div className={styles["mk-chart-yaxis"]}>
        {[...yAxisLabels].reverse().map((lbl) => (
          <span key={lbl.ratio} className={styles["mk-chart-yaxis-label"]}>
            {formatValue(lbl.value, chart.yAxisFormat)}
          </span>
        ))}
      </div>

      {/* Bar columns (right side) */}
      <div className={styles["mk-chart-bars"]}>
        {data.map((point, index) => {
          const barHeight =
            sumValue > 0
              ? Math.max((Math.abs(point.value) / maxValue) * maxHeight, 4)
              : 0;
          const dateParts = point.date.split("-");
          const label = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : point.date;

          return (
            <div key={point.date || index} className={styles["mk-chart-col"]}>
              <div className={styles["mk-chart-value"]}>
                {formatValue(point.value, chart.yAxisFormat)}
              </div>
              <div className={styles["mk-chart-bar-container"]}>
                <div
                  className={styles["mk-chart-bar"]}
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: chart.color,
                  }}
                />
              </div>
              <div className={styles["mk-chart-label"]}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Line Chart ─── */
type LineChartViewProps = {
  data: { date: string; value: number }[];
  maxValue: number;
  chart: (typeof MARKETING_DASHBOARD_CHARTS)[number];
  formatValue: (v: number, f?: "currency" | "percent" | "number") => string;
};

function LineChartView({ data, maxValue, chart, formatValue }: LineChartViewProps) {
  const SVG_W = 520;
  const SVG_H = 180;
  const PAD_LEFT = 52;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 36;
  const innerW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;

  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => ({
    x: PAD_LEFT + i * xStep,
    y: PAD_TOP + innerH - (maxValue > 0 ? (Math.abs(d.value) / maxValue) * innerH : 0),
    value: d.value,
    date: d.date,
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `M ${PAD_LEFT},${PAD_TOP + innerH} ` +
        points.map((p) => `L ${p.x},${p.y}`).join(" ") +
        ` L ${points[points.length - 1].x},${PAD_TOP + innerH} Z`
      : "";

  const gradientId = `mk-gradient-${chart.id}`;
  const dotRadius = 5;

  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    y: PAD_TOP + innerH * (1 - ratio),
    value: maxValue * ratio,
  }));

  return (
    <div className={styles["mk-line-chart-wrap"]}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chart.color} stopOpacity={0.02} />
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
            {formatValue(lbl.value, chart.yAxisFormat)}
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
          <path d={areaPath} fill={`url(#${gradientId})`} />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={chart.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots + labels */}
        {points.map((p, i) => {
          const dateParts = p.date.split("-");
          const label = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : p.date;
          return (
            <g key={p.date || i}>
              <circle cx={p.x} cy={p.y} r={dotRadius} fill={chart.color} />
              <text
                x={p.x}
                y={PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#595959"
              >
                {label}
              </text>
              <text
                x={p.x}
                y={p.y - dotRadius - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#8c8c8c"
                fontWeight={500}
              >
                {formatValue(p.value, chart.yAxisFormat)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const MarketingDashboardCharts = memo(MarketingDashboardChartsInner);
export default MarketingDashboardCharts;
