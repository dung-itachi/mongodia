/**
 * PipelineChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Visualizes pipeline stages as horizontal progress bars or donut chart.
 * Uses ChartContainer from UI Kit.
 * Supports toggle between bar chart and pie/donut chart views.
 */

import { useState } from "react";
import { ChartContainer } from "@/components/common";
import { Button, Space, Tooltip } from "antd";
import { BarChartOutlined, PieChartOutlined } from "@ant-design/icons";
import type { PipelineChartItem } from "@/types/dashboard-chart";
import { formatNumber } from "@/lib/format";
import styles from "../dashboard.module.css";

export type PipelineChartProps = {
  data: PipelineChartItem[];
  loading?: boolean;
};

type ChartViewType = "bar" | "pie";

const STAGE_COLORS: Record<string, string> = {
  "Mới": "#1890ff",
  "KNM": "#13c2c2",
  "Chốt": "#722ed1",
  "Đang giao": "#fa8c16",
  "Giao TC": "#52c41a",
  "Hoàn hàng": "#ff4d4f",
};

const DEFAULT_COLOR = "#8c8c8c";

export default function PipelineChart({ data, loading }: PipelineChartProps) {
  const [chartType, setChartType] = useState<ChartViewType>("bar");
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderBarChart = () => (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((item) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        const color = STAGE_COLORS[item.label] ?? DEFAULT_COLOR;

        return (
          <div
            key={item.label}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#262626" }}>
                {item.label}
              </span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                  {percent.toFixed(1)}%
                </span>
                <span
                  style={{
                    fontSize: 13,
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
                height: 10,
                width: "100%",
                backgroundColor: "#f0f0f0",
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percent}%`,
                  backgroundColor: color,
                  borderRadius: 5,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPieChart = () => {
    if (total === 0) {
      return (
        <div style={{ textAlign: "center", color: "#bfbfbf", padding: 32 }}>
          Không có dữ liệu
        </div>
      );
    }

    const SVG_W = 200;
    const SVG_H = 200;
    const CX = SVG_W / 2;
    const CY = SVG_H / 2;
    const R = 80;
    const INNER_R = 50;

    let currentAngle = -90;
    const arcs = data.map((item) => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percent / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const color = STAGE_COLORS[item.label] ?? DEFAULT_COLOR;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = CX + R * Math.cos(startRad);
      const y1 = CY + R * Math.sin(startRad);
      const x2 = CX + R * Math.cos(endRad);
      const y2 = CY + R * Math.sin(endRad);
      const x3 = CX + INNER_R * Math.cos(endRad);
      const y3 = CY + INNER_R * Math.sin(endRad);
      const x4 = CX + INNER_R * Math.cos(startRad);
      const y4 = CY + INNER_R * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path =
        angle >= 360
          ? `M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x1 - 0.01} ${y1} L ${x4} ${y4} A ${INNER_R} ${INNER_R} 0 1 0 ${x3} ${y3} Z`
          : `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return { item, color, percent, path };
    });

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center" }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: 160, height: 160 }}>
          {arcs.map((arc, i) => (
            <path
              key={arc.item.label || i}
              d={arc.path}
              fill={arc.color}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize={18} fontWeight={700} fill="#262626">
            {formatNumber(total)}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={11} fill="#8c8c8c">
            Tổng
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {arcs.map((arc) => (
            <div key={arc.item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: arc.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: "#595959" }}>{arc.item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#262626", marginLeft: "auto" }}>
                {arc.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ChartContainer
      title="Quy trình"
      subtitle="Phân bố theo giai đoạn"
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
          <Tooltip title="Biểu đồ tròn">
            <Button
              icon={<PieChartOutlined />}
              type={chartType === "pie" ? "primary" : "default"}
              onClick={() => setChartType("pie")}
              size="small"
            />
          </Tooltip>
        </Space.Compact>
      }
    >
      {chartType === "bar" ? renderBarChart() : renderPieChart()}
    </ChartContainer>
  );
}
