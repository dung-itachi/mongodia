"use client";

/**
 * ShipDrawer Component (Warehouse Shipment UI)
 *
 * Drawer for confirming order shipment.
 * Shows order details with products, variants, gifts, and allows shipping.
 *
 * === BUSINESS LOGIC (Backend handles) ===
 *
 * GIFT HANDLING:
 * - RANDOM: Backend's buildProductDemands() automatically selects the gift with
 *   highest stockQuantity from active gifts. UI only displays "Ngẫu nhiên".
 *   No UI gift selection needed - backend handles it.
 *
 * - CUSTOMER_SELECTED: Backend uses giftSelections[] from order.
 *   Backend adjusts quantity by comboQuantity. UI displays required gifts.
 *
 * PRODUCT/VARIANT:
 * - Backend resolves variant from OrderItem.details.
 * - UI shows variant info as read-only. Cannot change variant from UI.
 *
 * INVENTORY:
 * - Backend's adjustInventoryForShip() handles stock deduction.
 * - Backend checks availableQuantity >= required quantity.
 * - If insufficient stock, backend throws error.
 *
 * === UI RESPONSIBILITIES ===
 * - Display order details (read-only)
 * - Show combo calculations: comboQuantity × packageQuantity
 * - Show gift mode (RANDOM vs CUSTOMER_SELECTED)
 * - Pass orderId and optional note to shipment API
 * - Handle success/error feedback
 *
 * === API CALLS ===
 * - POST /api/warehouse/orders/[orderId]/ship
 * - Backend handles all inventory transactions
 */

import { useState, useMemo, useCallback } from "react";
import { Drawer, Button, Space, Table, Tag, Input, message, Alert, Divider, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, GiftOutlined, ShoppingOutlined, UndoOutlined } from "@ant-design/icons";
import type { OrderDetail } from "@/types/order";
import type { OrderItem, OrderGiftMode, GiftSelection, ProductVariantSelection } from "@/types/variant";
import type { ShipmentItem } from "@/hooks/useWarehouseShipments";
import { useShipOrder } from "@/hooks/useWarehouseShipments";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  order: OrderDetail | null;
  onClose: () => void;
  onSuccess?: () => void;
};

interface GiftDisplayItem {
  key: string;
  giftProductId: string;
  giftProductName: string;
  quantity: number;
  mode: OrderGiftMode;
  status: "required" | "shipped" | "skipped";
}

interface ProductDisplayItem {
  key: string;
  comboName: string;
  comboCode: string;
  comboQuantity: number;
  packageQuantity: number;
  totalProducts: number;
  details: ProductVariantSelection[];
  giftQuantity: number;
  gifts: GiftDisplayItem[];
  status: "pending" | "shipped";
}

