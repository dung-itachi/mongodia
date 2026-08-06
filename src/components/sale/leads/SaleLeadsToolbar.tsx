/**
 * Sale Leads Toolbar Component (Sprint 8.5)
 *
 * Toolbar for Sale leads page with status filters.
 */

import { Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { LeadStatus } from "@/constants/leadStatus";
import styles from "./sale-leads.module.css";

export interface SaleLeadsToolbarProps {
  statusFilter: LeadStatus | "all";
  onStatusChange: (status: LeadStatus | "all") => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  total: number;
}

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all" as const, label: "Tất cả" },
  { value: LeadStatus.NEW, label: "Mới" },
  { value: LeadStatus.CONTACTED, label: "Đã liên hệ" },
  { value: LeadStatus.NO_ANSWER, label: "K nghe" },
  { value: LeadStatus.QUALIFIED, label: "Đủ điều kiện" },
  { value: LeadStatus.POTENTIAL, label: "Tiềm năng" },
  { value: LeadStatus.CLOSED, label: "Đã chốt" },
  { value: LeadStatus.LOST, label: "Mất" },
];

export default function SaleLeadsToolbar({
  statusFilter,
  onStatusChange,
  keyword,
  onKeywordChange,
  onRefresh,
  loading,
  total,
}: SaleLeadsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.statusFilters}>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type={statusFilter === option.value ? "primary" : "default"}
              size="small"
              onClick={() => onStatusChange(option.value)}
              className={statusFilter === option.value ? styles.activeFilter : ""}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarRight}>
        <span className={styles.totalCount}>Tổng: {total}</span>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>
    </div>
  );
}
