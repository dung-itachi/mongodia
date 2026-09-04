/**
 * Sale Leads Page - Số cần gọi (Sprint 8.5+)
 *
 * Trang này hiển thị danh sách khách hàng được phân công cho Sale.
 * Sale có thể cập nhật trạng thái và chốt đơn.
 * Admin/Manager có thể xem tất cả và phân công lại.
 *
 * Cấu trúc chi tiết (Sprint 8.x+):
 * - Stats card với Doanh thu từ các đơn đã chốt + Tổng khách + Phân bổ trạng thái
 * - Toolbar với filter trạng thái + check khách
 * - Bulk actions cho Admin/Manager
 * - Table với đầy đủ thông tin: Mã, TG đơn hàng, TG nhận đơn, Tên, SĐT, SĐT 2,
 *   Địa chỉ, MKT phụ trách, Sale phụ trách, Nguồn, Sản phẩm, Combo, SL,
 *   Giá combo, Doanh thu, Trang FB, Ghi chú, Trạng thái, Thao tác
 * - Modal chi tiết với 4 tabs: Thông tin / Lịch sử / Timeline / Cuộc gọi
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  useSaleLeadStats,
  useUpdateLeadStatus,
  type SaleLead,
} from "@/hooks/useSaleLeads";
import { useConvertLead } from "@/hooks/useConvertLead";
import { useShippingFee } from "@/hooks/useShippingFee";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import SaleOrderModal from "@/components/sale/leads/SaleOrderModal";
import ReassignModal from "@/components/sale/leads/ReassignLeadModal";
import BulkReassignToolbar from "@/components/sale/leads/BulkReassignToolbar";
import type { OrderItem } from "@/types/variant";
import { LeadStatus } from "@/constants/leadStatus";
import SaleLeadsToolbar from "@/components/sale/leads/SaleLeadsToolbar";
import SaleLeadTable from "@/components/sale/leads/SaleLeadTable";
import SaleLeadsStatsCard from "@/components/sale/leads/SaleLeadsStatsCard";
import LogCallModal from "@/components/sale/leads/LogCallModal";
import LeadStatusLegend from "@/components/sale/leads/LeadStatusLegend";
import EditLeadModal from "@/components/sale/leads/EditLeadModal";
import SaleLeadDetailView from "@/components/sale/leads/SaleLeadDetailView";
import LeadAssignmentModeToggle from "@/components/marketing/leads/LeadAssignmentModeToggle";
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
  const lang = useLanguageStore((s) => s.language);
  const router = useRouter();
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

  // Currency state hoisted to share with stats card + table
  const [currency, setCurrency] = useState<"MNT" | "VND">("MNT");

  // Queries
  const { leads, total, loading, refetch } = useSaleLeads({
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    page,
    limit,
  });

  const { counts } = useSaleLeadCounts();
  const { stats: ordersStats, loading: statsLoading } = useSaleLeadStats();

  // Mutations
  const updateStatusMutation = useUpdateLeadStatus();
  const convertMutation = useConvertLead();

  // Phí ship hiện tại (MNT) — dùng để tính cột Doanh thu = giá combo - phí ship
  const { data: shippingFeeData } = useShippingFee();
  const shippingFee = shippingFeeData?.fee ?? 0;

  // Tỷ giá MNT → VND — click vào ô tiền sẽ toggle MNT ↔ VND
  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.rate ?? 0;

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
      // Check if lead already converted
      if (lead.isConverted) {
        void message.warning(getTranslated("Lead đã được chốt đơn trước đó"));
        return;
      }

      // Check if lead status allows conversion
      if (
        lead.status !== LeadStatus.NEW &&
        lead.status !== LeadStatus.QUALIFIED &&
        lead.status !== LeadStatus.POTENTIAL
      ) {
        void message.warning(getTranslated("Khách hàng phải ở trạng thái Mới, Tiềm năng hoặc Đủ điều kiện để chốt đơn"));
        return;
      }

      setConvertingLead(lead);
    },
    []
  );

  const handleConfirmConvert = useCallback((
    orderItem: OrderItem,
    isPrepaid?: boolean,
    prepaymentAmount?: number,
    manualRevenue?: {
      marketingRevenue?: number;
      saleRevenue?: number;
    }
  ) => {
    if (!convertingLead) return;

    // DEBUG
    console.log("[handleConfirmConvert] giftMode:", orderItem.giftMode, "| giftSelections:", orderItem.giftSelections);
    console.log("[handleConfirmConvert] items[0] from items state");

    // Sprint 8.7 — Lưu variantDetails mới nhất (vừa chốt) lên Lead để audit/revert.
    const payload = {
      variantDetails: orderItem.details.map((d) => ({
        quantity: d.quantity,
        attributes: d.attributes.map((a) => ({
          optionId: a.optionId,
          valueId: a.valueId,
          optionName: a.optionName,
          valueName: a.valueName,
        })),
        variantId: d.variantId ?? "",
      })),
      giftMode: orderItem.giftMode,
      giftSelections: orderItem.giftSelections.map((g) => ({
        giftProductId: g.giftProductId,
        giftProductName: g.giftProductName ?? "",
        quantity: g.quantity,
      })),
    };

    convertMutation.mutate({
      leadId: convertingLead._id,
      orderItem,
      isPrepaid,
      prepaymentAmount,
      manualRevenue,
    }, {
      onSuccess: (result) => {
        const orderId = result?.orderId;
        // Best-effort: persist latest variant details snapshot (không block convert).
        void fetch(`/api/sale/leads/${convertingLead._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => undefined);
        void message.success(getTranslated("Đã tạo đơn hàng thành công"));
        setConvertingLead(null);
        void refetch();
        // Redirect sang trang chi tiết đơn vừa tạo để xem lại phần quà
        if (orderId) {
          void router.push(`/orders/${orderId}`);
        }
      },
      onError: (err) => {
        void message.error(getTranslated("Lỗi: ${err.message}").replace("${err.message}", err.message));
      },
    });
  }, [convertingLead, convertMutation, refetch, router]);

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
        {/* Stats Banner — quick glance counts */}
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

        {/* Assignment Mode Toggle - Only for Admin/Manager */}
        {isAdminOrManager && (
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <LeadAssignmentModeToggle />
          </div>
        )}

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

        {/* Stats card with revenue + status breakdown (Sprint 8.x+) */}
        <SaleLeadsStatsCard
          stats={ordersStats}
          loading={statsLoading}
          currency={currency}
          onToggleCurrency={() =>
            setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))
          }
          exchangeRate={exchangeRate}
        />

        {/* Table */}
        {loading && leads.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>{t("Đang tải dữ liệu...", lang)}</p>
          </div>
        ) : leads.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>{t("Không có khách hàng nào cần xử lý", lang)}</p>
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
              shippingFee={shippingFee}
              exchangeRate={exchangeRate}
              currency={currency}
              onCurrencyToggle={() =>
                setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))
              }
            />

            {total > 0 && (
              <PaginationComponent
                current={page}
                pageSize={limit}
                total={total}
                onChange={handlePageChange}
                showTotal={(total) => `${t("Tổng:", lang)} ${total} ${t("khách hàng", lang)}`}
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
        onConvert={() => {
          if (loggingCallLead) {
            setLoggingCallLead(null);
            setConvertingLead(loggingCallLead);
          }
        }}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        open={!!editingLead}
        lead={editingLead}
        onClose={handleCloseEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Lead Detail Modal — Tabs view với 4 tab */}
      {viewingLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDetail();
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 1100,
              padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserOutlined style={{ fontSize: 18, color: "#1890ff" }} />
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {t("Chi tiết Khách hàng", lang)}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    color: "#1890ff",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {viewingLead.leadCode}
                </span>
              </div>
              <button
                onClick={handleCloseDetail}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#8c8c8c",
                }}
                aria-label={t("Đóng", lang)}
              >
                ✕
              </button>
            </div>
            <SaleLeadDetailView
              lead={viewingLead}
              onEdit={() => {
                setEditingLead(viewingLead);
                handleCloseDetail();
              }}
              onClose={handleCloseDetail}
              onReassign={
                isAdminOrManager
                  ? () => {
                      setReassigningLead(viewingLead);
                      handleCloseDetail();
                    }
                  : undefined
              }
              onLogCall={
                !viewingLead.isConverted
                  ? () => {
                      setLoggingCallLead(viewingLead);
                      handleCloseDetail();
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Check Customer Form - hiển thị khi click nút Check khách */}
      {checkCustomerQuery !== undefined && (
        <div style={{ marginTop: 16 }}>
          <CheckCustomerForm
            initialValue={checkCustomerQuery ?? undefined}
            placeholder={t("Nhập SĐT hoặc tên khách hàng để tra cứu...", lang)}
            buttonLabel={t("Tra cứu", lang)}
          />
        </div>
      )}
    </PageContainer>
  );
}