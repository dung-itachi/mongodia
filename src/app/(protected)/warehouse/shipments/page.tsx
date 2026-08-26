"use client";

/**
 * Warehouse Shipments Page (Warehouse Order Shipment UI)
 *
 * Warehouse staff view orders that need to be shipped and process shipments.
 *
 * === PERMISSIONS ===
 * - warehouse.view: View orders list
 * - warehouse.ship: Ship orders (also enforced by API)
 *
 * === WAREHOUSE SCOPE ===
 * - API filters orders by user's assigned warehouse(s)
 * - Uses existing canAccessWarehouse() abstraction
 * - Non-admin users can only see orders from their warehouse
 *
 * === ORDER STATUS ===
 * - Default shows CONFIRMED and PACKING orders
 * - Backend validates status before shipping
 *
 * === BUSINESS LOGIC (Backend handles) ===
 * - Gift selection for RANDOM mode (auto-selects gift with highest stock)
 * - Gift selection for CUSTOMER_SELECTED (uses giftSelections[])
 * - Inventory deduction with availableQuantity check
 * - Variant resolution from OrderItem.details
 * - Combo quantity calculation: comboQuantity × packageQuantity
 *
 * === UI RESPONSIBILITIES ===
 * - Display orders list with filters
 * - Show combo calculations (read-only)
 * - Show gift mode indicators (RANDOM vs CUSTOMER_SELECTED)
 * - Call existing shipment API (no direct inventory modification)
 * - Handle success/error feedback
 *
 * === TESTING NOTES ===
 * - RANDOM gift: Backend auto-selects gift, UI shows "Ngẫu nhiên"
 * - CUSTOMER_SELECTED: Backend uses giftSelections[], UI shows required gifts
 * - Gift stock check: Backend throws if insufficient stock
 * - Product stock check: Backend throws if insufficient availableQuantity
 * - Warehouse scope: Backend validates user's warehouse access
 * - Combo calculation: Backend uses comboQuantity × packageQuantity
 * - Order status: Backend validates allowed statuses
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, Button, Space, Card, Statistic, Row, Col, Tag } from "antd";
import {
  CheckOutlined,
  EyeOutlined,
  GiftOutlined,
  ShoppingOutlined,
  MoreOutlined,
  CarOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import DataTable from "@/components/common/table/DataTable";
import TableToolbar from "@/components/common/table/TableToolbar";
import StatusBadge from "@/components/common/display/StatusBadge";
import PermissionGate from "@/components/common/PermissionGate";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import EmptyState from "@/components/common/display/EmptyState";

import { useWarehouseOrders, useOrderDetail } from "@/hooks/useWarehouseShipments";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useDebounce } from "@/hooks/useDebounce";
import type { OrderListItem } from "@/types/order";
import ShipDrawer from "@/components/warehouse/ShipDrawer";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import { useMessage } from "@/contexts/MessageContext";

export default function WarehouseShipmentsPage() {
  const lang = useLanguageStore((s) => s.language);
  const router = useRouter();
  const message = useMessage();

  // Filter state
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Ship drawer state
  const [shipDrawerOpen, setShipDrawerOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch data
  const { orders, total, loading, refetch } = useWarehouseOrders(
    warehouseId,
    debouncedKeyword
  );
  const { warehouses } = useWarehouses();

  // Fetch selected order detail
  const { order: selectedOrder } = useOrderDetail(selectedOrderId);

  // Calculate totals for stats
  const stats = useMemo(() => {
    const confirmed = orders.filter((o) => o.status === "CONFIRMED").length;
    const packing = orders.filter((o) => o.status === "PACKING").length;
    return { confirmed, packing };
  }, [orders]);

  // Get order item totals
  const getOrderItemTotals = useCallback((order: OrderListItem) => {
    const items = order.orderItems ?? [];
    return {
      comboName: items.map((item) => item.comboName).filter(Boolean).join(", ") || order.combo?.name || "-",
      productName: order.product?.name || items.map((item) => item.productName).filter(Boolean).join(", ") || "-",
      comboQuantity: items.reduce((sum, item) => sum + (item.comboQuantity ?? item.quantity ?? 0), 0),
      productQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.packageQuantity, 0),
      giftQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.giftQuantity, 0),
      hasRANDOMGift: items.some((item) => item.giftMode === "RANDOM"),
      hasCUSTOMERGift: items.some((item) => item.giftMode === "CUSTOMER_SELECTED"),
    };
  }, []);

  // Table columns
  const columns = useMemo(() => [
    {
      key: "orderCode",
      title: t("Mã đơn", lang),
      dataIndex: "orderCode",
      width: 150,
      render: (value: string) => (
        <a onClick={() => router.push(`/orders/${orders.find(o => o.orderCode === value)?._id}`)}>
          {value}
        </a>
      ),
    },
    {
      key: "customer",
      title: t("Khách hàng", lang),
      width: 200,
      render: (_: unknown, record: Record<string, unknown>) => {
        const customerName = record.customerName as string | undefined;
        const customerPhone = record.customerPhone as string | undefined;
        return (
          <div>
            <div>{customerName || "-"}</div>
            {customerPhone && (
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>{customerPhone}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "combo",
      title: t("Combo", lang),
      width: 180,
      render: (_: unknown, record: Record<string, unknown>) => {
        const totals = getOrderItemTotals(record as unknown as OrderListItem);
        return (
          <div>
            <div style={{ fontSize: 13 }}>{totals.comboName}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {totals.comboQuantity} combo
            </div>
          </div>
        );
      },
    },
    {
      key: "product",
      title: t("Sản phẩm", lang),
      width: 220,
      render: (_: unknown, record: Record<string, unknown>) => {
        const totals = getOrderItemTotals(record as unknown as OrderListItem);
        return (
          <div>
            <div style={{ fontSize: 13 }}>{totals.productName}</div>
            {totals.productName !== "-" && (
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                <ShoppingOutlined style={{ marginRight: 2 }} />
                {totals.productQuantity} sản phẩm
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "quantity",
      title: t("Số lượng", lang),
      width: 120,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const totals = getOrderItemTotals(order);
        return (
          <Space orientation="vertical" size={0} style={{ textAlign: "center" }}>
            <Tag icon={<ShoppingOutlined />} color="blue">
              {totals.productQuantity}
            </Tag>
            {totals.giftQuantity > 0 && (
              <Tag icon={<GiftOutlined />} color="purple" style={{ marginTop: 2 }}>
                {totals.giftQuantity}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      key: "giftMode",
      title: t("Quà tặng", lang),
      width: 130,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const totals = getOrderItemTotals(order);
        if (!totals.hasRANDOMGift && !totals.hasCUSTOMERGift) {
          return <span style={{ color: "#8c8c8c" }}>-</span>;
        }
        return (
          <Space orientation="vertical" size={2}>
            {totals.hasRANDOMGift && (
              <Tag color="orange" style={{ fontSize: 11 }}>{t("Ngẫu nhiên", lang)}</Tag>
            )}
            {totals.hasCUSTOMERGift && (
              <Tag color="purple" style={{ fontSize: 11 }}>{t("Khách chọn", lang)}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      key: "warehouse",
      title: t("Kho", lang),
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const warehouse = order.warehouse as { name?: string } | undefined;
        return warehouse?.name || order.warehouseId?.toString() || "-";
      },
    },
    {
      key: "status",
      title: t("Trạng thái", lang),
      dataIndex: "status",
      width: 140,
      render: (value: unknown) => <StatusBadge status={String(value)} />,
    },
    {
      key: "actions",
      title: t("Thao tác", lang),
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        return (
          <Dropdown
            trigger={["click"]}
            getPopupContainer={() => document.body}
            menu={{
              items: [
                {
                  key: "view",
                  icon: <EyeOutlined />,
                  label: t("Xem chi tiết", lang),
                  onClick: () => router.push(`/orders/${order._id}`),
                },
                {
                  key: "ship",
                  icon: <CheckOutlined />,
                  label: t("Xuất kho", lang),
                  onClick: () => {
                    setSelectedOrderId(order._id);
                    setShipDrawerOpen(true);
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ], [router, orders, getOrderItemTotals, lang]);

  // Handle ship success
  const handleShipSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setShipDrawerOpen(false);
    setSelectedOrderId(null);
  }, []);

  // Warehouse filter options
  const warehouseOptions = useMemo(() => [
    { value: "", label: t("Tất cả kho", lang) },
    ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({
      value: w._id,
      label: w.name,
    })),
  ], [warehouses, lang]);

  // Pagination
  const pagination = useMemo(() => ({
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (totalCount: number) => `${t("Tổng:", lang)} ${totalCount}`,
    onChange: (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
  }), [page, pageSize, total, lang]);

  return (
    <PageContainer>
      <PageHeader title={t("Xuất kho", lang)}
        subtitle={`${total} ${t("đơn cần xử lý", lang)}`}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Kho", lang), href: "/warehouses" },
          { label: t("Xuất kho", lang) },
        ]}
      />

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title={t("Chờ đóng gói", lang)}
              value={stats.confirmed}
              prefix={<CheckOutlined style={{ color: "#1890ff" }} />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title={t("Đang đóng gói", lang)}
              value={stats.packing}
              prefix={<ShoppingOutlined style={{ color: "#fa8c16" }} />}
              styles={{ content: { color: "#fa8c16" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder={t("Tìm mã đơn, tên khách hàng...", lang)}
          onRefresh={() => void refetch()}
          loading={loading}
          actions={
            <Space>
              <PermissionGate permission="warehouse.ship">
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  onClick={() => {
                    if (orders.length > 0) {
                      setSelectedOrderId(orders[0]._id);
                      setShipDrawerOpen(true);
                    }
                  }}
                  disabled={orders.length === 0}
                >
                  {t("Xuất kho", lang)}
                </Button>
              </PermissionGate>
            </Space>
          }
        />

        <WarehouseQuickPick
          value={warehouseId}
          onChange={(next) => {
            setWarehouseId(next);
            setPage(1);
          }}
          warehouses={warehouses}
        />

        {/* Warehouse Filter */}
        <Space style={{ marginBottom: 16 }}>
          <select
            value={warehouseId ?? ""}
            onChange={(e) => {
              setWarehouseId(e.target.value || undefined);
              setPage(1);
            }}
            style={{
              minWidth: 200,
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid #d9d9d9",
            }}
          >
            {warehouseOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Space>

        {loading ? (
          <SkeletonTable rows={10} columns={8} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={t("Không có đơn hàng", lang)}
            description={
              debouncedKeyword || warehouseId
                ? t("Không tìm thấy đơn hàng nào phù hợp", lang)
                : t("Không có đơn hàng nào cần xuất kho", lang)
            }
          />
        ) : (
          <DataTable
            columns={columns as unknown as Parameters<typeof DataTable>[0]["columns"]}
            data={orders as unknown as Record<string, unknown>[]}
            loading={loading}
            pagination={pagination}
            rowKey="_id"
            scroll={{ x: 1400 }}
          />
        )}
      </div>

      {/* Ship Drawer */}
      <ShipDrawer
        open={shipDrawerOpen}
        order={selectedOrder}
        onClose={handleDrawerClose}
        onSuccess={handleShipSuccess}
      />
    </PageContainer>
  );
}
