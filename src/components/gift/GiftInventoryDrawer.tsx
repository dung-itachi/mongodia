"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, InputNumber, Radio, Table, Tag } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { GiftListItem, GiftInventoryHistoryItem } from "@/hooks/useGifts";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

type InventoryMode = "IMPORT" | "ADJUSTMENT" | "HISTORY";

interface GiftInventoryDrawerProps {
  mode: InventoryMode;
  gift: GiftListItem | null;
  open: boolean;
  loading?: boolean;
  history: GiftInventoryHistoryItem[];
  historyLoading?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    quantity: number;
    note: string;
    direction?: "INCREASE" | "DECREASE";
  }) => void;
}

export default function GiftInventoryDrawer({
  mode,
  gift,
  open,
  loading,
  history,
  historyLoading,
  onClose,
  onSubmit,
}: GiftInventoryDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm();
  const isHistory = mode === "HISTORY";

  const historyLabels = useMemo<Record<GiftInventoryHistoryItem["type"], string>>(
    () => ({
      INITIAL: t("Khởi tạo", lang),
      IMPORT: t("Nhập thêm", lang),
      ADJUSTMENT: t("Điều chỉnh", lang),
    }),
    [lang]
  );

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open, mode, gift?._id]);

  const title =
    mode === "IMPORT"
      ? t("Nhập tồn quà tặng", lang)
      : mode === "ADJUSTMENT"
        ? t("Điều chỉnh tồn quà tặng", lang)
        : t("Lịch sử tồn quà tặng", lang);

  const handleSubmit = () => {
    void form.validateFields().then((values) => onSubmit(values));
  };

  return (
    <DrawerForm
      open={open}
      title={title}
      width={isHistory ? 820 : 500}
      loading={loading}
      onClose={onClose}
      onSubmit={isHistory ? undefined : handleSubmit}
      submitText={mode === "IMPORT" ? t("Nhập tồn", lang) : t("Xác nhận điều chỉnh", lang)}
    >
      {gift && (
        <div style={{ marginBottom: 20 }}>
          <strong>{gift.name}</strong>
          <div style={{ color: "#595959", marginTop: 4 }}>
            {t("Tồn hiện tại", lang)}: {gift.stockQuantity.toLocaleString("vi-VN")}
          </div>
        </div>
      )}

      {isHistory ? (
        <Table<GiftInventoryHistoryItem>
          rowKey="_id"
          size="small"
          loading={historyLoading}
          pagination={false}
          dataSource={history}
          columns={[
            {
              title: t("Thời gian", lang),
              dataIndex: "createdAt",
              width: 170,
              render: (value: string) => new Date(value).toLocaleString("vi-VN"),
            },
            {
              title: t("Loại", lang),
              dataIndex: "type",
              width: 110,
              render: (value: GiftInventoryHistoryItem["type"]) => (
                <Tag color={value === "IMPORT" ? "green" : value === "ADJUSTMENT" ? "orange" : "blue"}>
                  {historyLabels[value]}
                </Tag>
              ),
            },
            { title: t("Trước", lang), dataIndex: "quantityBefore", align: "right", width: 80 },
            {
              title: t("Thay đổi", lang),
              dataIndex: "quantityChange",
              align: "right",
              width: 100,
              render: (value: number) => (
                <span style={{ color: value >= 0 ? "#389e0d" : "#cf1322" }}>
                  {value > 0 ? "+" : ""}{value}
                </span>
              ),
            },
            { title: t("Sau", lang), dataIndex: "quantityAfter", align: "right", width: 80 },
            {
              title: t("Người tạo", lang),
              key: "createdBy",
              width: 140,
              render: (_, item) => item.createdBy?.fullName ?? "-",
            },
            { title: t("Ghi chú", lang), dataIndex: "note" },
          ]}
        />
      ) : (
        <Form form={form} layout="vertical">
          {mode === "ADJUSTMENT" && (
            <Form.Item
              name="direction"
              label={t("Loại điều chỉnh", lang)}
              initialValue="INCREASE"
              rules={[{ required: true, message: t("Vui lòng chọn loại điều chỉnh", lang) }]}
            >
              <Radio.Group>
                <Radio value="INCREASE">{t("Tăng tồn", lang)}</Radio>
                <Radio value="DECREASE">{t("Giảm tồn", lang)}</Radio>
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item
            name="quantity"
            label={mode === "IMPORT" ? t("Số lượng nhập", lang) : t("Số lượng điều chỉnh", lang)}
            rules={[{ required: true, message: t("Vui lòng nhập số lượng", lang) }]}
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="note"
            label={t("Ghi chú", lang)}
            rules={[{ required: true, whitespace: true, message: t("Vui lòng nhập ghi chú", lang) }]}
          >
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      )}
    </DrawerForm>
  );
}