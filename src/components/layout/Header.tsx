"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Breadcrumb, Dropdown, Avatar } from "antd";
import {
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { buildBreadcrumbs } from "@/config/breadcrumb.config";

/**
 * Header — topbar.
 *
 * Visual rules live in `src/styles/header.css` (`.topbar`, `.pt`,
 * `.vb`, `.srch`, `.tbr`). Class names mirror the original HTML.
 *
 * Tailwind only for very small utilities; no inline styles.
 */
export default function Header() {
  const pathname = usePathname();
  const items = buildBreadcrumbs(pathname);

  const breadcrumbItems = items.map((item, idx) => ({
    title:
      idx === items.length - 1 ? (
        <span className="pt">{item.label}</span>
      ) : (
        <Link href={item.href} className="pt">
          {item.label}
        </Link>
      ),
    // mark last item as non-link via empty href so AntD renders <span>
    href: idx === items.length - 1 ? "" : item.href,
  }));

  const userMenu = {
    items: [
      {
        key: "profile",
        label: "Hồ sơ",
        icon: <UserOutlined />,
        disabled: true,
      },
      {
        key: "settings",
        label: "Cài đặt",
        icon: <SettingOutlined />,
        disabled: true,
      },
      { type: "divider" as const },
      {
        key: "logout",
        label: "Đăng xuất",
        icon: <LogoutOutlined />,
        disabled: true,
      },
    ],
  };

  return (
    <header className="topbar">
      <div className="pt">
        <span>{items[items.length - 1]?.label ?? "Mongolia CRM"}</span>
        <small>Phase A · Foundation UI</small>
      </div>
      <div className="vb vb-b">Phase A</div>

      <div className="srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Tìm tên, SĐT…" disabled />
      </div>

      <div className="tbr">
        <Badge count={0} showZero={false} dot={false}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Thông báo"
            disabled
          >
            <BellOutlined />
          </button>
        </Badge>

        <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
          <button type="button" className="btn btn-ghost btn-sm">
            <Avatar size="small" icon={<UserOutlined />} />
            <span>Admin</span>
          </button>
        </Dropdown>

        <div className="cnt">
          <span>SL:</span>
          <b>0</b>
        </div>
      </div>

      {/* hidden AntD Breadcrumb mount: keeps build wiring consistent
          with the prior Phase A integration. Class names still apply. */}
      <Breadcrumb items={breadcrumbItems} className="srch" />
    </header>
  );
}