export default function ShipDrawer({ open, order, onClose, onSuccess }: Props) {
  const [shipNote, setShipNote] = useState("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const shipMutation = useShipOrder();

  const isLoading = shipMutation.isPending;

  // Build display items from order items
  const displayItems = useMemo<ProductDisplayItem[]>(() => {
    if (!order?.orderItems) return [];

    return order.orderItems.map((item, idx) => {
      const comboQty = item.comboQuantity ?? 1;
      const pkgQty = item.packageQuantity ?? 1;
      const totalProducts = comboQty * pkgQty;
      const giftQty = (item.giftQuantity ?? 0) * comboQty;

      // Build gift items based on mode
      const gifts: GiftDisplayItem[] = [];

      if (giftQty > 0) {
        if (item.giftMode === "CUSTOMER_SELECTED" && item.giftSelections?.length) {
          // Must ship exact gifts selected by customer
          item.giftSelections.forEach((sel) => {
            gifts.push({
              key: `${idx}-gift-${sel.giftProductId}`,
              giftProductId: sel.giftProductId,
              giftProductName: sel.giftProductName ?? "Quà tặng",
              quantity: sel.quantity * comboQty,
              mode: "CUSTOMER_SELECTED",
              status: "required",
            });
          });
        } else {
          // RANDOM mode - warehouse can choose from inventory
          gifts.push({
            key: `${idx}-gift-random`,
            giftProductId: "",
            giftProductName: "Quà ngẫu nhiên (Kho chọn)",
            quantity: giftQty,
            mode: "RANDOM",
            status: "required",
          });
        }
      }

      return {
        key: `${idx}`,
        comboName: item.comboName || item.productName || "Combo",
        comboCode: item.comboCode || "",
        comboQuantity: comboQty,
        packageQuantity: pkgQty,
        totalProducts,
        details: item.details || [],
        giftQuantity: giftQty,
        gifts,
        status: "pending" as const,
      };
    });
  }, [order]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalProducts = displayItems.reduce((sum, item) => sum + item.totalProducts, 0);
    const totalGifts = displayItems.reduce((sum, item) => sum + item.gifts.reduce((s, g) => s + g.quantity, 0), 0);
    return { totalProducts, totalGifts };
  }, [displayItems]);

  // Product columns for expanded view
  const productColumns: ColumnsType<ProductVariantSelection> = useMemo(() => [
    {
      title: "SKU",
      dataIndex: "variantId",
      key: "sku",
      width: 120,
      render: (variantId: string) => variantId ? (
        <Tag color="blue">{variantId.slice(-6).toUpperCase()}</Tag>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
  ], []);

  // Gift columns for expanded view
  const giftColumns: ColumnsType<GiftDisplayItem> = useMemo(() => [
    {
      title: "Quà",
      dataIndex: "giftProductName",
      key: "name",
      render: (name: string, record: GiftDisplayItem) => (
        <Space>
          <GiftOutlined />
          <Text>{name}</Text>
          {record.mode === "CUSTOMER_SELECTED" && (
            <Tag color="purple" style={{ fontSize: 10 }}>Khách chọn</Tag>
          )}
          {record.mode === "RANDOM" && (
            <Tag color="orange" style={{ fontSize: 10 }}>Ngẫu nhiên</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
  ], []);

  // Main columns for combo items
  const columns: ColumnsType<ProductDisplayItem> = useMemo(() => [
    {
      title: "Combo / Sản phẩm",
      key: "combo",
      render: (_, record) => (
        <div>
          <Text strong>{record.comboName}</Text>
          {record.comboCode && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              ({record.comboCode})
            </Text>
          )}
          <div style={{ fontSize: 12 }}>
            <Text type="secondary">
              {record.comboQuantity} combo × {record.packageQuantity} SP = {record.totalProducts} sản phẩm
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Sản phẩm",
      key: "products",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag icon={<ShoppingOutlined />} color="blue">
          {record.totalProducts}
        </Tag>
      ),
    },
    {
      title: "Quà",
      key: "gifts",
      width: 100,
      align: "center",
      render: (_, record) => (
        record.giftQuantity > 0 ? (
          <Tag icon={<GiftOutlined />} color="purple">
            {record.giftQuantity}
          </Tag>
        ) : <Text type="secondary">-</Text>
      ),
    },
  ], []);

  const handleShip = useCallback(async () => {
    if (!order) return;

    try {
      const payload: { items?: ShipmentItem[]; note?: string } = {
        note: shipNote || undefined,
      };

      await shipMutation.mutateAsync({
        orderId: order._id,
        payload,
      });

      message.success("Xuất kho thành công!");
      setShipNote("");
      onSuccess?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Xuất kho thất bại");
    }
  }, [order, shipNote, shipMutation, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setShipNote("");
    onClose();
  }, [onClose]);

  if (!order) return null;

  return (
    <Drawer
      title={
        <Space>
          <ShoppingOutlined />
          <span>Xuất kho - Đơn {order.orderCode}</span>
        </Space>
      }
      placement="right"
      width={680}
      open={open}
      onClose={handleClose}
      destroyOnClose
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleShip}
            loading={isLoading}
          >
            Xác nhận xuất kho
          </Button>
        </Space>
      }
    >
      {/* Order Summary */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <Space>
            <Text strong>{order.customerName}</Text>
            {order.customerPhone && <Text type="secondary">| {order.customerPhone}</Text>}
          </Space>
        }
        description={
          <Space size="large">
            <Text>
              <ShoppingOutlined style={{ marginRight: 4 }} />
              {totals.totalProducts} sản phẩm
            </Text>
            {totals.totalGifts > 0 && (
              <Text>
                <GiftOutlined style={{ marginRight: 4 }} />
                {totals.totalGifts} quà
              </Text>
            )}
          </Space>
        }
      />

      {/* Combo/Product Items */}
      <Title level={5} style={{ marginTop: 8 }}>
        Chi tiết đơn hàng
      </Title>

      <Table
        columns={columns}
        dataSource={displayItems}
        rowKey="key"
        pagination={false}
        expandable={{
          expandedRowKeys: expandedRows,
          onExpand: (expanded, record) => {
            setExpandedRows(expanded ? [record.key] : []);
          },
          expandedRowRender: (record) => (
            <div style={{ padding: "8px 0" }}>
              {/* Product Details */}
              {record.details.length > 0 && (
                <>
                  <Text strong style={{ marginBottom: 8, display: "block" }}>
                    Biến thể sản phẩm
                  </Text>
                  <Table
                    columns={productColumns}
                    dataSource={record.details}
                    rowKey="variantId"
                    pagination={false}
                    size="small"
                  />
                </>
              )}

              {/* Gifts */}
              {record.gifts.length > 0 && (
                <>
                  <Divider style={{ margin: "12px 0" }} />
                  <Text strong style={{ marginBottom: 8, display: "block" }}>
                    Quà tặng
                  </Text>
                  <Table
                    columns={giftColumns}
                    dataSource={record.gifts}
                    rowKey="key"
                    pagination={false}
                    size="small"
                  />
                </>
              )}
            </div>
          ),
        }}
        style={{ marginBottom: 16 }}
      />

      {/* Notes */}
      <Divider />
      <Text strong style={{ marginBottom: 8, display: "block" }}>
        Ghi chú xuất kho
      </Text>
      <Input.TextArea
        placeholder="Nhập ghi chú (tùy chọn)"
        value={shipNote}
        onChange={(e) => setShipNote(e.target.value)}
        rows={3}
      />
    </Drawer>
  );
}
