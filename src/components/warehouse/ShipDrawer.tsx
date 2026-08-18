"use client";

/**
 * ShipDrawer Component (Warehouse Shipment UI)
 *
 * Drawer for confirming order shipment.
 * Shows order details with products, variants, gifts, and allows shipping.
 *
 * === BUSINESS LOGIC ===
 *
 * GIFT HANDLING:
 * - RANDOM: Warehouse employee selects the actual gift from available inventory.
 *   UI displays "Ngẫu nhiên" and allows employee to choose the specific gift.
 *   The selected giftId is sent via actualShipments to the API.
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
 * - For RANDOM: allow warehouse employee to select actual gift
 * - Pass orderId, actualShipments, and note to shipment API
 * - Handle success/error feedback
 *
 * === API CALLS ===
 * - POST /api/warehouse/orders/[orderId]/ship
 * - Backend handles all inventory transactions
 */

import { useState, useMemo, useCallback } from "react";
import { Drawer, Button, Space, Table, Tag, Input, Alert, Divider, Typography, Select } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, GiftOutlined, ShoppingOutlined, UndoOutlined } from "@ant-design/icons";
import type { OrderDetail } from "@/types/order";
import type { OrderItem, OrderGiftMode, GiftSelection, ProductVariantSelection } from "@/types/variant";
import type { ShipmentItem } from "@/hooks/useWarehouseShipments";
import { useShipOrder } from "@/hooks/useWarehouseShipments";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { getItemDisplayName } from "@/hooks/useWarehouseInventory";
import { useMessage } from "@/contexts/MessageContext";

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
  const message = useMessage();
  const [selectedRandomGifts, setSelectedRandomGifts] = useState<Record<string, string>>({});

  const shipMutation = useShipOrder();

  const isLoading = shipMutation.isPending;

  // Fetch warehouse inventory for gifts (only GIFT items)
  // warehouseId is a string, warehouse is the populated object
  const warehouseIdStr: string | undefined = order?.warehouseId ?? order?.warehouse?._id;
  const { items: inventoryItems, loading: inventoryLoading } = useWarehouseInventory({
    filters: {
      warehouseId: warehouseIdStr ?? "",
      itemType: "GIFT",
      limit: 100,
    },
  });

  // Filter available gifts for selection (only those with sufficient quantity)
  const availableGifts = useMemo(() => {
    return inventoryItems.filter((item) => {
      const requiredQty = Object.values(selectedRandomGifts).filter((id) => id === item.giftIdValue).length;
      // Calculate total required including current selection
      const currentRequired = Object.entries(selectedRandomGifts).reduce((sum, [key, giftId]) => {
        if (giftId === item.giftIdValue) {
          const orderItemIdx = parseInt(key.split("-")[0]);
          const orderItem = order?.orderItems?.[orderItemIdx];
          if (orderItem) {
            const comboQty = orderItem.comboQuantity ?? 1;
            return sum + (orderItem.giftQuantity ?? 0) * comboQty;
          }
        }
        return sum;
      }, 0);
      return item.availableQuantity > 0;
    });
  }, [inventoryItems, selectedRandomGifts, order?.orderItems]);

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
          const giftKey = `${idx}-gift-random`;
          const selectedGiftId = selectedRandomGifts[giftKey];
          gifts.push({
            key: giftKey,
            giftProductId: selectedGiftId || "",
            giftProductName: selectedGiftId
              ? getItemDisplayName(inventoryItems.find((item) => item.giftIdValue === selectedGiftId) || { itemType: "GIFT", giftId: selectedGiftId } as any)
              : "Chọn quà thực tế",
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
  }, [order, selectedRandomGifts, inventoryItems]);

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
      width: 250,
      render: (name: string, record: GiftDisplayItem) => {
        if (record.mode === "RANDOM") {
          // RANDOM: Show dropdown to select actual gift
          const giftOptions = availableGifts.map((item) => ({
            label: `${getItemDisplayName(item)} - Còn: ${item.availableQuantity}`,
            value: item.giftIdValue,
          }));

          return (
            <Space>
              <GiftOutlined />
              <Select
                placeholder="Chọn quà thực tế"
                value={record.giftProductId || undefined}
                onChange={(value) => {
                  setSelectedRandomGifts((prev) => ({ ...prev, [record.key]: value }));
                }}
                options={giftOptions}
                style={{ minWidth: 200 }}
                size="small"
                loading={inventoryLoading}
                showSearch
                optionFilterProp="label"
              />
            </Space>
          );
        }
        return (
          <Space>
            <GiftOutlined />
            <Text>{name}</Text>
            <Tag color="purple" style={{ fontSize: 10 }}>Khách chọn</Tag>
          </Space>
        );
      },
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (qty: number, record: GiftDisplayItem) => (
        <Space>
          <Text strong>{qty}</Text>
          {record.mode === "RANDOM" && !record.giftProductId && (
            <Tag color="orange" style={{ fontSize: 10 }}>Chưa chọn</Tag>
          )}
        </Space>
      ),
    },
  ], [availableGifts, inventoryLoading]);

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

    // Validate that all RANDOM gifts have been selected
    const missingRandomGifts = displayItems.some((item) =>
      item.gifts.some((gift) => gift.mode === "RANDOM" && !gift.giftProductId)
    );

    if (missingRandomGifts) {
      void message.error("Vui lòng chọn quà cho tất cả mục RANDOM trước khi xuất kho");
      return;
    }

    // Build actualShipments from selected gifts
    const shipmentItems: ShipmentItem[] = [];

    // Process RANDOM gifts from selectedRandomGifts
    Object.entries(selectedRandomGifts).forEach(([key, giftId]) => {
      if (giftId) {
        const orderItemIdx = parseInt(key.split("-")[0]);
        const orderItem = order.orderItems?.[orderItemIdx];
        if (orderItem) {
          const comboQty = orderItem.comboQuantity ?? 1;
          const giftQty = (orderItem.giftQuantity ?? 0) * comboQty;
          shipmentItems.push({
            itemType: "GIFT",
            giftId,
            quantity: giftQty,
          });
        }
      }
    });

    try {
      const payload: { items?: ShipmentItem[]; note?: string } = {
        note: shipNote || undefined,
        ...(shipmentItems.length > 0 ? { items: shipmentItems } : {}),
      };

      await shipMutation.mutateAsync({
        orderId: order._id,
        payload,
      });

      message.success("Xuất kho thành công!");
      setShipNote("");
      setSelectedRandomGifts({});
      onSuccess?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Xuất kho thất bại");
    }
  }, [order, shipNote, shipMutation, onSuccess, onClose, selectedRandomGifts, displayItems]);

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
      destroyOnHidden
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
