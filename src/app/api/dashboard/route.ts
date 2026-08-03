/**
 * Dashboard API Route (Sprint 4.1 - Dashboard Foundation)
 *
 * GET /api/dashboard
 *
 * Returns dashboard summary and pipeline data.
 * Currently uses mock data — replace with real queries in future sprints.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Mock data (replace with real DB queries later)
  const dashboardData = {
    summary: {
      totalLeads: 1248,
      closedLeads: 312,
      shippingOrders: 89,
      deliveredOrders: 1054,
      returnedOrders: 47,
      revenue: 1258400000,
    },
    pipeline: {
      new: 248,
      contacted: 412,
      closed: 312,
      shipping: 89,
      delivered: 1054,
      returned: 47,
    },
  };

  return NextResponse.json({
    success: true,
    data: dashboardData,
    message: "Dashboard data fetched successfully",
  });
}
