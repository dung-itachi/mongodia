/**
 * ==================================================
 * MARKETING EXPENSE DETAIL TABS CONFIG
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Config cho các tabs trong detail page.
 */

import { Card, Descriptions, Row, Col } from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  FacebookOutlined,
} from "@ant-design/icons";

import type { MarketingExpenseResponse } from "@/mappers/marketing-expense.mapper";
import { AuditCard } from "@/components/common";
import type { AuditItem } from "@/components/common";
import MarketingExpenseSummaryCard from "@/components/marketing-expense/MarketingExpenseSummaryCard";
import MarketingExpenseTimeline from "@/components/marketing-expense/MarketingExpenseTimeline";
import StatusBadge from "@/components/common/display/StatusBadge";
import { marketingExpenseStatusConfig } from "@/configs/marketing-expense-status.config";

import styles from "@/components/marketing-expense/marketing-expense-detail.module.css";

// ============================================================================
// Helpers
// ============================================================================

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const getEmployeeName = (
  employee?: { fullName: string; employeeCode: string } | null
): React.ReactNode => {
  if (!employee) return null;
  return `${employee.fullName} (${employee.employeeCode})`;
};

// ============================================================================
// Tab Content Components
// ============================================================================

function BudgetAllocationCard({
  title,
  data,
}: {
  title: string;
  data?: { morning: number; afternoon: number; emergency: number };
}) {
  const budget = data ?? { morning: 0, afternoon: 0, emergency: 0 };
  const total = budget.morning + budget.afternoon + budget.emergency;

  return (
    <Card title={title} size="small" className={styles.budgetCard}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Sáng">{budget.morning.toLocaleString("vi-VN")}</Descriptions.Item>
        <Descriptions.Item label="Chiều">{budget.afternoon.toLocaleString("vi-VN")}</Descriptions.Item>
        <Descriptions.Item label="Khẩn cấp">{budget.emergency.toLocaleString("vi-VN")}</Descriptions.Item>
        <Descriptions.Item label="Tổng">
          <strong>{total.toLocaleString("vi-VN")}</strong>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

// ============================================================================
// Tab Content Functions
// ============================================================================

function buildInfoTabContent(data: MarketingExpenseResponse) {
  const auditItems: AuditItem[] = [
    { label: "Người tạo", value: getEmployeeName(data.createdByEmployee) },
    { label: "Thời gian tạo", value: formatDateTime(data.createdAt) },
    { label: "Thời gian sửa", value: formatDateTime(data.updatedAt) },
    // Locked
    ...(data.lockedBy
      ? [
          { label: "Người khóa", value: getEmployeeName(data.lockedByEmployee) },
          { label: "Thời gian khóa", value: formatDateTime(data.lockedAt) },
        ]
      : []),
    // Reopened
    ...(data.reopenedBy
      ? [
          { label: "Người mở lại", value: getEmployeeName(data.reopenedByEmployee) },
          { label: "Thời gian mở lại", value: formatDateTime(data.reopenedAt) },
        ]
      : []),
  ];

  return (
    <Card title="Thông tin báo cáo" className={styles.infoCard}>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Ngày báo cáo">
          <CalendarOutlined /> {formatDate(data.reportDate)}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <StatusBadge
            status={data.status}
            mapping={marketingExpenseStatusConfig as unknown as Record<string, { color: string; backgroundColor: string; label: string }>}
            size="small"
          />
        </Descriptions.Item>
        <Descriptions.Item label="Nhân viên marketing">
          {data.marketingEmployee ? (
            <>
              <UserOutlined /> {data.marketingEmployee.fullName} ({data.marketingEmployee.employeeCode})
            </>
          ) : (
            "-"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Facebook Page">
          {data.facebookPage ? (
            <>
              <FacebookOutlined /> {data.facebookPage.name} ({data.facebookPage.code})
            </>
          ) : (
            "-"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú" span={2}>
          {data.note || "-"}
        </Descriptions.Item>
      </Descriptions>

      <div className={styles.auditSection}>
        <AuditCard items={auditItems} />
      </div>
    </Card>
  );
}

function buildBudgetTabContent(data: MarketingExpenseResponse) {
  return (
    <Card title="Phân bổ ngân sách" className={styles.budgetTab}>
      <Row gutter={16}>
        <Col span={8}>
          <BudgetAllocationCard title="Ngân sách yêu cầu" data={data.requestedBudget} />
        </Col>
        <Col span={8}>
          <BudgetAllocationCard title="Ngân sách thực chi" data={data.spentBudget} />
        </Col>
        <Col span={8}>
          <BudgetAllocationCard title="Ngân sách còn lại" data={data.remainingBudget} />
        </Col>
      </Row>
    </Card>
  );
}

function buildSummaryTabContent(data: MarketingExpenseResponse) {
  return (
    <Card title="Hiệu suất" className={styles.summaryTab}>
      <MarketingExpenseSummaryCard
        requestedBudget={data.requestedBudget}
        spentBudget={data.spentBudget}
        totalRevenue={data.totalRevenue}
        totalLeads={data.totalLeads}
        closedLeads={data.closedLeads}
      />
    </Card>
  );
}

// ============================================================================
// Tabs Config
// ============================================================================

export interface DetailTabConfig {
  key: string;
  label: string;
  buildContent: (data: MarketingExpenseResponse) => React.ReactNode;
}

export const MARKETING_EXPENSE_DETAIL_TABS: DetailTabConfig[] = [
  {
    key: "info",
    label: "Thông tin",
    buildContent: buildInfoTabContent,
  },
  {
    key: "budget",
    label: "Phân bổ ngân sách",
    buildContent: buildBudgetTabContent,
  },
  {
    key: "summary",
    label: "Hiệu suất",
    buildContent: buildSummaryTabContent,
  },
  {
    key: "timeline",
    label: "Lịch sử",
    buildContent: () => (
      <MarketingExpenseTimeline
        history={[]}
        loading={false}
      />
    ),
  },
];
