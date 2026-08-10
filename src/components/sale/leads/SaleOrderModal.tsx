"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Select, Spin, Typography } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import OrderProductDetail, { createOrderItemFromCombo } from "@/components/order/OrderProductDetail";
import { useComboList, type ComboListItem } from "@/hooks/useCombos";
import { useProductWithVariants } from "@/hooks/useProductVariants";
import type { SaleLead } from "@/hooks/useSaleLeads";
import { validateOrderItem, type OrderItem } from "@/types/variant";
import { formatMNT } from "@/lib/format";

interface SaleOrderModalProps {
  lead: SaleLead | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}

function productId(combo: ComboListItem): string | null {
  return typeof combo.product === "string" ? combo.product : combo.product._id;
}

export default function SaleOrderModal({ lead, loading, onClose, onConfirm }: SaleOrderModalProps) {
  const [selectedComboId, setSelectedComboId] = useState<string>();
  const [items, setItems] = useState<OrderItem[]>([]);
  const { data: combosData, isLoading: combosLoading } = useComboList({
    page: 1,
    limit: 100,
    productId: lead?.product?._id,
    isActive: true,
  });
  const combos = combosData?.items ?? [];
  const selectedCombo = useMemo(() => combos.find((combo) => combo._id === selectedComboId), [combos, selectedComboId]);
  const selectedProductId = selectedCombo ? productId(selectedCombo) : lead?.product?._id ?? null;
  const { product, loading: productLoading } = useProductWithVariants(selectedProductId);

  useEffect(() => {
    if (!lead) return;
    const initialCombo = combos.find((combo) => combo._id === lead.combo?._id) ?? combos[0];
    if (!initialCombo) return;
    setSelectedComboId(initialCombo._id);
    setItems([createOrderItemFromCombo({
      _id: initialCombo._id,
      code: initialCombo.code,
      name: initialCombo.name,
      packageQuantity: initialCombo.packageQuantity,
      giftQuantity: initialCombo.giftQuantity ?? 0,
      sellingPrice: initialCombo.sellingPrice,
      productId: productId(initialCombo) ?? "",
    })]);
  }, [lead, combos]);

  const selectCombo = (comboId: string) => {
    const combo = combos.find((item) => item._id === comboId);
    if (!combo) return;
    setSelectedComboId(comboId);
    setItems([createOrderItemFromCombo({
      _id: combo._id,
      code: combo.code,
      name: combo.name,
      packageQuantity: combo.packageQuantity,
      giftQuantity: combo.giftQuantity ?? 0,
      sellingPrice: combo.sellingPrice,
      productId: productId(combo) ?? "",
    })]);
  };

  const item = items[0];
  const genericValidation = item ? validateOrderItem(item) : { isValid: false };
  const hasVariantResolutionError = Boolean(product && product.variantOptions && product.variantOptions.length > 0 && item?.details.some((detail) => !detail.variantId));
  const validation = {
    isValid: genericValidation.isValid && !hasVariantResolutionError,
    detailsError: hasVariantResolutionError ? "Không tìm thấy biến thể phù hợp." : genericValidation.detailsError,
    giftsError: genericValidation.giftsError,
  };
  return (
    <Modal
      title={<><SwapOutlined style={{ marginRight: 8, color: "#52c41a" }} />Chốt đơn</>}
      open={Boolean(lead)}
      width={900}
      destroyOnHidden
      okText="Chốt đơn"
      cancelText="Hủy"
      onCancel={onClose}
      onOk={() => item && onConfirm(item)}
      okButtonProps={{ loading, disabled: !item || productLoading || !validation.isValid }}
    >
      {lead && <div style={{ marginBottom: 16 }}>
        <Typography.Text strong>{lead.customerName}</Typography.Text>
        <Typography.Text type="secondary"> {lead.phone ? `- ${lead.phone}` : ""}</Typography.Text>
        {lead.address && <div><Typography.Text type="secondary">{lead.address}</Typography.Text></div>}
      </div>}
      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong>Combo</Typography.Text>
        <Select
          value={selectedComboId}
          onChange={selectCombo}
          loading={combosLoading}
          style={{ display: "block", marginTop: 6, width: "100%" }}
          placeholder="Chọn combo"
          options={combos.map((combo) => ({ label: `${combo.name} - ${formatMNT(combo.sellingPrice)}`, value: combo._id }))}
        />
      </div>
      {!combosLoading && combos.length === 0 && <Alert type="warning" title="Không có combo đang hoạt động cho sản phẩm của lead." showIcon />}
      {item && !validation.isValid && <Alert type="warning" title={validation.detailsError || validation.giftsError || "Thông tin đơn hàng chưa hợp lệ."} showIcon style={{ marginBottom: 12 }} />}
      {productLoading ? <Spin /> : item && <OrderProductDetail items={items} product={product} onChange={setItems} disabled={loading} />}
    </Modal>
  );
}
