/**
 * Sale Leads Page - Số cần gọi (Sprint 8.5)
 *
 * Trang này hiển thị danh sách khách hàng được phân công cho Sale.
 * Sale có thể cập nhật trạng thái và chốt đơn.
 * Admin/Manager có thể xem tất cả và phân công lại.
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
import LeadDetailModal from "@/components/sale/leads/LeadDetailModal";
import EditLeadModal from "@/components/sale/leads/EditLeadModal";
import CheckCustomerForm from "@/components/marketing/input/CheckCustomerForm";
import { useAuthStore } from "@/store/auth.store";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "@/components/sale/leads/sale-leads.module.css";

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export default function SaleLeadsPage() {
  // Get user role from auth store
  const user = useAuthStore((state) => state.user);
  const { message } = App.useApp();
  const roleCode = user?.role;
  const isAdminOrManager = roleCode === "ADMIN" || roleCode === "MANAGER";

  // State
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [convertingLead, setConvertingLead] = useState<SaleLead | null>(null);
  const [reassigningLead, setReassigningLead] = useState<SaleLead | null>(null);
  const [loggingCallLead, setLoggingCallLead] = useState<SaleLead | null>(null);
  const [viewingLead, setViewingLead] = useState<SaleLead | null>(null);
  const [editingLead, setEditingLead] = useState<SaleLead | null>(null);
  const [checkCustomerQuery, setCheckCustomerQuery] = useState<string | null>(null);
  const [checkCustomerInput, setCheckCustomerInput] = useState("");
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
            void message.success(getTranslated("Đã cập nhật trạng thái"));
          },
          onError: (err) => {
            void message.error(getTranslated("Lỗi: ${err.message}").replace("${err.message}", err.message));
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
        void message.warning(getTranslated("Khách hàng phải ở trạng thái Tiềm năng hoặc Đủ điều kiện để chốt đơn"));
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
        void message.success(getTranslated("Đã tạo đơn hàng thành công"));
        setConvertingLead(null);
        void refetch();
      },
      onError: (err) => {
        void message.error(getTranslated("Lỗi: ${err.message}").replace("${err.message}", err.message));
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

  // Handle view detail
  const handleViewDetail = useCallback((lead: SaleLead) => {
    setViewingLead(lead);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setViewingLead(null);
  }, []);

  // Handle edit
  const handleEdit = useCallback((lead: SaleLead) => {
    setEditingLead(lead);
  }, []);

  const handleEditSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCloseEdit = useCallback(() => {
    setEditingLead(null);
  }, []);

  // Handle check customer - open the check customer form with query
  const handleOpenCheckCustomer = useCallback((query?: string) => {
    setCheckCustomerQuery(query ?? "");
    if (query) setCheckCustomerInput(query);
  }, []);

  const handleCheckCustomerChange = useCallback((value: string) => {
    setCheckCustomerInput(value);
  }, []);

  const handleCloseCheckCustomer = useCallback(() => {
    setCheckCustomerQuery(null);
    setCheckCustomerInput("");
  }, []);

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
        title={getTranslated("Số cần gọi")}
        subtitle={isAdminOrManager ? getTranslated("Danh sách khách hàng - Quản lý toàn bộ / Danh sách khách hàng được phân công cho bạn") : getTranslated("Danh sách khách hàng - Quản lý toàn bộ / Danh sách khách hàng được phân công cho bạn")}
      />

      <CardSection>
        {/* Stats Banner */}
        <PageStatsBanner
          stats={[
            {
              key: "total",
              value: counts.total,
              label: getTranslated("Tổng số"),
              icon: <PhoneOutlined style={{ color: "#1890ff" }} />,
              color: "blue",
            },
            {
              key: "new",
              value: counts.new,
              label: getTranslated("Mới"),
              icon: <PlusOutlined style={{ color: "#722ed1" }} />,
              color: "purple",
            },
            {
              key: "noAnswer",
              value: counts.noAnswer,
              label: getTranslated("Không nghe máy"),
              icon: <ClockCircleOutlined style={{ color: "#fa8c16" }} />,
              color: "orange",
            },
            {
              key: "potential",
              value: counts.potential,
              label: getTranslated("Tiềm năng"),
              icon: <TrophyOutlined style={{ color: "#52c41a" }} />,
              color: "green",
            },
            {
              key: "closed",
              value: counts.closed,
              label: getTranslated("Đã chốt đơn"),
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
          checkCustomerValue={checkCustomerInput}
          onCheckCustomerChange={handleCheckCustomerChange}
          onCheckCustomer={handleOpenCheckCustomer}
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
            <p className={styles.emptyText}>Không có khách hàng nào cần xử lý</p>
          </div>
        ) : (
          <>
            <SaleLeadTable
              data={leads}
              onUpdateStatus={handleUpdateStatus}
              onConvert={handleConvert}
              onLogCall={handleLogCall}
              onReassign={isAdminOrManager ? handleReassign : undefined}
              onViewDetail={handleViewDetail}
              onEdit={handleEdit}
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
                showTotal={(t) => `Tổng: ${t} khách hàng`}
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

      {/* Lead Detail Modal */}
      <LeadDetailModal
        open={!!viewingLead}
        lead={viewingLead}
        onClose={handleCloseDetail}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        open={!!editingLead}
        lead={editingLead}
        onClose={handleCloseEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Check Customer Form - hiển thị khi click nút Check khách */}
      {checkCustomerQuery !== undefined && (
        <div style={{ marginTop: 16 }}>
          <CheckCustomerForm
            initialValue={checkCustomerQuery}
            placeholder="Nhập SĐT hoặc tên khách hàng để tra cứu..."
            buttonLabel="Tra cứu"
          />
        </div>
      )}
    </PageContainer>
  );
}
