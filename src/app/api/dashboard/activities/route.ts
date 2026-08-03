/**
 * Dashboard Activities API Route (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * GET /api/dashboard/activities
 *
 * Returns recent orders, leads, inventory changes, and notifications.
 * Currently uses mock data — replace with real queries in future sprints.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Mock activity data
  const activityData = {
    recentOrders: [
      {
        id: "ord-001",
        code: "DH-2026-1248",
        customer: "Nguyễn Văn An",
        status: "PENDING",
        total: 2500000,
        createdAt: "2026-08-03T14:32:00Z",
      },
      {
        id: "ord-002",
        code: "DH-2026-1247",
        customer: "Trần Thị Bình",
        status: "SHIPPING",
        total: 1850000,
        createdAt: "2026-08-03T13:15:00Z",
      },
      {
        id: "ord-003",
        code: "DH-2026-1246",
        customer: "Lê Văn Cường",
        status: "DELIVERED",
        total: 3200000,
        createdAt: "2026-08-03T11:48:00Z",
      },
      {
        id: "ord-004",
        code: "DH-2026-1245",
        customer: "Phạm Thị Dung",
        status: "PROCESSING",
        total: 1450000,
        createdAt: "2026-08-03T10:20:00Z",
      },
      {
        id: "ord-005",
        code: "DH-2026-1244",
        customer: "Hoàng Văn Em",
        status: "RETURNED",
        total: 980000,
        createdAt: "2026-08-03T09:05:00Z",
      },
    ],
    recentLeads: [
      {
        id: "lead-001",
        name: "Khách hàng A",
        source: "Facebook",
        sale: "Nguyễn Văn A",
        status: "NEW",
        createdAt: "2026-08-03T15:00:00Z",
      },
      {
        id: "lead-002",
        name: "Khách hàng B",
        source: "TikTok",
        sale: "Trần Thị B",
        status: "CONTACTED",
        createdAt: "2026-08-03T14:25:00Z",
      },
      {
        id: "lead-003",
        name: "Khách hàng C",
        source: "Google",
        sale: "Lê Văn C",
        status: "CLOSED",
        createdAt: "2026-08-03T13:40:00Z",
      },
      {
        id: "lead-004",
        name: "Khách hàng D",
        source: "Hotline",
        sale: "Phạm Thị D",
        status: "NO_ANSWER",
        createdAt: "2026-08-03T12:55:00Z",
      },
      {
        id: "lead-005",
        name: "Khách hàng E",
        source: "Giới thiệu",
        sale: "Hoàng Văn E",
        status: "POTENTIAL",
        createdAt: "2026-08-03T11:30:00Z",
      },
    ],
    recentInventory: [
      {
        id: "inv-001",
        product: "Sản phẩm A",
        type: "IN",
        quantity: 50,
        createdAt: "2026-08-03T15:10:00Z",
      },
      {
        id: "inv-002",
        product: "Sản phẩm B",
        type: "OUT",
        quantity: 12,
        createdAt: "2026-08-03T14:00:00Z",
      },
      {
        id: "inv-003",
        product: "Sản phẩm C",
        type: "IN",
        quantity: 100,
        createdAt: "2026-08-03T12:30:00Z",
      },
      {
        id: "inv-004",
        product: "Sản phẩm D",
        type: "OUT",
        quantity: 25,
        createdAt: "2026-08-03T10:45:00Z",
      },
      {
        id: "inv-005",
        product: "Sản phẩm E",
        type: "IN",
        quantity: 75,
        createdAt: "2026-08-03T09:20:00Z",
      },
    ],
    notifications: [
      {
        id: "notif-001",
        title: "Đơn hàng mới",
        message: "Đơn hàng DH-2026-1248 vừa được tạo",
        type: "info",
        createdAt: "2026-08-03T15:00:00Z",
      },
      {
        id: "notif-002",
        title: "Chốt đơn thành công",
        message: "Khách hàng C đã chốt đơn 3.200.000₫",
        type: "success",
        createdAt: "2026-08-03T13:40:00Z",
      },
      {
        id: "notif-003",
        title: "Tồn kho thấp",
        message: "Sản phẩm B chỉ còn 12 sản phẩm",
        type: "warning",
        createdAt: "2026-08-03T11:00:00Z",
      },
      {
        id: "notif-004",
        title: "Hoàn hàng",
        message: "Đơn DH-2026-1244 đã bị hoàn",
        type: "error",
        createdAt: "2026-08-03T09:05:00Z",
      },
      {
        id: "notif-005",
        title: "Lead mới",
        message: "Có 5 lead mới cần xử lý",
        type: "info",
        createdAt: "2026-08-03T08:00:00Z",
      },
    ],
  };

  return NextResponse.json({
    success: true,
    data: activityData,
    message: "Dashboard activity data fetched successfully",
  });
}