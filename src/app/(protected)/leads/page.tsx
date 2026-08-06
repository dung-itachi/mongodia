/**
 * Sale Leads Page - Số cần gọi (Sprint 8.5)
 *
 * Trang này hiển thị danh sách leads được phân công cho Sale.
 * Sale có thể cập nhật trạng thái lead và chốt đơn.
 */

"use client";

import { useState, useCallback } from "react";
import { message, Modal } from "antd";
import {
  PhoneOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  PaginationComponent,
} from "@/components/common";
import {
  useSaleLeads,
  useSaleLeadCounts,
  useUpdateLeadStatus,
  type SaleLead,
} from "@/hooks/useSaleLeads";
import { useConvertLead } from "@/hooks/useMarketingLeads";
import { LeadStatus } from "@/constants/leadStatus";
import SaleLeadsToolbar from "@/components/sale/leads/SaleLeadsToolbar";
import SaleLeadTable from "@/components/sale/leads/SaleLeadTable";
import styles from "@/components/sale/leads/sale-leads.module.css";

export default function SaleLeadsPage() {
  // State
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [convertingLead, setConvertingLead] = useState<SaleLead | null>(null);

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

  const handleConfirmConvert = useCallback(() => {
    if (!convertingLead) return;

    convertMutation.mutate(convertingLead._id, {
      onSuccess: (result) => {
        void message.success("Đã tạo đơn hàng thành công");
        setConvertingLead(null);
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
        setConvertingLead(null);
      },
    });
  }, [convertingLead, convertMutation]);

  const handlePageChange = useCallback((newPage: number, newLimit: number) => {
    setPage(newPage);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Số cần gọi"
        subtitle="Danh sách leads được phân công cho bạn"
      />

      <CardSection>
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: "#1890ff" }}>
              {counts.total}
            </div>
            <div className={styles.statLabel}>Tổng số</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: "#1890ff" }}>
              {counts.new}
            </div>
            <div className={styles.statLabel}>Mới</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: "#fa8c16" }}>
              {counts.noAnswer}
            </div>
            <div className={styles.statLabel}>K nghe</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: "#52c41a" }}>
              {counts.potential}
            </div>
            <div className={styles.statLabel}>Tiềm năng</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: "#52c41a" }}>
              {counts.closed}
            </div>
            <div className={styles.statLabel}>Đã chốt</div>
          </div>
        </div>

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
        />

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
              loading={loading}
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

      {/* Convert Confirmation Modal */}
      <Modal
        title={
          <span>
            <SwapOutlined style={{ marginRight: 8, color: "#52c41a" }} />
            Xác nhận chốt đơn
          </span>
        }
        open={!!convertingLead}
        onOk={handleConfirmConvert}
        onCancel={() => setConvertingLead(null)}
        okText="Chốt đơn"
        cancelText="Hủy"
        okButtonProps={{
          icon: <SwapOutlined />,
          loading: convertMutation.isPending,
        }}
      >
        {convertingLead && (
          <div>
            <p>
              Bạn có chắc muốn chốt đơn cho khách hàng{" "}
              <strong>{convertingLead.customerName}</strong>?
            </p>
            <p>
              SĐT: <strong>{convertingLead.phone || "-"}</strong>
            </p>
            <p style={{ color: "#8c8c8c", marginTop: 8 }}>
              Hệ thống sẽ tạo đơn hàng và Lead sẽ không xuất hiện trong danh
              sách này nữa.
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
