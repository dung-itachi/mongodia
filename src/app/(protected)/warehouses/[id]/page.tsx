"use client";

/**
 * ==================================================
 * WAREHOUSE DETAIL PAGE
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Display warehouse task details with order info, status workflow, and timeline.
 */

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Row, Col, Table, App, Dropdown, Space, Modal, Button,
} from "antd";
import type { TableColumnsType } from "antd";
import type { MenuProps } from "antd";
import {
  ClockCircleOutlined,
  DownOutlined,
  UserOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import StatusBadge from "@/components/common/display/StatusBadge";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonCard from "@/components/common/overlay/SkeletonCard";
import PermissionGate from "@/components/common/PermissionGate";
import LoadingOverlay from "@/components/common/overlay/LoadingOverlay";
import InventorySection from "@/components/inventory/InventorySection";

import {
  useWarehouseTask,
  useChangeWarehouseStatus,
  type WarehouseHistoryItem,
} from "@/hooks/useWarehouseTasks";
import { WAREHOUSE_STATUS_LABELS } from "@/constants/warehouseStatus";
import { getWarehouseStatusActions } from "@/configs/warehouse-status.config";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WarehouseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  // Fetch warehouse task
  const { task, histories, loading, error, refetch } = useWarehouseTask(id);

  // Status change state
  const [statusTarget, setStatusTarget] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const statusMutation = useChangeWarehouseStatus();

  // Confirm dialog state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Handle status change click
  const handleStatusClick = useCallback((newStatus: string) => {
    setStatusTarget(newStatus);
    setConfirmVisible(true);
  }, []);

  // Handle status change confirm
  const handleStatusConfirm = useCallback(async () => {
    if (!statusTarget) return;

    setConfirmLoading(true);
    try {
      await statusMutation.mutateAsync({
        id,
        data: { status: statusTarget },
      });
      messageApi.success("Đổi trạng thái thành công");
      setConfirmVisible(false);
      setStatusTarget(null);
      await refetch();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "Đổi trạng thái thất bại");
    } finally {
      setConfirmLoading(false);
    }
  }, [id, statusTarget, statusMutation, refetch, messageApi]);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Get status actions
  const statusActions = useMemo(() => {
    if (!task) return [];
    return getWarehouseStatusActions(task.warehouseStatus);
  }, [task]);

  // Build dropdown menu items
  const statusMenuItems: MenuProps["items"] = statusActions.map((action) => ({
    key: action.targetStatus,
    label: (
      <Space>
        <span style={{ color: action.color ?? undefined }}>{action.label}</span>
      </Space>
    ),
    onClick: () => handleStatusClick(action.targetStatus),
  }));

  // Timeline columns
  const timelineColumns: TableColumnsType<WarehouseHistoryItem> = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 180,
      render: (value: string) => {
        const label = WAREHOUSE_STATUS_LABELS[value as keyof typeof WAREHOUSE_STATUS_LABELS] || value;
        return <StatusBadge status={value} />;
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (value: string | null) => value || "-",
    },
  ];

  // Loading state
  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard />
      </PageContainer>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <PageContainer>
        <EmptyState
          title="Không tìm thấy task"
          description={error?.message || "Warehouse task không tồn tại"}
        />
      </PageContainer>
    );
  }

  // Get target status label for confirm dialog
  const targetStatusLabel = statusTarget
    ? WAREHOUSE_STATUS_LABELS[statusTarget as keyof typeof WAREHOUSE_STATUS_LABELS] || statusTarget
    : "";

  return (
    <PageContainer>
      {loading && !task && <LoadingOverlay fullScreen text="Đang tải..." />}

      <PageHeader
        title="Chi tiết Warehouse Task"
        subtitle={`Task #${task._id.slice(-8).toUpperCase()} • Đơn ${task.orderCode ?? task.orderId.slice(-8).toUpperCase()}`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: `Task #${task._id.slice(-8).toUpperCase()}` },
        ]}
        actions={
          <PermissionGate permission="warehouse.update">
            {statusActions.length > 0 && (
              <Dropdown
                trigger={["click"]}
                menu={{ items: statusMenuItems }}
                getPopupContainer={() => document.body}
              >
                <Button
                  type="primary"
                  icon={<DownOutlined />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  Hành động
                </Button>
              </Dropdown>
            )}
          </PermissionGate>
        }
      />

      <Row gutter={16}>
        {/* Left Column - Task Info */}
        <Col span={16}>
          {/* Warehouse Status Card */}
          <CardSection title="Trạng thái">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                    Trạng thái hiện tại
                  </div>
                  <StatusBadge
                    status={task.warehouseStatus}
                    showIcon
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                    Nhân viên phụ trách
                  </div>
                  <div>
                    {task.assignedEmployeeId ? (
                      <span>{task.assignedEmployeeId.slice(-6).toUpperCase()}</span>
                    ) : (
                      <span style={{ color: "#8c8c8c" }}>Chưa giao</span>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </CardSection>

          {/* Order Info Card */}
          <CardSection title="Thông tin đơn hàng">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                    Mã đơn hàng
                  </div>
                  <div>
                    <a onClick={() => router.push(`/orders/${task.orderId}`)}>
                      {task.orderCode ?? task.orderId.slice(-8).toUpperCase()}
                    </a>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                    Kho xử lý
                  </div>
                  <div>
                    {task.warehouseName ? (
                      <span>
                        <strong>{task.warehouseName}</strong>
                        {task.warehouseCode ? (
                          <span style={{ color: "#8c8c8c", marginLeft: 6 }}>
                            ({task.warehouseCode})
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span style={{ color: "#8c8c8c" }}>Chưa gán kho</span>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </CardSection>

          {/* Note Card */}
          {task.note && (
            <CardSection title="Ghi chú">
              <p>{task.note}</p>
            </CardSection>
          )}
        </Col>

        {/* Right Column - Meta */}
        <Col span={8}>
          <CardSection title="Thông tin">
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                Ngày tạo
              </div>
              <div>{formatDate(task.createdAt)}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>
                Cập nhật cuối
              </div>
              <div>{formatDate(task.updatedAt)}</div>
            </div>
          </CardSection>
        </Col>
      </Row>

      {/* Timeline Card */}
      <CardSection title="Lịch sử">
        {histories && histories.length > 0 ? (
          <Table
            dataSource={histories}
            columns={timelineColumns}
            pagination={false}
            size="small"
            rowKey="_id"
          />
        ) : (
          <div style={{ textAlign: "center", color: "#8c8c8c", padding: 24 }}>
            <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>Chưa có lịch sử</div>
          </div>
        )}
      </CardSection>

      {/* Inventory Movements */}
      <PermissionGate permission="inventory.view">
        <InventorySection taskId={id} />
      </PermissionGate>

      {/* Confirm Dialog */}
      <Modal
        title="Xác nhận đổi trạng thái"
        open={confirmVisible}
        onOk={handleStatusConfirm}
        onCancel={() => {
          setConfirmVisible(false);
          setStatusTarget(null);
        }}
        confirmLoading={confirmLoading}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>
          Bạn có chắc muốn chuyển trạng thái sang{" "}
          <strong>{targetStatusLabel}</strong>?
        </p>
      </Modal>
    </PageContainer>
  );
}
