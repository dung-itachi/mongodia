"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal } from "antd";
import { useCreateAdjustment } from "@/hooks/useWarehouseAdjustments";
import type { NormalizedInventoryItem } from "@/hooks/useWarehouseInventory";
import { useMessage } from "@/contexts/MessageContext";

export interface AdjustInventoryModalProps {
  open: boolean;
  item: NormalizedInventoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type FormValues = {
  newQuantity: number;
  reason: string;
  note?: string;
};

function formatNumber(value: number | undefined | null): string {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

const readonlyLabelStyle: React.CSSProperties = {
  padding: "6px 11px",
  background: "#fafafa",
  border: "1px solid #d9d9d9",
  borderRadius: 6,
  fontVariantNumeric: "tabular-nums",
  minHeight: 32,
  display: "flex",
  alignItems: "center",
  color: "#595959",
};

export default function AdjustInventoryModal({
  open,
  item,
  onClose,
  onSuccess,
}: AdjustInventoryModalProps) {
  const [form] = Form.useForm<FormValues>();
  const createAdjustment = useCreateAdjustment();

  useEffect(() => {
    if (!open || !item) return;
    form.setFieldsValue({
      newQuantity: Number(item.quantity ?? 0),
      reason: "",
      note: "",
    });
  }, [open, item, form]);

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    if (!item) return;
    const warehouseId = item.warehouseIdValue;
    if (!warehouseId) {
      message.error("Không xác định được kho của dòng tồn kho này");
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = {
        warehouseId,
        items: [
          {
            productId: item.itemType === "PRODUCT" ? item.productIdValue || undefined : undefined,
            variantId: item.itemType === "PRODUCT" ? item.variantIdValue || undefined : undefined,
            giftId: item.itemType === "GIFT" ? item.giftIdValue || undefined : undefined,
            newQuantity: values.newQuantity,
            reason: values.reason,
          },
        ],
        note: values.note,
      };

      const result = await createAdjustment.mutateAsync(payload);
      const code = (result as { adjustmentCode?: string })?.adjustmentCode;
      message.success(
        code ? `Điều chỉnh tồn kho thành công. Mã: ${code}` : "Điều chỉnh tồn kho thành công"
      );
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const itemLabel = item
    ? item.itemType === "GIFT"
      ? item.displayName
      : [item.displayName, item.displayCode ? `SKU: ${item.displayCode}` : null].filter(Boolean).join(" • ")
    : "";

  const warehouseLabel = item ? (item.warehouseName || "-") : "-";

  // The 4 read-only columns are derived from the inventory row.
  const availableQty = Number(item?.availableQuantity ?? 0);
  const reservedQty = Number(item?.reservedQuantity ?? 0);
  const inTransitQty = Number(item?.inTransitQuantity ?? 0);
  const shippedQty = Number(item?.shippedQuantity ?? 0);

  return (
    <Modal
      title="Sửa số lượng tồn kho"
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={createAdjustment.isPending}
      okText="Lưu điều chỉnh"
      cancelText="Hủy"
      width={640}
      destroyOnHidden
    >
      {item && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: 16,
            background: "#f5f5f5",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div>
            <strong>Mặt hàng:</strong> {itemLabel}
          </div>
          <div>
            <strong>Loại:</strong> {item.itemType === "GIFT" ? "Quà tặng" : "Sản phẩm"}
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item label="Kho hiện tại">
          <div style={readonlyLabelStyle}>
            <strong>{warehouseLabel}</strong>
          </div>
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          <Form.Item label="Tồn kho" required style={{ marginBottom: 12 }}>
            <Form.Item
              name="newQuantity"
              noStyle
              rules={[
                { required: true, message: "Vui lòng nhập số lượng mới" },
                { type: "number", min: 0, message: "Số lượng phải ≥ 0" },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                placeholder="Nhập số lượng mới"
              />
            </Form.Item>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
              Hiện tại: {formatNumber(item?.quantity)}
            </div>
          </Form.Item>

          <Form.Item label="Khả dụng" style={{ marginBottom: 12 }}>
            <div style={readonlyLabelStyle}>{formatNumber(availableQty)}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
              = Tồn kho − Đã giữ − Đang chuyển
            </div>
          </Form.Item>

          <Form.Item label="Đã giữ" style={{ marginBottom: 12 }}>
            <div style={readonlyLabelStyle}>{formatNumber(reservedQty)}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
              Tự động từ đơn hàng
            </div>
          </Form.Item>

          <Form.Item label="Đang chuyển" style={{ marginBottom: 12 }}>
            <div style={readonlyLabelStyle}>{formatNumber(inTransitQty)}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
              Tự động từ phiếu chuyển kho
            </div>
          </Form.Item>

          <Form.Item label="Đã xuất" style={{ marginBottom: 12 }}>
            <div style={readonlyLabelStyle}>{formatNumber(shippedQty)}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
              Theo dõi lịch sử
            </div>
          </Form.Item>
        </div>

        <Form.Item
          label="Lý do điều chỉnh"
          name="reason"
          rules={[
            { required: true, message: "Vui lòng nhập lý do" },
            { min: 3, message: "Lý do phải có ít nhất 3 ký tự" },
            { max: 500, message: "Lý do tối đa 500 ký tự" },
          ]}
        >
          <Input.TextArea
            rows={2}
            maxLength={500}
            placeholder="Ví dụ: Kiểm kê thực tế, hàng hỏng, đếm nhầm..."
          />
        </Form.Item>

        <Form.Item label="Ghi chú (tùy chọn)" name="note">
          <Input.TextArea rows={2} maxLength={500} placeholder="Ghi chú thêm" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
