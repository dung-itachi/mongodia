/**
 * Sale Leads Toolbar Component (Sprint 8.5)
 *
 * Toolbar for Sale leads page with status filters.
 */

import { useState } from "react";
import { Button, Input } from "antd";
import { ReloadOutlined, QuestionCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { LeadStatus } from "@/constants/leadStatus";
import styles from "./sale-leads.module.css";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export interface SaleLeadsToolbarProps {
  statusFilter: LeadStatus | "all";
  onStatusChange: (status: LeadStatus | "all") => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onRefresh: () => void;
  checkCustomerValue?: string;
  onCheckCustomerChange?: (value: string) => void;
  onCheckCustomer?: (value: string) => void;
  loading?: boolean;
  total: number;
  onShowLegend?: () => void;
}

const STATUS_OPTIONS: { value: LeadStatus | "all"; labelKey: string }[] = [
  { value: "all" as const, labelKey: "Tất cả" },
  { value: LeadStatus.NEW, labelKey: "Mới" },
  { value: LeadStatus.CONTACTED, labelKey: "Đã liên hệ" },
  { value: LeadStatus.NO_ANSWER, labelKey: "K nghe" },
  { value: LeadStatus.QUALIFIED, labelKey: "Đủ điều kiện" },
  { value: LeadStatus.POTENTIAL, labelKey: "Tiềm năng" },
  { value: LeadStatus.CLOSED, labelKey: "Đã chốt" },
  { value: LeadStatus.LOST, labelKey: "Không mua" },
];

export default function SaleLeadsToolbar({
  statusFilter,
  onStatusChange,
  keyword,
  onKeywordChange,
  onRefresh,
  checkCustomerValue,
  onCheckCustomerChange,
  onCheckCustomer,
  loading,
  total,
  onShowLegend,
}: SaleLeadsToolbarProps) {
  const lang = useLanguageStore((s) => s.language);
  const [checkInput, setCheckInput] = useState("");

  const handleCheckSubmit = () => {
    const value = checkCustomerValue ?? checkInput;
    if (value.trim()) {
      onCheckCustomer?.(value.trim());
    }
  };

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
              {t(option.labelKey, lang)}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarRight}>
        <Input.Search
          placeholder={t("Nhập SĐT hoặc tên khách hàng để tra cứu...", lang)}
          value={checkCustomerValue ?? checkInput}
          onChange={(e) => {
            const val = e.target.value;
            setCheckInput(val);
            onCheckCustomerChange?.(val);
          }}
          onSearch={handleCheckSubmit}
          onPressEnter={handleCheckSubmit}
          enterButton={
            <Button
              type="primary"
              icon={<SearchOutlined />}
              className={styles.checkCustomerToolbarBtn}
            >
              {t("Check khách", lang)}
            </Button>
          }
          className={styles.checkCustomerInput}
          allowClear
        />
        <span className={styles.totalCount}>{t("Tổng: ${total}", lang).replace("${total}", String(total))}</span>
        {onShowLegend && (
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={onShowLegend}
            title={t("Xem ý nghĩa các trạng thái", lang)}
          >
            {t("Trạng thái", lang)}
          </Button>
        )}
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          {t("Làm mới", lang)}
        </Button>
      </div>
    </div>
  );
}
