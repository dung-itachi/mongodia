"use client";

/**
 * Order Detail Page (Sprint 6.0 — Order Module Foundation)
 * Sprint 6.1 — Order Detail & Product Lines
 * Sprint 6.2 — Order Workflow
 *
 * Display order details with customer, sale, products, payment, shipping info.
 * Status workflow with dropdown actions and Timeline from MongoDB.
 */

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, Table, message, Button, Dropdown, Space } from "antd";
import type { TableColumnsType } from "antd";
import type { MenuProps } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  DownOutlined,
  CheckOutlined,
  StopOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import StatusBadge from "@/components/common/display/StatusBadge";
import ActionButton from "@/components/common/buttons/ActionButton";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonCard from "@/components/common/overlay/SkeletonCard";
import PermissionGate from "@/components/common/PermissionGate";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";
import LoadingOverlay from "@/components/common/overlay/LoadingOverlay";

import { useOrder, useDeleteOrder, useChangeOrderStatus } from "@/hooks/useOrders";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, ORDER_SOURCE_LABELS } from "@/constants/orderStatus";
import { getStatusActions, ORDER_STATUS_COLORS } from "@/configs/order-status.config";
import type { OrderHistoryItem, OrderItem } from "@/types/order";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // Fetch order
  const { order, loading, error, refetch } = useOrder(id);

  // Delete mutation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteMutation = useDeleteOrder();

  // Status change mutation
  const [statusTarget, setStatusTarget] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const statusMutation = useChangeOrderStatus();

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(deleteId);
      message.success("Xóa đơn hàng thành công");
      setDeleteId(null);
      router.push("/orders");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Xóa đơn hàng thất bại");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteId, deleteMutation, router]);

  // Handle status change
  const handleStatusChange = useCallback(async (newStatus: string) => {
    setStatusLoading(true);
    try {
      await statusMutation.mutateAsync({
        id,
        data: { status: newStatus },
      });
      message.success("Đổi trạng thái thành công");
      setStatusTarget(null);
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Đổi trạng thái thất bại");
    } finally {
      setStatusLoading(false);
    }
  }, [id, statusMutation, refetch]);

  // Format currency
  const formatCurrency = useCallback((amount: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

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

  // Product table columns (Sprint 6.1)
  const productColumns: TableColumnsType<OrderItem> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
      render: (value: string) => value || "-",
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "SL",
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
      align: "center" as const,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 140,
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Giảm giá",
      dataIndex: "discount",
      key: "discount",
      width: 120,
      align: "right" as const,
      render: (value: number) => value > 0 ? formatCurrency(value) : "-",
    },
    {
      title: "Thành tiền",
      dataIndex: "subtotal",
      key: "subtotal",
      width: 150,
      align: "right" as const,
      render: (value: number) => (
        <span style={{ fontWeight: 600 }}>{formatCurrency(value)}</span>
      ),
    },
  ];

  // Product table footer (Sprint 6.1)
  const productSummary = order?.summary;

  // Timeline columns
  const timelineColumns = [
    {
      title: "Thao tác",
      dataIndex: "actionLabel",
      key: "actionLabel",
      width: 150,
    },
    {
      title: "Chi tiết",
      key: "detail",
      render: (_: unknown, record: OrderHistoryItem) => (
        <div>
          {record.note && <div>{record.note}</div>}
          {record.oldValue && record.newValue && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {record.oldValue} → {record.newValue}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Nhân viên",
      key: "employee",
      width: 180,
      render: (_: unknown, record: OrderHistoryItem) => {
        const emp = record.employee;
        return emp ? `${emp.fullName} (${emp.employeeCode})` : "-";
      },
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: string) => formatDate(value),
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard rows={8} />
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer>
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description={error || "Đơn hàng không tồn tại hoặc đã bị xóa"}
          action={
            <Button type="primary" onClick={() => router.push("/orders")}>
              Quay lại danh sách
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Get status actions from config
  const statusActions = getStatusActions(order.status);
  const canEdit = !["DELIVERED", "CANCELLED", "RETURNED", "REJECTED", "FAILED"].includes(order.status);
  const canDelete = !["DELIVERED", "CANCELLED", "RETURNED", "REJECTED", "FAILED"].includes(order.status);

  // Build dropdown menu items for status change
  const statusMenuItems: MenuProps["items"] = statusActions.map((action) => ({
    key: action.targetStatus,
    label: (
      <Space>
        <CheckOutlined style={{ color: action.color === "red" ? "#ff4d4f" : "#52c41a" }} />
        <span>{action.label}</span>
      </Space>
    ),
    onClick: () => setStatusTarget(action.targetStatus),
  }));

  return (
    <PageContainer>
      {(deleteLoading || statusLoading) && (
        <LoadingOverlay fullScreen text={statusLoading ? "Đang đổi trạng thái..." : "Đang xóa đơn hàng..."} />
      )}

      <PageHeader
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>{order.orderCode}</span>
            <StatusBadge status={order.status} />
          </div>
        }
        subtitle={`Ngày tạo: ${formatDate(order.createdAt)}`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Đơn hàng", href: "/orders" },
          { label: order.orderCode },
        ]}
        actions={
          <>
            <PermissionGate permission="order.update">
              {/* Status Action Dropdown */}
              {statusActions.length > 0 && (
                <Dropdown menu={{ items: statusMenuItems }} trigger={["click"]}>
                  <Button>
                    <Space>
                      Thao tác
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              )}
              {canEdit && (
                <ActionButton
                  type="secondary"
                  icon={<EditOutlined />}
                  label="Sửa"
                  onClick={() => router.push(`/orders/${id}?mode=edit`)}
                />
              )}
            </PermissionGate>
            <PermissionGate permission="order.delete">
              {canDelete && (
                <ActionButton
                  type="danger"
                  icon={<DeleteOutlined />}
                  label="Xóa"
                  onClick={() => setDeleteId(id)}
                />
              )}
            </PermissionGate>
          </>
        }
      />

      <Row gutter={16}>
        {/* Left Column - Main Info */}
        <Col xs={24} lg={16}>
          {/* Order Info Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Thông tin đơn hàng">
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Mã đơn</div>
                  <div style={{ fontWeight: 500 }}>{order.orderCode}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Trạng thái</div>
                  <div><StatusBadge status={order.status} /></div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Loại đơn</div>
                  <div>{ORDER_TYPE_LABELS[order.orderType as keyof typeof ORDER_TYPE_LABELS] || order.orderType}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Nguồn đơn</div>
                  <div>{ORDER_SOURCE_LABELS[order.orderSource as keyof typeof ORDER_SOURCE_LABELS] || order.orderSource}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Số lượng</div>
                  <div>{order.quantity}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Đơn giá</div>
                  <div>{formatCurrency(order.unitPrice, order.currency)}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Đã thanh toán</div>
                  <div style={{ color: "#52c41a" }}>{formatCurrency(order.totalPaid, order.currency)}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Thanh toán trước</div>
                  <div>{order.isPrepaid ? "Có" : "Không"}</div>
                </Col>
                {order.estimatedWeight && (
                  <Col xs={24} sm={8}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Trọng lượng ước tính</div>
                    <div>{order.estimatedWeight} kg</div>
                  </Col>
                )}
                {order.note && (
                  <Col xs={24}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Ghi chú</div>
                    <div>{order.note}</div>
                  </Col>
                )}
              </Row>
            </CardSection>
          </div>

          {/* Customer Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Khách hàng">
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={12}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Tên</div>
                  <div>{order.customerName}</div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Số điện thoại</div>
                  <div>{order.customerPhone || "-"}</div>
                </Col>
                {order.customer && (
                  <>
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Mã KH</div>
                      <div>{order.customer.code}</div>
                    </Col>
                  </>
                )}
              </Row>
            </CardSection>
          </div>

          {/* Sale Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Nhân viên Sale">
              {order.saleEmployee ? (
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Tên</div>
                    <div>{order.saleEmployee.fullName}</div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Mã NV</div>
                    <div>{order.saleEmployee.employeeCode}</div>
                  </Col>
                </Row>
              ) : (
                <div style={{ textAlign: "center", color: "#8c8c8c", padding: 16 }}>
                  Chưa phân công
                </div>
              )}
            </CardSection>
          </div>

          {/* Product List Card (Sprint 6.1) */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Danh sách sản phẩm">
              {order.orderItems && order.orderItems.length > 0 ? (
                <Table
                  dataSource={order.orderItems}
                  columns={productColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
                  summary={() => productSummary ? (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <div style={{ textAlign: "right", fontWeight: 600 }}>Tạm tính</div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <span>{formatCurrency(productSummary.subtotal)}</span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <div style={{ textAlign: "right", fontWeight: 600 }}>Giảm giá</div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <span style={{ color: "#ff4d4f" }}>
                            {productSummary.discount > 0 ? `-${formatCurrency(productSummary.discount)}` : "-"}
                          </span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <div style={{ textAlign: "right", fontWeight: 600 }}>Phí vận chuyển</div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <span>{formatCurrency(productSummary.shippingFee)}</span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>
                            Tổng cộng
                          </div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <span style={{ color: "#1890ff", fontWeight: 700, fontSize: 14 }}>
                            {formatCurrency(productSummary.grandTotal)}
                          </span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </>
                  ) : null}
                />
              ) : (
                <div style={{ textAlign: "center", color: "#8c8c8c", padding: 24 }}>
                  Chưa có sản phẩm
                </div>
              )}
            </CardSection>
          </div>

          {/* Payment Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Thanh toán">
              {order.payments && order.payments.length > 0 ? (
                <Table
                  dataSource={order.payments.map((p, idx) => ({
                    key: idx,
                    method: p.method,
                    amount: formatCurrency(p.amount, p.currency),
                    date: p.paidAt ? formatDate(p.paidAt) : "-",
                    transactionId: p.transactionId || "-",
                  }))}
                  columns={[
                    { title: "Phương thức", dataIndex: "method" },
                    { title: "Số tiền", dataIndex: "amount", align: "right" as const },
                    { title: "Ngày", dataIndex: "date" },
                    { title: "Mã GD", dataIndex: "transactionId" },
                  ]}
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{ textAlign: "center", color: "#8c8c8c", padding: 24 }}>
                  Chưa có thanh toán
                </div>
              )}
            </CardSection>
          </div>

          {/* Shipping Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Giao hàng">
              {order.shipping ? (
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Người nhận</div>
                    <div>{order.shipping.receiverName}</div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>SĐT người nhận</div>
                    <div>{order.shipping.receiverPhone}</div>
                  </Col>
                  <Col xs={24}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Địa chỉ</div>
                    <div>{[
                      order.shipping.address,
                      order.shipping.ward,
                      order.shipping.district,
                      order.shipping.province,
                    ].filter(Boolean).join(", ") || "-"}</div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Phí ship</div>
                    <div>{formatCurrency(order.shipping.shippingFee, order.shipping.shippingFeeCurrency)}</div>
                  </Col>
                  {order.shipping.trackingNumber && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Mã vận đơn</div>
                      <div>{order.shipping.trackingNumber}</div>
                    </Col>
                  )}
                  {order.shipping.carrier && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Đơn vị vận chuyển</div>
                      <div>{order.shipping.carrier}</div>
                    </Col>
                  )}
                  {order.shipping.estimatedDelivery && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Dự kiến giao</div>
                      <div>{formatDate(order.shipping.estimatedDelivery)}</div>
                    </Col>
                  )}
                  {order.shipping.actualDelivery && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Đã giao lúc</div>
                      <div>{formatDate(order.shipping.actualDelivery)}</div>
                    </Col>
                  )}
                </Row>
              ) : (
                <div style={{ textAlign: "center", color: "#8c8c8c", padding: 24 }}>
                  Chưa có thông tin giao hàng
                </div>
              )}
            </CardSection>
          </div>
        </Col>

        {/* Right Column - Summary & Revenue */}
        <Col xs={24} lg={8}>
          {/* Order Summary Card (Sprint 6.1) */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Tổng tiền">
              <Row gutter={[16, 12]}>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Tạm tính</span>
                    <span>{formatCurrency(productSummary?.subtotal ?? 0)}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Giảm giá</span>
                    <span style={{ color: "#ff4d4f" }}>
                      {productSummary && productSummary.discount > 0
                        ? `-${formatCurrency(productSummary.discount)}`
                        : formatCurrency(0)}
                    </span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Phí vận chuyển</span>
                    <span>{formatCurrency(productSummary?.shippingFee ?? 0)}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid #f0f0f0",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    <span>Tổng cộng</span>
                    <span style={{ color: "#1890ff" }}>
                      {formatCurrency(productSummary?.grandTotal ?? 0)}
                    </span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid #f0f0f0",
                    }}
                  >
                    <span style={{ color: "#8c8c8c" }}>Đã thanh toán</span>
                    <span style={{ color: "#52c41a" }}>
                      {formatCurrency(order.totalPaid, order.currency)}
                    </span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Còn lại</span>
                    <span style={{
                      color: (order.totalAmount - order.totalPaid) > 0 ? "#ff4d4f" : "#52c41a",
                      fontWeight: 500
                    }}>
                      {formatCurrency((productSummary?.grandTotal ?? order.totalAmount) - order.totalPaid)}
                    </span>
                  </div>
                </Col>
              </Row>
            </CardSection>
          </div>

          {/* Revenue Card */}
          <div style={{ marginBottom: 16 }}>
            <CardSection title="Doanh thu">
              <Row gutter={[16, 8]}>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Đã khóa</span>
                    <span>{order.revenueLocked ? "Có" : "Không"}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Đủ điều kiện</span>
                    <span>{order.revenueEligible ? "Có" : "Không"}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>Lý do</div>
                  <div>{order.revenueLockReasonLabel || order.revenueLockReason}</div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Marketing (thô)</span>
                    <span>{formatCurrency(order.marketingRevenueRaw, order.currency)}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Marketing (cuối)</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(order.marketingRevenueFinal, order.currency)}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Sale (thô)</span>
                    <span>{formatCurrency(order.saleRevenueRaw, order.currency)}</span>
                  </div>
                </Col>
                <Col xs={24}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8c8c8c" }}>Sale (cuối)</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(order.saleRevenueFinal, order.currency)}</span>
                  </div>
                </Col>
              </Row>
            </CardSection>
          </div>
        </Col>
      </Row>

      {/* Timeline Card (Sprint 6.2) */}
      <div style={{ marginBottom: 16 }}>
        <CardSection title="Lịch sử">
          {order.histories && order.histories.length > 0 ? (
            <Table
              dataSource={order.histories}
              columns={timelineColumns}
              pagination={false}
              size="small"
            />
          ) : (
            <div style={{ textAlign: "center", color: "#8c8c8c", padding: 24 }}>
              <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <div>Chưa có lịch sử</div>
            </div>
          )}
        </CardSection>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Xóa đơn hàng"
        content="Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác."
        type="delete"
        confirmText="Xóa"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Status Change Confirm Dialog */}
      <ConfirmDialog
        open={!!statusTarget}
        title="Xác nhận đổi trạng thái"
        content={`Bạn có chắc chắn muốn chuyển đơn hàng sang trạng thái "${statusTarget ? ORDER_STATUS_LABELS[statusTarget as keyof typeof ORDER_STATUS_LABELS] || statusTarget : ""}"?`}
        type="warning"
        confirmText="Xác nhận"
        loading={statusLoading}
        onConfirm={() => statusTarget && handleStatusChange(statusTarget)}
        onCancel={() => setStatusTarget(null)}
      />
    </PageContainer>
  );
}
