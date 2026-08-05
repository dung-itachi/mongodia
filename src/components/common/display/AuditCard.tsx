/**
 * ==================================================
 * AUDIT CARD COMPONENT
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Detail (Refactored)
 *
 * Component hiển thị audit trail hoàn toàn generic.
 * Có thể reuse cho Lead, Order, Warehouse, v.v.
 *
 * Usage:
 *   <AuditCard items={auditItems} />
 *
 * AuditItem:
 *   { label, value, visible? }
 *
 * Không hardcode field names.
 */

import { Card, Descriptions, Typography } from "antd";
import styles from "./audit-card.module.css";

export interface AuditItem {
  /** Label hiển thị */
  label: string;
  /** Value hiển thị */
  value: React.ReactNode;
  /** Ẩn/hiện item (default: true) */
  visible?: boolean;
}

interface AuditCardProps {
  /** Danh sách items cần hiển thị */
  items: AuditItem[];
  /** Custom title (default: "Audit Trail") */
  title?: string;
  /** Số columns trong Descriptions (default: 2) */
  columns?: 1 | 2 | 3;
}

const { Text } = Typography;

export default function AuditCard({
  items,
  title = "Audit Trail",
  columns = 2,
}: AuditCardProps) {
  // Filter visible items only
  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <Card title={title} className={styles.auditCard}>
      <Descriptions column={columns} size="small" bordered>
        {visibleItems.map((item, index) => (
          <Descriptions.Item key={index} label={item.label}>
            {item.value || <Text type="secondary">-</Text>}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
}
