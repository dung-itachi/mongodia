/**
 * Marketing Dashboard API Route (Sprint 5.1 — Marketing Dashboard)
 *
 * GET /api/marketing/dashboard
 *
 * Returns marketing dashboard summary, charts and top performers.
 * Currently uses mock data — replace with real queries in future sprints.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const mockData = {
    summary: {
      totalLead: 1248,
      todayLead: 42,
      assignedLead: 1180,
      unassignedLead: 68,
      closedLead: 312,
      conversionRate: 25.0,
    },
    chart: {
      dailyLead: [
        { date: "2026-07-28", count: 28 },
        { date: "2026-07-29", count: 35 },
        { date: "2026-07-30", count: 31 },
        { date: "2026-07-31", count: 40 },
        { date: "2026-08-01", count: 45 },
        { date: "2026-08-02", count: 38 },
        { date: "2026-08-03", count: 42 },
      ],
      source: [
        { source: "Facebook", count: 520 },
        { source: "TikTok", count: 312 },
        { source: "Google", count: 188 },
        { source: "Hotline", count: 132 },
        { source: "Giới thiệu", count: 96 },
      ],
    },
    topMarketing: [
      { name: "Nguyễn Văn M1", count: 142 },
      { name: "Trần Thị M2", count: 128 },
      { name: "Lê Văn M3", count: 110 },
      { name: "Phạm Thị M4", count: 95 },
      { name: "Hoàng Văn M5", count: 82 },
    ],
  };

  return NextResponse.json({
    success: true,
    data: mockData,
    message: "Marketing dashboard data fetched successfully",
  });
}