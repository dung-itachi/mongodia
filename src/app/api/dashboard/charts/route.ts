/**
 * Dashboard Charts API Route (Sprint 4.2 - Dashboard Charts)
 *
 * GET /api/dashboard/charts
 *
 * Returns chart data for the dashboard.
 * Currently uses mock data — replace with real queries in future sprints.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Mock chart data
  const chartData = {
    pipeline: [
      { label: "Mới", value: 248 },
      { label: "KNM", value: 412 },
      { label: "Chốt", value: 312 },
      { label: "Đang giao", value: 89 },
      { label: "Giao TC", value: 1054 },
      { label: "Hoàn hàng", value: 47 },
    ],
    revenue: [
      { date: "2026-01", revenue: 85000000 },
      { date: "2026-02", revenue: 92000000 },
      { date: "2026-03", revenue: 105000000 },
      { date: "2026-04", revenue: 118000000 },
      { date: "2026-05", revenue: 132000000 },
      { date: "2026-06", revenue: 145000000 },
      { date: "2026-07", revenue: 168000000 },
    ],
    leadSource: [
      { source: "Facebook", count: 425 },
      { source: "TikTok", count: 312 },
      { source: "Google", count: 198 },
      { source: "Hotline", count: 156 },
      { source: "Giới thiệu", count: 98 },
      { source: "Khác", count: 59 },
    ],
    topSale: [
      { name: "Nguyễn Văn A", total: 185000000 },
      { name: "Trần Thị B", total: 162000000 },
      { name: "Lê Văn C", total: 148000000 },
      { name: "Phạm Thị D", total: 132000000 },
      { name: "Hoàng Văn E", total: 118000000 },
    ],
    topMarketing: [
      { name: "Đỗ Thị F", count: 285 },
      { name: "Vũ Văn G", count: 248 },
      { name: "Bùi Thị H", count: 215 },
      { name: "Đinh Văn I", count: 192 },
      { name: "Dương Thị K", count: 168 },
    ],
  };

  return NextResponse.json({
    success: true,
    data: chartData,
    message: "Dashboard chart data fetched successfully",
  });
}