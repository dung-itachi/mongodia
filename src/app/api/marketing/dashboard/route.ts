/**
 * Marketing Dashboard API Route (Sprint 5.1 — Marketing Dashboard)
 *
 * GET /api/marketing/dashboard
 *
 * Returns marketing dashboard summary, charts and top performers.
 *
 * IMPORTANT: Currently uses mock data.
 * TODO: Replace with Mongo aggregation queries:
 *   - Use lead collection with date filters
 *   - Aggregate by source, date, assignee
 *   - Calculate conversion rate from orders collection
 */

import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with Mongo aggregation
  // const leads = await db.collection('leads').aggregate([
  //   { $match: { createdAt: { $gte: startOfWeek } } },
  //   { $group: { _id: '$source', count: { $sum: 1 } } }
  // ]).toArray();

  const mockData = {
    summary: {
      todayLead: 42,
      weekLead: 287,
      monthLead: 1248,
      totalLead: 1248,
      assignedLead: 1180,
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
      { employeeId: "mk001", employeeName: "Nguyễn Văn M1", avatar: null, totalLead: 142, closedLead: 38, conversionRate: 26.8 },
      { employeeId: "mk002", employeeName: "Trần Thị M2", avatar: null, totalLead: 128, closedLead: 35, conversionRate: 27.3 },
      { employeeId: "mk003", employeeName: "Lê Văn M3", avatar: null, totalLead: 110, closedLead: 28, conversionRate: 25.5 },
      { employeeId: "mk004", employeeName: "Phạm Thị M4", avatar: null, totalLead: 95, closedLead: 22, conversionRate: 23.2 },
      { employeeId: "mk005", employeeName: "Hoàng Văn M5", avatar: null, totalLead: 82, closedLead: 18, conversionRate: 22.0 },
    ],
  };

  return NextResponse.json({
    success: true,
    data: mockData,
    message: "Marketing dashboard data fetched successfully",
  });
}