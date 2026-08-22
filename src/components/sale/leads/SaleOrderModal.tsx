"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Select, Spin, Typography } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import OrderProductDetail, { createOrderItemFromCombo } from "@/components/order/OrderProductDetail";
import { useComboList, type ComboListItem } from "@/hooks/useCombos";
import { useProductWithVariants } from "@/hooks/useProductVariants";
import type { SaleLead } from "@/hooks/useSaleLeads";
import {
  validateOrderItem,
  type OrderItem,
  type ProductVariantSelection,
} from "@/types/variant";
import { formatMNT } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface SaleOrderModalProps {
  lead: SaleLead | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}

function productId(combo: ComboListItem): string | null {
  return typeof combo.product === "string" ? combo.product : combo.product._id;
}

/**
 * Build initial OrderItem.details từ lead.variantDetails (Sprint 8.7).
 *
 * Quy ước (fix theo UX form chốt đơn):
 * - Mỗi sản phẩm trong combo = 1 DÒNG RIÊNG với quantity=1
 * - Nếu combo có packageQuantity=3 → tạo 3 dòng (mỗi dòng SL=1)
 * - Nếu lead đã có prefill: thử map theo variantId; nếu thiếu dòng → bổ sung dòng trống SL=1
 *
 * Mục đích: cho phép Sale chọn variant khác nhau cho mỗi sản phẩm trong combo
 * (vd combo 3 hộp: 2 đỏ + 1 xanh). Cũng giúp validate pass vì
 * details[i].variantId sẽ được resolve khi user chọn từng dòng.
 */
function buildInitialItem(
  combo: {
    _id: string;
    code: string;
    name: string;
    packageQuantity: number;
    giftQuantity: number;
    sellingPrice: number;
    productId: string;
  },
  lead: SaleLead | null,
  comboQuantity: number
): OrderItem {
  const base = createOrderItemFromCombo({
    _id: combo._id,
    code: combo.code,
    name: combo.name,
    packageQuantity: combo.packageQuantity,
    giftQuantity: combo.giftQuantity,
    sellingPrice: combo.sellingPrice,
    productId: combo.productId,
  });

  const item: OrderItem = {
    ...base,
    comboQuantity,
    giftMode: lead?.giftMode === "CUSTOMER_SELECTED" ? "CUSTOMER_SELECTED" : "RANDOM",
    giftSelections: Array.isArray(lead?.giftSelections)
      ? lead.giftSelections.map((g) => ({
          giftProductId: g.giftProductId,
          giftProductName: g.giftProductName,
          quantity: g.quantity,
        }))
      : [],
    discount: 0,
    subtotal: combo.sellingPrice * comboQuantity,
  };

  // Tổng số sản phẩm phải điền = comboQuantity × packageQuantity
  const totalProducts = comboQuantity * combo.packageQuantity;

  const variantDetails = lead?.variantDetails;
  if (variantDetails && variantDetails.length > 0) {
    // Expand từng variantDetail thành nhiều dòng theo quantity của nó
    const expanded: ProductVariantSelection[] = [];
    for (const vd of variantDetails) {
      const qty = Math.max(1, vd.quantity);
      const attrs = (vd.attributes ?? []).map((a) => ({
        optionId: a.optionId,
        valueId: a.valueId,
        optionName: a.optionName,
        valueName: a.valueName,
      }));
      // Mỗi đơn vị = 1 dòng riêng
      for (let i = 0; i < qty; i++) {
        expanded.push({
          quantity: 1,
          attributes: attrs.map((a) => ({ ...a })),
          variantId: i === 0 ? (vd.variantId ?? undefined) : undefined,
        });
      }
    }

    // Bù thêm dòng trống nếu thiếu so với totalProducts
    while (expanded.length < totalProducts) {
      expanded.push({ quantity: 1, attributes: [] });
    }
    // Cắt bớt nếu thừa
    if (expanded.length > totalProducts) {
      expanded.length = totalProducts;
    }

    item.details = expanded;
  } else {
    // Không có prefill: tạo packageQuantity dòng trống (mỗi dòng SL=1)
    item.details = Array.from({ length: totalProducts }, () => ({
      quantity: 1,
      attributes: [],
    }));
  }

  return item;
}

