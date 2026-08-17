/**
 * Sale Leads Page - Số cần gọi (Sprint 8.5)
 *
 * Trang này hiển thị danh sách leads được phân công cho Sale.
 * Sale có thể cập nhật trạng thái lead và chốt đơn.
 * Admin/Manager có thể xem tất cả leads và phân công lại.
 */

"use client";

import { useState, useCallback } from "react";
import { App } from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  PaginationComponent,
  PageStatsBanner,
} from "@/components/common";
import {
  useSaleLeads,
  useSaleLeadCounts,
  useUpdateLeadStatus,
  type SaleLead,
} from "@/hooks/useSaleLeads";
import { useConvertLead } from "@/hooks/useConvertLead";
import SaleOrderModal from "@/components/sale/leads/SaleOrderModal";
import ReassignModal from "@/components/sale/leads/ReassignLeadModal";
import BulkReassignToolbar from "@/components/sale/leads/BulkReassignToolbar";
import type { OrderItem } from "@/types/variant";
import { LeadStatus } from "@/constants/leadStatus";
import SaleLeadsToolbar from "@/components/sale/leads/SaleLeadsToolbar";
import SaleLeadTable from "@/components/sale/leads/SaleLeadTable";
import LogCallModal from "@/components/sale/leads/LogCallModal";
import LeadStatusLegend from "@/components/sale/leads/LeadStatusLegend";
import { useAuthStore } from "@/store/auth.store";
import styles from "@/components/sale/leads/sale-leads.module.css";

