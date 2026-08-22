/**
 * Dashboard Quick Actions API Route (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * GET /api/dashboard/quick-actions
 *
 * Returns list of quick action items.
 * Currently uses mock data — replace with real data in future sprints.
 */

import { NextResponse } from "next/server";

// Static — không cần re-evaluate trên mỗi request.
// Endpoint trả về dữ liệu tĩnh (mock) nên có thể cache vĩnh viễn ở edge.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const quickActions = [
    {
      id: "qa-lead",
      label: "Lead",
      icon: "UserAddOutlined",
      color: "blue",
      route: "/leads/new",
    },
    {
      id: "qa-order",
      label: "Đơn hàng",
      icon: "FileTextOutlined",
      color: "purple",
      route: "/orders/new",
    },
    {
      id: "qa-customer",
      label: "Khách hàng",
      icon: "TeamOutlined",
      color: "cyan",
      route: "/customers/new",
    },
    {
      id: "qa-facebook",
      label: "Facebook",
      icon: "FacebookOutlined",
      color: "geekblue",
      route: "/facebook-pages",
    },
    {
      id: "qa-product",
      label: "Sản phẩm",
      icon: "ShoppingOutlined",
      color: "green",
      route: "/products/new",
    },
    {
      id: "qa-warehouse",
      label: "Kho",
      icon: "DatabaseOutlined",
      color: "orange",
      route: "/warehouses",
    },
  ];

  return NextResponse.json({
    success: true,
    data: quickActions,
    message: "Quick actions fetched successfully",
  });
}