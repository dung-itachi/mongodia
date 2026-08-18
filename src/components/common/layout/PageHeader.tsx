/**
 * PageHeader Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard page header for all CRM pages.
 */

import { Breadcrumb } from "antd";
import { ReactNode } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  /** Page title */
  title: ReactNode;
  /** Optional subtitle */
  subtitle?: ReactNode;
  /** Breadcrumb items */
  breadcrumb?: BreadcrumbItem[];
  /** Action buttons on the right */
  actions?: ReactNode;
  /** Loading state */
  loading?: boolean;
};

export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: PageHeaderProps) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          {breadcrumb && breadcrumb.length > 0 && (
            <Breadcrumb
              style={{ marginBottom: 8 }}
              items={breadcrumb.map((item, index) => ({
                key: index,
                title: item.href ? (
                  <a href={item.href}>{item.label}</a>
                ) : (
                  item.label
                ),
              }))}
            />
          )}
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: "#8c8c8c",
                margin: "4px 0 0",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}