export default function SaleLeadsPage() {
  // Get user role from auth store
  const user = useAuthStore((state) => state.user);
  const { message } = App.useApp();
  const roleCode = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const isAdminOrManager = roleCode === "ADMIN" || roleCode === "MANAGER";

  // State
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [convertingLead, setConvertingLead] = useState<SaleLead | null>(null);
  const [reassigningLead, setReassigningLead] = useState<SaleLead | null>(null);
  const [loggingCallLead, setLoggingCallLead] = useState<SaleLead | null>(null);
  // Row selection for bulk operations
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [legendOpen, setLegendOpen] = useState(false);

  // Queries
  const { leads, total, loading, refetch } = useSaleLeads({
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    page,
    limit,
  });

  const { counts } = useSaleLeadCounts();

  // Mutations
  const updateStatusMutation = useUpdateLeadStatus();
  const convertMutation = useConvertLead();

  // Handlers
  const handleStatusChange = useCallback((status: LeadStatus | "all") => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleUpdateStatus = useCallback(
    (lead: SaleLead, newStatus: LeadStatus) => {
      updateStatusMutation.mutate(
        { leadId: lead._id, status: newStatus },
        {
          onSuccess: () => {
            void message.success(`Đã cập nhật trạng thái`);
          },
          onError: (err) => {
            void message.error(`Lỗi: ${err.message}`);
          },
        }
      );
    },
    [updateStatusMutation]
  );

  const handleConvert = useCallback(
    (lead: SaleLead) => {
      // Check if lead status allows conversion
      if (
        lead.status !== LeadStatus.POTENTIAL &&
        lead.status !== LeadStatus.QUALIFIED
      ) {
        void message.warning("Lead phải ở trạng thái Tiềm năng hoặc Đủ điều kiện để chốt đơn");
        return;
      }

      setConvertingLead(lead);
    },
    []
  );

  const handleConfirmConvert = useCallback((orderItem: OrderItem) => {
    if (!convertingLead) return;

    convertMutation.mutate({ leadId: convertingLead._id, orderItem }, {
      onSuccess: () => {
        void message.success("Đã tạo đơn hàng thành công");
        setConvertingLead(null);
        void refetch();
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
      },
    });
  }, [convertingLead, convertMutation, refetch]);

  const handlePageChange = useCallback((newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
    setSelectedKeys([]);
  }, []);

  // Handle reassign (Admin/Manager only)
  const handleReassign = useCallback((lead: SaleLead) => {
    setReassigningLead(lead);
  }, []);

  const handleReassignSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Handle log call (Module 6)
  const handleLogCall = useCallback((lead: SaleLead) => {
    setLoggingCallLead(lead);
  }, []);

  const handleLogCallSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Handle selection change
  const handleSelectionChange = useCallback((keys: string[]) => {
    setSelectedKeys(keys);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Số cần gọi"
        subtitle={isAdminOrManager ? "Danh sách leads - Quản lý toàn bộ" : "Danh sách leads được phân công cho bạn"}
      />

      <CardSection>
        {/* Stats Banner */}
        <PageStatsBanner
          stats={[
            {
              key: "total",
              value: counts.total,
              label: "Tổng số",
              icon: <PhoneOutlined style={{ color: "#1890ff" }} />,
              color: "blue",
            },
            {
              key: "new",
              value: counts.new,
              label: "Mới",
              icon: <PlusOutlined style={{ color: "#722ed1" }} />,
              color: "purple",
            },
            {
              key: "noAnswer",
              value: counts.noAnswer,
              label: "Không nghe máy",
              icon: <ClockCircleOutlined style={{ color: "#fa8c16" }} />,
              color: "orange",
            },
            {
              key: "potential",
              value: counts.potential,
              label: "Tiềm năng",
              icon: <TrophyOutlined style={{ color: "#52c41a" }} />,
              color: "green",
            },
            {
              key: "closed",
              value: counts.closed,
              label: "Đã chốt đơn",
              icon: <CheckCircleOutlined style={{ color: "#13c2c2" }} />,
              color: "cyan",
            },
          ]}
          loading={loading}
          style={{ marginBottom: 16 }}
        />

        {/* Toolbar */}
        <SaleLeadsToolbar
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          keyword=""
          onKeywordChange={() => {}}
          onRefresh={() => {
            void refetch();
          }}
          loading={loading}
          total={total}
          onShowLegend={() => setLegendOpen(true)}
        />

        {/* Bulk Reassign Toolbar - Only for Admin/Manager */}
        {isAdminOrManager && (
          <BulkReassignToolbar
            selectedCount={selectedKeys.length}
            selectedKeys={selectedKeys}
            onClearSelection={handleClearSelection}
            onSuccess={() => {
              void refetch();
              handleClearSelection();
            }}
          />
        )}

        {/* Table */}
        {loading && leads.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>Đang tải dữ liệu...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>Không có lead nào cần xử lý</p>
          </div>
        ) : (
          <>
            <SaleLeadTable
              data={leads}
              onUpdateStatus={handleUpdateStatus}
              onConvert={handleConvert}
              onLogCall={handleLogCall}
              onReassign={isAdminOrManager ? handleReassign : undefined}
              canReassign={isAdminOrManager}
              loading={loading}
              selectionType={isAdminOrManager ? "checkbox" : "none"}
              selectedRowKeys={selectedKeys}
              onSelectionChange={handleSelectionChange}
            />

            {total > 0 && (
              <PaginationComponent
                current={page}
                pageSize={limit}
                total={total}
                onChange={handlePageChange}
                showTotal={(t) => `Tổng: ${t} leads`}
              />
            )}
          </>
        )}
      </CardSection>

      <SaleOrderModal
        lead={convertingLead}
        loading={convertMutation.isPending}
        onClose={() => setConvertingLead(null)}
        onConfirm={handleConfirmConvert}
      />

      <ReassignModal
        open={!!reassigningLead}
        lead={reassigningLead}
        onClose={() => setReassigningLead(null)}
        onSuccess={handleReassignSuccess}
      />

      <LeadStatusLegend
        open={legendOpen}
        onClose={() => setLegendOpen(false)}
      />

      <LogCallModal
        open={!!loggingCallLead}
        lead={loggingCallLead}
        onClose={() => setLoggingCallLead(null)}
        onSuccess={handleLogCallSuccess}
      />
    </PageContainer>
  );
}
