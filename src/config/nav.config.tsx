/**
 * Navigation Configuration (Phase A - Foundation UI)
 *
 * Pure config — no API calls, no business logic.
 * Used by Sidebar to render nav groups.
 *
 * Service / Permission / Role checks will be layered in later phases.
 * For Phase A, every item is shown unconditionally.
 */

import type { ReactNode } from "react";
import {
  AppstoreOutlined,
  DashboardOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  TagsOutlined,
  HomeOutlined,
  ContactsOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ImportOutlined,
} from "@ant-design/icons";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
};

export type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    label: "Tổng quan",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: <DashboardOutlined />,
      },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    items: [
      {
        key: "marketing.dashboard",
        label: "Dashboard MKT",
        href: "/marketing/dashboard",
        icon: <BarChartOutlined />,
      },
      {
        key: "marketing.input",
        label: "Nhập số",
        href: "/marketing/input",
        icon: <ImportOutlined />,
      },
      {
        key: "marketing.orders",
        label: "QL đơn hàng",
        href: "/marketing/orders",
        icon: <FileTextOutlined />,
      },
    ],
  },
  {
    key: "sales",
    label: "Bán hàng",
    items: [
      {
        key: "leads",
        label: "Số cần gọi",
        href: "/leads",
        icon: <ContactsOutlined />,
      },
      {
        key: "customers",
        label: "Khách hàng",
        href: "/customers",
        icon: <UserOutlined />,
      },
      {
        key: "orders",
        label: "Đơn hàng",
        href: "/orders",
        icon: <ShopOutlined />,
      },
    ],
  },
  {
    key: "warehouse",
    label: "Kho",
    items: [
      {
        key: "warehouses",
        label: "Quản lý kho",
        href: "/warehouses",
        icon: <HomeOutlined />,
      },
    ],
  },
  {
    key: "catalog",
    label: "Danh mục",
    items: [
      {
        key: "products",
        label: "Sản phẩm",
        href: "/products",
        icon: <TagsOutlined />,
      },
    ],
  },
  {
    key: "admin",
    label: "Quản trị",
    items: [
      {
        key: "employees",
        label: "Nhân viên",
        href: "/employees",
        icon: <TeamOutlined />,
      },
      {
        key: "roles",
        label: "Vai trò",
        href: "/roles",
        icon: <AppstoreOutlined />,
      },
    ],
  },
];

export const BRAND_NAME = "Mongolia CRM";
