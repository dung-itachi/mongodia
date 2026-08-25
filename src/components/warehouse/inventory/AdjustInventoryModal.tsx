"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Divider, Tag, Space, Typography, Alert } from "antd";
import { InboxOutlined, GiftOutlined, HomeOutlined, HistoryOutlined, ClockCircleOutlined, CarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useCreateAdjustment } from "@/hooks/useWarehouseAdjustments";
import type { NormalizedInventoryItem } from "@/hooks/useWarehouseInventory";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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

function InfoRow({ icon, label, value, valueStyle }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #f0f0f0" }}>
      <Space size={8}>
        {icon}
        <span style={{ color: "#8c8c8c", fontSize: 13 }}>{label}</span>
      </Space>
      <span style={{ fontWeight: 600, fontSize: 14, ...valueStyle }}>{value}</span>
    </div>
  );
}

function ReadonlyBadge({ value, label, color, icon }: {
  value: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: 8,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <div style={{ color, fontSize: 18 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "#8c8c8c", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        <div style={{ color, fontWeight: 700, fontSize: 18 }}>{formatNumber(value)}</div>
      </div>
    </div>
  );
}

export default function AdjustInventoryModal({
  open,
  item,
  onClose,
  onSuccess,
}: AdjustInventoryModalProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm<FormValues>();
  const createAdjustment = useCreateAdjustment();
  const message = useMessage();

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
    const warehouseId = item.warehouseId;
    if (!warehouseId) {
      message.error(t("Không xác định được kho của dòng tồn kho này", lang));
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = {
        warehouseId: typeof warehouseId === "string" ? warehouseId : warehouseId._id,
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
      const successMsg = code
        ? `${t("Điều chỉnh tồn kho thành công. Mã:", lang)} ${code}`
        : t("Điều chỉnh tồn kho thành công", lang);
      message.success(successMsg);
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

  const availableQty = Number(item?.availableQuantity ?? 0);
  const reservedQty = Number(item?.reservedQuantity ?? 0);
  const inTransitQty = Number(item?.inTransitQuantity ?? 0);
  const shippedQty = Number(item?.shippedQuantity ?? 0);
  const currentQty = Number(item?.quantity ?? 0);
  const newQty = form.getFieldValue("newQuantity");
  const qtyDiff = newQty - currentQty;

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined style={{ color: "#1890ff" }} />
          <span>{t("Điều chỉnh tồn kho", lang)}</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={createAdjustment.isPending}
      okText={t("Lưu điều chỉnh", lang)}
      cancelText={t("Hủy", lang)}
      width={680}
      destroyOnHidden
    >
      {item && (
        <div style={{ marginBottom: 16 }}>
          {/* Item header */}
          <div style={{
            padding: "12px 16px",
            background: item.itemType === "GIFT" ? "#f9f0ff" : "#f0f5ff",
            borderRadius: 10,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Tag
                color={item.itemType === "GIFT" ? "purple" : "blue"}
                style={{ borderRadius: 6, margin: 0 }}
              >
                <Space size={4}>
                  {item.itemType === "GIFT" ? <GiftOutlined /> : <InboxOutlined />}
                  {item.itemType === "GIFT" ? t("Quà tặng", lang) : t("Sản phẩm", lang)}
                </Space>
              </Tag>
              <Space size={4}>
                <HomeOutlined style={{ color: "#8c8c8c" }} />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>{warehouseLabel}</Typography.Text>
              </Space>
            </div>
            <Typography.Title level={5} style={{ margin: 0 }}>{itemLabel}</Typography.Title>
          </div>

          {/* Summary badges */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <ReadonlyBadge
              value={currentQty}
              label={t("Tồn kho hiện tại", lang)}
              color="#1890ff"
              icon={<InboxOutlined />}
            />
            <ReadonlyBadge
              value={availableQty}
              label={t("Khả dụng", lang)}
              color="#52c41a"
              icon={<CheckCircleOutlined />}
            />
            <ReadonlyBadge
              value={shippedQty}
              label={t("Đã xuất", lang)}
              color="#8c8c8c"
              icon={<HistoryOutlined />}
            />
          </div>

          {/* Reserved & in transit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <ReadonlyBadge
              value={reservedQty}
              label={t("Đã giữ", lang)}
              color="#faad14"
              icon={<ClockCircleOutlined />}
            />
            <ReadonlyBadge
              value={inTransitQty}
              label={t("Đang chuyển", lang)}
              color="#1890ff"
              icon={<CarOutlined />}
            />
          </div>

          {/* Change preview */}
          {newQty !== undefined && qtyDiff !== 0 && (
            <Alert
              title={
                <Space>
                  <span>
                    {t("Thay đổi:", lang)} <strong>{qtyDiff > 0 ? `+${formatNumber(qtyDiff)}` : formatNumber(qtyDiff)}</strong>
                    {qtyDiff > 0 ? ` (${t("tăng", lang)})` : ` (${t("giảm", lang)})`}
                  </span>
                </Space>
              }
              type={qtyDiff > 0 ? "success" : "warning"}
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}
        </div>
      )}

      <Divider style={{ margin: "0 0 16px" }} />

      <Form form={form} layout="vertical" requiredMark="optional">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Form.Item
            label={t("Số lượng mới", lang)}
            name="newQuantity"
            required
            help={`${t("Hiện tại:", lang)} ${formatNumber(currentQty)}`}
            rules={[
              { required: true, message: t("Vui lòng nhập số lượng mới", lang) },
              { type: "number", min: 0, message: t("Số lượng phải ≥ 0", lang) },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder={t("Nhập số lượng mới", lang)}
              size="large"
              formatter={(value) =>
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(value) => {
                const parsed = value?.replace(/,/g, "");
                return parsed ? Number(parsed) : 0;
              }}
              onChange={() => {
                // Trigger re-render for change preview
                form.setFieldsValue({ newQuantity: form.getFieldValue("newQuantity") });
              }}
            />
          </Form.Item>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ height: 22 }} />
            {qtyDiff !== 0 && newQty !== undefined && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                background: qtyDiff > 0 ? "#f6ffed" : "#fff2f0",
                border: `1px solid ${qtyDiff > 0 ? "#b7eb8f" : "#ffccc7"}`,
              }}>
                <span style={{ fontSize: 13, color: qtyDiff > 0 ? "#52c41a" : "#ff4d4f" }}>
                  → {t("Tồn kho mới:", lang)} <strong>{formatNumber(newQty)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <Form.Item
          label={t("Lý do điều chỉnh", lang)}
          name="reason"
          rules={[
            { required: true, message: t("Vui lòng nhập lý do", lang) },
            { min: 3, message: t("Lý do phải có ít nhất 3 ký tự", lang) },
            { max: 500, message: t("Lý do tối đa 500 ký tự", lang) },
          ]}
        >
          <Input.TextArea
            rows={2}
            maxLength={500}
            showCount
            placeholder={t("Ví dụ: Kiểm kê thực tế, hàng hỏng, đếm nhầm...", lang)}
          />
        </Form.Item>

        <Form.Item label={t("Ghi chú (tùy chọn)", lang)} name="note">
          <Input.TextArea rows={2} maxLength={500} showCount placeholder={t("Ghi chú thêm", lang)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