export default function SaleOrderModal({ lead, loading, onClose, onConfirm }: SaleOrderModalProps) {
  const lang = useLanguageStore((s) => s.language);
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
    const initialItem = buildInitialItem(
      {
        _id: initialCombo._id,
        code: initialCombo.code,
        name: initialCombo.name,
        packageQuantity: initialCombo.packageQuantity,
        giftQuantity: initialCombo.giftQuantity ?? 0,
        sellingPrice: initialCombo.sellingPrice,
        productId: productId(initialCombo) ?? "",
      },
      lead,
      lead.quantity && lead.quantity > 0 ? lead.quantity : 1
    );
    setItems([initialItem]);
  }, [lead, combos]);

  const selectCombo = (comboId: string) => {
    const combo = combos.find((item) => item._id === comboId);
    if (!combo) return;
    setSelectedComboId(comboId);
    const initialItem = buildInitialItem(
      {
        _id: combo._id,
        code: combo.code,
        name: combo.name,
        packageQuantity: combo.packageQuantity,
        giftQuantity: combo.giftQuantity ?? 0,
        sellingPrice: combo.sellingPrice,
        productId: productId(combo) ?? "",
      },
      lead,
      items[0]?.comboQuantity ?? (lead?.quantity && lead.quantity > 0 ? lead.quantity : 1)
    );
    setItems([initialItem]);
  };

  const item = items[0];
  const genericValidation = item ? validateOrderItem(item) : { isValid: false };

  // Sprint 8.7 — Biến thể thuộc SẢN PHẨM (không theo combo).
  // - Mỗi dòng details = 1 sản phẩm, phải chọn đủ attributes theo variantOptions.
  // - Sau khi chọn, resolveVariantId sẽ tìm variant tương ứng trong product.variants.
  // - Lỗi "Không tìm thấy biến thể" chỉ khi: đã chọn đủ attributes mà resolveVariantId trả null.
  const variantOptionsLen = product?.variantOptions?.length ?? 0;
  const hasVariantOptions = variantOptionsLen > 0;
  const allDetailsSelected = !hasVariantOptions
    || (item?.details ?? []).every((d) => d.attributes.length === variantOptionsLen);
  const allVariantsResolved = !hasVariantOptions
    || (item?.details ?? []).every((d) => !!d.variantId);

  // Gift: nếu CUSTOMER_SELECTED mà còn dòng chưa chọn sản phẩm → invalid
  const hasUnfilledGifts = item?.giftMode === "CUSTOMER_SELECTED"
    && (item.giftSelections ?? []).some((g) => !g.giftProductId);

  const validation = {
    isValid: genericValidation.isValid && allDetailsSelected && allVariantsResolved && !hasUnfilledGifts,
    detailsError: !allDetailsSelected
      ? t("Vui lòng chọn đầy đủ biến thể cho tất cả sản phẩm trong combo.", lang)
      : !allVariantsResolved
        ? t("Không tìm thấy biến thể phù hợp.", lang)
        : genericValidation.detailsError,
    giftsError: hasUnfilledGifts
      ? t("Vui lòng chọn sản phẩm cho tất cả quà tặng.", lang)
      : genericValidation.giftsError,
  };
  return (
    <Modal
      title={<><SwapOutlined style={{ marginRight: 8, color: "#52c41a" }} />{t("Chốt đơn", lang)}</>}
      open={Boolean(lead)}
      width={900}
      destroyOnHidden
      okText={t("Chốt đơn", lang)}
      cancelText={t("Hủy", lang)}
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
        <Typography.Text strong>{t("Combo", lang)}</Typography.Text>
        <Select
          value={selectedComboId}
          onChange={selectCombo}
          loading={combosLoading}
          style={{ display: "block", marginTop: 6, width: "100%" }}
          placeholder={t("Chọn combo", lang)}
          options={combos.map((combo) => ({ label: `${combo.name} - ${formatMNT(combo.sellingPrice)}`, value: combo._id }))}
        />
      </div>
      {!combosLoading && combos.length === 0 && <Alert type="warning" title={t("Không có combo đang hoạt động cho sản phẩm của khách hàng này.", lang)} showIcon />}
      {item && !validation.isValid && <Alert type="warning" title={validation.detailsError || validation.giftsError || t("Thông tin đơn hàng chưa hợp lệ.", lang)} showIcon style={{ marginBottom: 12 }} />}
      {productLoading ? <Spin /> : item && <OrderProductDetail items={items} product={product} onChange={setItems} disabled={loading} />}
    </Modal>
  );
}
