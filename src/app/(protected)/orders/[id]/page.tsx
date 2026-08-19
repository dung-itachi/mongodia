"use client";

/**
 * Order Detail Page (Sprint 6.0 — Order Module Foundation)
 * Sprint 6.1 — Order Detail & Product Lines
 * Sprint 6.2 — Order Workflow
 *
 * Display order details with customer, sale, products, payment, shipping info.
 * Status workflow with dropdown actions and Timeline from MongoDB.
 */

import { use, useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Row, Col, Table, Button, Dropdown, Space, Form, Input, Modal, Checkbox, Select, Divider, Alert } from "antd";
import type { TableColumnsType } from "antd";
import type { MenuProps } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  DownOutlined,
  CheckOutlined,
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
import { useMessage } from "@/contexts/MessageContext";

import { useOrder, useDeleteOrder, useChangeOrderStatus, useUpdateOrder } from "@/hooks/useOrders";
import { useShipOrder, useReturnOrderStock } from "@/hooks/useWarehouseWorkflow";
import { useEmployees } from "@/hooks/useEmployees";
import { useProducts, useCombosByProduct } from "@/hooks/useProducts";
import { useProductWithVariants } from "@/hooks/useProductVariants";
import OrderProductDetail from "@/components/order/OrderProductDetail";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, ORDER_SOURCE_LABELS, OrderStatus, OrderType } from "@/constants/orderStatus";
import { getStatusActions } from "@/configs/order-status.config";
import type { OrderHistoryItem, OrderItem, UpdateOrderInput, CreateOrderItemInput } from "@/types/order";
import type { ProductWithVariants, OrderItem as VariantOrderItem } from "@/types/variant";
import { formatMNT, formatNumber } from "@/lib/format";
import { validateOrderItem } from "@/types/variant";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const message = useMessage();
  const searchParams = useSearchParams();
  const [editForm] = Form.useForm();

  // Fetch order
  const { order, loading, error, refetch } = useOrder(id);
  const updateMutation = useUpdateOrder();
  const editOpen = searchParams.get("mode") === "edit";
  const [editLoading, setEditLoading] = useState(false);

  // Sprint 6.x: Watch checkbox "Cần giao hàng" để ẩn/hiện nhóm thông tin giao hàng
  const needShipping = Form.useWatch("needShipping", editForm);

  // ========== Extended Edit State (Sprint 6.x) ==========
  // Order items editing
  const [editOrderItems, setEditOrderItems] = useState<VariantOrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);

  // Fetch product with variants for editing
  const { product: editingProduct, loading: productLoading } = useProductWithVariants(selectedProductId);

  // Fetch products list for dropdown
  const { products: productsList } = useProducts();
  const { combos: combosList, loading: combosLoading } = useCombosByProduct(selectedProductId);

  // Fetch employees for sale/marketing assignment
  const { data: employeesData } = useEmployees({ isActive: true, pageSize: 500 });

  // Order items validation
  const orderItemsValidation = useMemo(() => {
    if (editOrderItems.length === 0) return { isValid: true, errors: [] as string[] };
    const errors: string[] = [];
    for (const item of editOrderItems) {
      const validation = validateOrderItem(item);
      if (!validation.isValid) {
        if (validation.detailsError) errors.push(validation.detailsError);
        if (validation.giftsError) errors.push(validation.giftsError);
      }
    }
    return { isValid: errors.length === 0, errors };
  }, [editOrderItems]);

  // Reset order items when modal opens or order changes
  useEffect(() => {
    if (!order || !editOpen) return;

    // Convert existing orderItems from API to VariantOrderItem format for editing
    const convertedItems: VariantOrderItem[] = (order.orderItems || []).map((item, idx) => ({
      // _tempId: temporary ID for React keys (UI only)
      _tempId: `existing_${idx}`,
      comboId: item.comboId || "",
      productId: item.productId || "",
      comboName: item.comboName || item.productName || "",
      comboCode: item.comboCode || "",
      comboQuantity: item.comboQuantity || item.quantity || 1,
      packageQuantity: item.packageQuantity || 1,
      giftQuantity: item.giftQuantity || 0,
      giftMode: item.giftMode || "RANDOM",
      giftSelections: item.giftSelections || [],
      sellingPrice: item.sellingPrice || item.unitPrice || 0,
      discount: item.discount || 0,
      subtotal: item.subtotal || (item.sellingPrice || item.unitPrice || 0) * (item.comboQuantity || item.quantity || 1),
      details: item.details || [],
    }));

    setEditOrderItems(convertedItems);

    // Set initial product/combo selection
    const firstItem = convertedItems[0];
    if (firstItem?.productId) {
      setSelectedProductId(firstItem.productId);
    }
    if (firstItem?.comboId) {
      setSelectedComboId(firstItem.comboId);
    }
  }, [editOpen, order]);

  // Extended form reset effect with all new fields
  useEffect(() => {
    if (!order || !editOpen) return;

    const hasShipping =
      Boolean(order.shipping?.receiverName) ||
      Boolean(order.shipping?.receiverPhone) ||
      Boolean(order.shipping?.address) ||
      Boolean(order.shipping?.carrier) ||
      Boolean(order.shipping?.trackingNumber);

    editForm.resetFields();
    editForm.setFieldsValue({
      // Basic info
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? "",
      note: order.note ?? "",
      // Status & Type
      status: order.status,
      orderType: order.orderType,
      orderSource: order.orderSource,
      // Sale assignment
      saleEmployeeId: order.saleEmployeeId,
      marketingEmployeeId: order.marketingEmployeeId,
      // Shipping
      needShipping: hasShipping,
      receiverName:
        order.shipping?.receiverName ||
        order.customerName ||
        "",
      receiverPhone:
        order.shipping?.receiverPhone ||
        order.customerPhone ||
        "",
      address: order.shipping?.address ?? "",
      carrier: order.shipping?.carrier ?? "",
      trackingNumber: order.shipping?.trackingNumber ?? "",
      shippingFee: order.shipping?.shippingFee ?? order.summary?.shippingFee ?? 0,
    });
  }, [editForm, editOpen, order]);

  const closeEditModal = useCallback(() => {
    router.replace(`/orders/${id}`);
  }, [id, router]);

  const shipOrder = useShipOrder();
  const returnOrder = useReturnOrderStock();
  const [shipLoading, setShipLoading] = useState(false);

  const handleShip = useCallback(async () => {
    setShipLoading(true);
    try {
      await shipOrder.mutateAsync({ orderId: id, payload: {} });
      message.success("Xuất kho cho đơn hàng thành công");
      await refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Xuất kho thất bại");
    } finally {
      setShipLoading(false);
    }
  }, [id, shipOrder, refetch]);

  const handleReturn = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      const data = await response.json();
      const items = (data?.data?.order?.orderItems ?? []) as Array<{ quantity: number; productName?: string; comboQuantity?: number; packageQuantity?: number; giftMode?: string; giftQuantity?: number }>;
      const shipments = items.flatMap((item) => item.productName ? [{ itemType: "PRODUCT" as const, productId: data?.data?.order?.productId, quantity: item.quantity }] : []).filter((entry) => entry.quantity > 0);
      if (!shipments.length) { message.warning("Đơn này chưa có dữ liệu xuất để hoàn"); return; }
      await returnOrder.mutateAsync({ orderId: id, payload: { items: shipments, note: `Hoàn đơn ${data?.data?.order?.orderCode}` } });
      message.success("Hoàn kho thành công");
      await refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Hoàn kho thất bại");
    }
  }, [id, refetch, returnOrder]);

  // Delete mutation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteMutation = useDeleteOrder();

  // Status change mutation
  const [statusTarget, setStatusTarget] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const statusMutation = useChangeOrderStatus();

  const handleEditSave = useCallback(async () => {
    const values = await editForm.validateFields();

    // Sprint 6.x: user tick / bỏ tick "Cần giao hàng" → quyết định có
    // gửi lại block shipping hay xoá block shipping hiện có.
    const needShipping = Boolean(values.needShipping);

    if (needShipping && (!values.receiverName?.trim() || !values.receiverPhone?.trim() || !values.address?.trim())) {
      message.error("Vui lòng nhập đủ người nhận, số điện thoại và địa chỉ giao hàng");
      return;
    }

    // Validate order items if present
    if (editOrderItems.length > 0 && !orderItemsValidation.isValid) {
      message.error("Vui lòng kiểm tra lại chi tiết sản phẩm: " + orderItemsValidation.errors.join(", "));
      return;
    }

    setEditLoading(true);
    try {
      // Prepare order items for API
      const orderItemsForApi: CreateOrderItemInput[] | undefined = editOrderItems.length > 0
        ? editOrderItems.map((item) => ({
            comboId: item.comboId || undefined,
            productId: item.productId || undefined,
            comboName: item.comboName || undefined,
            comboCode: item.comboCode || undefined,
            comboQuantity: item.comboQuantity,
            packageQuantity: item.packageQuantity,
            giftQuantity: item.giftQuantity,
            giftMode: item.giftMode,
            giftSelections: item.giftSelections,
            sellingPrice: item.sellingPrice,
            discount: item.discount,
            subtotal: item.subtotal,
            details: item.details,
          }))
        : undefined;

      const updateData: UpdateOrderInput = {
        customerName: values.customerName.trim(),
        customerPhone: values.customerPhone?.trim() || undefined,
        note: values.note?.trim() || undefined,
        // Status & Type
        status: values.status !== order?.status ? values.status : undefined,
        orderType: values.orderType !== order?.orderType ? values.orderType : undefined,
        orderSource: values.orderSource !== order?.orderSource ? values.orderSource : undefined,
        // Sale assignment
        saleEmployeeId: values.saleEmployeeId || undefined,
        marketingEmployeeId: values.marketingEmployeeId || undefined,
        // Order items
        orderItems: orderItemsForApi,
        // Shipping
        shipping: needShipping
          ? {
              receiverName: values.receiverName?.trim() || "",
              receiverPhone: values.receiverPhone?.trim() || "",
              address: values.address?.trim() || "",
              carrier: values.carrier?.trim() || undefined,
              trackingNumber: values.trackingNumber?.trim() || undefined,
              shippingFee: Number(values.shippingFee ?? 0),
              shippingFeeCurrency: order?.shipping?.shippingFeeCurrency ?? order?.currency ?? "VND",
            }
          : null,
        summaryShippingFee: needShipping ? Number(values.shippingFee ?? 0) : 0,
      };

      await updateMutation.mutateAsync({
        id,
        data: updateData,
      });
      message.success("Cập nhật đơn hàng thành công");
      closeEditModal();
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Cập nhật đơn hàng thất bại");
    } finally {
      setEditLoading(false);
    }
  }, [closeEditModal, editForm, id, order, refetch, updateMutation, editOrderItems, orderItemsValidation]);

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

  // Format currency (Sprint Settings — MNT / ₮).
  // Backwards-compat: callers can still pass a currency code, but we always
  // format in Tugrik because the system's master currency is MNT.
  const formatCurrency = useCallback((amount: number, _currency?: string) => {
    return formatMNT(amount);
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

  const productColumns: TableColumnsType<OrderItem> = [
    {
      title: "Combo / Sản phẩm",
      key: "combo",
      render: (_: unknown, item: OrderItem) => {
        const totalProducts = item.comboQuantity * item.packageQuantity;
        const totalGifts = item.comboQuantity * item.giftQuantity;
        const details = item.details ?? [];
        const gifts = item.giftSelections ?? [];
        // Hiển thị TÁCH comboName và productName khi cả 2 tồn tại.
        // Trước đây: chỉ show comboName || productName (1 dòng) → dễ mất thông tin sản phẩm.
        const hasCombo = Boolean(item.comboName);
        const hasProduct = Boolean(item.productName);
        return (
          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
            {hasCombo && (
              <span>
                <strong>Combo:</strong> {item.comboName}
                {item.comboCode && (
                  <span style={{ color: "#8c8c8c", marginLeft: 4 }}>({item.comboCode})</span>
                )}
              </span>
            )}
            {hasProduct && (
              <span>
                <strong>Sản phẩm:</strong> {item.productName}
              </span>
            )}
            {!hasCombo && !hasProduct && <strong>-</strong>}
            <span style={{ color: "#8c8c8c" }}>
              {item.comboQuantity} combo x {item.packageQuantity} SP = {totalProducts} SP
            </span>
            {details.map((detail, index) => {
              const label = detail.attributes
                .map((attribute) => attribute.valueName || attribute.valueId)
                .join(" / ");
              return <span key={`${detail.variantId ?? "product"}-${index}`}>- {label || item.productName} x {detail.quantity}</span>;
            })}
            {totalGifts > 0 && (
              <>
                <span>Quà: {totalGifts} - {item.giftMode === "CUSTOMER_SELECTED" ? "Khách chọn" : "Ngẫu nhiên"}</span>
                {item.giftMode === "RANDOM" ? (
                  <span style={{ color: "#8c8c8c" }}>Kho sẽ tự chọn {totalGifts} quà khi đóng hàng.</span>
                ) : gifts.map((gift, index) => (
                  <span key={`${gift.giftProductId}-${index}`}>- {gift.giftProductName || "Quà tặng"} x {gift.quantity}</span>
                ))}
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: "Giá combo",
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      width: 140,
      align: "right" as const,
      render: (value: number, item: OrderItem) => formatCurrency(value ?? item.unitPrice),
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
      render: (value: number) => <span style={{ fontWeight: 600 }}>{formatCurrency(value)}</span>,
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
            <PermissionGate permission="warehouse.ship">
              {order.status === OrderStatus.PACKING && (
                <ActionButton type="primary" label="Xuất kho" onClick={handleShip} loading={shipLoading} />
              )}
            </PermissionGate>
            <PermissionGate permission="warehouse.return">
              {order.status === OrderStatus.RETURNED && (
                <ActionButton type="secondary" label="Hoàn kho" onClick={handleReturn} loading={returnOrder.isPending} />
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
                {typeof order.exchangeRate === "number" && (
                  <Col xs={24} sm={8}>
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                      Tỷ giá lúc tạo
                    </div>
                    <div>
                      1 USD = {formatNumber(order.exchangeRate)} ₮
                      {order.exchangeRateDate && (
                        <div style={{ fontSize: 11, color: "#999" }}>
                          {new Date(order.exchangeRateDate).toLocaleString("vi-VN")}
                        </div>
                      )}
                    </div>
                  </Col>
                )}
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
              ) : order.product || order.combo ? (
                <Row gutter={[16, 8]}>
                  {order.product && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Sản phẩm</div>
                      <div style={{ fontWeight: 500 }}>{order.product.name}</div>
                      {order.product.code && (
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>Mã: {order.product.code}</div>
                      )}
                    </Col>
                  )}
                  {order.combo && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Combo sản phẩm</div>
                      <div style={{ fontWeight: 500 }}>{order.combo.name}</div>
                      {order.combo.code && (
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>Mã: {order.combo.code}</div>
                      )}
                    </Col>
                  )}
                  {typeof order.quantity === "number" && (
                    <Col xs={24} sm={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>Số lượng</div>
                      <div>{order.quantity}</div>
                    </Col>
                  )}
                </Row>
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
                    <div>{order.shipping.address || "-"}</div>
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
              rowKey="_id"
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

      <Modal
        open={editOpen}
        title="Sửa đơn hàng"
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={editLoading}
        onOk={() => void handleEditSave()}
        onCancel={closeEditModal}
        forceRender
        width={900}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          {/* ========== Section 1: Thông tin cơ bản ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Thông tin khách hàng
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="customerName"
                label="Tên khách hàng"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tên khách hàng" }]}
              >
                <Input maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="customerPhone" label="Số điện thoại">
                <Input maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          {/* ========== Section 2: Trạng thái & Loại đơn ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Trạng thái & Phân loại
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="Trạng thái đơn hàng">
                <Select
                  placeholder="Chọn trạng thái"
                  allowClear
                  options={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="orderType" label="Loại đơn hàng">
                <Select
                  placeholder="Chọn loại"
                  allowClear
                  options={Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="orderSource" label="Nguồn đơn">
                <Select
                  placeholder="Chọn nguồn"
                  allowClear
                  options={Object.entries(ORDER_SOURCE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ========== Section 3: Phân công Sale ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Phân công nhân viên
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="saleEmployeeId" label="Sale phụ trách">
                <Select
                  placeholder="Chọn Sale"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  loading={!employeesData}
                  options={employeesData?.map((emp) => ({
                    value: emp._id,
                    label: `${emp.fullName} (${emp.employeeCode})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="marketingEmployeeId" label="Marketing phụ trách">
                <Select
                  placeholder="Chọn Marketing"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  loading={!employeesData}
                  options={employeesData?.map((emp) => ({
                    value: emp._id,
                    label: `${emp.fullName} (${emp.employeeCode})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ========== Section 4: Sản phẩm & Combo ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Sản phẩm / Combo
          </Divider>
          {orderItemsValidation.errors.length > 0 && (
            <Alert
              type="warning"
              message="Lỗi chi tiết sản phẩm"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {orderItemsValidation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              }
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}
          <OrderProductDetail
            items={editOrderItems}
            product={editingProduct}
            loading={productLoading}
            onChange={(items) => setEditOrderItems(items)}
            disabled={false}
          />

          {/* ========== Section 5: Giao hàng ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Thông tin giao hàng
          </Divider>
          <Form.Item name="needShipping" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox>Cần giao hàng</Checkbox>
          </Form.Item>
          {needShipping && (
            <>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receiverName"
                    label="Người nhận"
                    rules={[{ required: true, whitespace: true, message: "Vui lòng nhập người nhận" }]}
                  >
                    <Input maxLength={200} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receiverPhone"
                    label="SĐT người nhận"
                    rules={[{ required: true, whitespace: true, message: "Vui lòng nhập số điện thoại người nhận" }]}
                  >
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="address"
                label="Địa chỉ giao hàng"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập địa chỉ giao hàng" }]}
              >
                <Input.TextArea rows={2} maxLength={500} />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="carrier" label="Đơn vị vận chuyển">
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="trackingNumber" label="Mã vận đơn">
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="shippingFee" label="Phí vận chuyển">
                <Input type="number" min={0} step={1000} />
              </Form.Item>
            </>
          )}

          {/* ========== Section 6: Ghi chú ========== */}
          <Divider style={{ margin: "16px 0 8px", fontWeight: 500 }}>
            Ghi chú
          </Divider>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={1000} placeholder="Nhập ghi chú cho đơn hàng..." />
          </Form.Item>
        </Form>
      </Modal>

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
