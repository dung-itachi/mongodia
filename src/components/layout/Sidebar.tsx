"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Tooltip } from "antd";
import {
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

import { NAV_GROUPS, BRAND_NAME } from "@/config/nav.config";

/**
 * Sidebar — left rail.
 *
 * Visual rules live in `src/styles/sidebar.css` (`.sb`, `.brand`,
 * `.sb-tg`, `.ng`, `.nb`, `.ni`, `.sbf`, etc.) — class names mirror
 * the original HTML so future Sprint assets can drop in verbatim.
 *
 * Tailwind is only used for tiny flex/grid spacing utilities.
 * No inline styles, no CSS-in-JS.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sb ${collapsed ? "col" : ""}`}>
      <div className="brand">
        <div className="ico">
          <DashboardOutlined />
        </div>
        <div className="brand-txt">
          <div className="nm">{BRAND_NAME}</div>
          <div className="sub">Quản lý đơn hàng</div>
        </div>
        <button
          type="button"
          className="sb-tg"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <svg className="ic-c" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <svg className="ic-o" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>

      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="ng open">
            <button type="button" className="nh">
              <span className="nl">{group.label}</span>
            </button>
            <div className="nb">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const link = (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`ni ${active ? "on" : ""}`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );

                return collapsed ? (
                  <Tooltip
                    key={item.key}
                    title={item.label}
                    placement="right"
                    mouseEnterDelay={0.2}
                  >
                    {link}
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sbf">
        <div className="ver">v6.0 · Mongolia CRM</div>
      </div>

      <div className="sbf">
        <Button
          type="text"
          block
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed((v) => !v)}
        >
          {!collapsed && "Thu gọn"}
        </Button>
      </div>
    </aside>
  );
}
