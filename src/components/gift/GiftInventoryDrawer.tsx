"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Radio, Table, Tag } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { GiftListItem, GiftInventoryHistoryItem } from "@/hooks/useGifts";

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

const historyLabels: Record<GiftInventoryHistoryItem["type"], string> = {
  INITIAL: "Khởi tạo",
  IMPORT: "Nhập thêm",
  ADJUSTMENT: "Điều chỉnh",
};

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
  const [form] = Form.useForm();
  const isHistory = mode === "HISTORY";

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open, mode, gift?._id]);

  const title =
    mode === "IMPORT"
      ? "Nhập tồn quà tặng"
      : mode === "ADJUSTMENT"
        ? "Điều chỉnh tồn quà tặng"
        : "Lịch sử tồn quà tặng";

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
      submitText={mode === "IMPORT" ? "Nhập tồn" : "Xác nhận điều chỉnh"}
    >
      {gift && (
        <div style={{ marginBottom: 20 }}>
          <strong>{gift.name}</strong>
          <div style={{ color: "#595959", marginTop: 4 }}>
            Tồn hiện tại: {gift.stockQuantity.toLocaleString("vi-VN")}
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
              title: "Thời gian",
              dataIndex: "createdAt",
              width: 170,
              render: (value: string) => new Date(value).toLocaleString("vi-VN"),
            },
            {
              title: "Loại",
              dataIndex: "type",
              width: 110,
              render: (value: GiftInventoryHistoryItem["type"]) => (
                <Tag color={value === "IMPORT" ? "green" : value === "ADJUSTMENT" ? "orange" : "blue"}>
                  {historyLabels[value]}
                </Tag>
              ),
            },
            { title: "Trước", dataIndex: "quantityBefore", align: "right", width: 80 },
            {
              title: "Thay đổi",
              dataIndex: "quantityChange",
              align: "right",
              width: 100,
              render: (value: number) => (
                <span style={{ color: value >= 0 ? "#389e0d" : "#cf1322" }}>
                  {value > 0 ? "+" : ""}{value}
                </span>
              ),
            },
            { title: "Sau", dataIndex: "quantityAfter", align: "right", width: 80 },
            {
              title: "Người tạo",
              key: "createdBy",
              width: 140,
              render: (_, item) => item.createdBy?.fullName ?? "-",
            },
            { title: "Ghi chú", dataIndex: "note" },
          ]}
        />
      ) : (
        <Form form={form} layout="vertical">
          {mode === "ADJUSTMENT" && (
            <Form.Item
              name="direction"
              label="Loại điều chỉnh"
              initialValue="INCREASE"
              rules={[{ required: true, message: "Vui lòng chọn loại điều chỉnh" }]}
            >
              <Radio.Group>
                <Radio value="INCREASE">Tăng tồn</Radio>
                <Radio value="DECREASE">Giảm tồn</Radio>
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item
            name="quantity"
            label={mode === "IMPORT" ? "Số lượng nhập" : "Số lượng điều chỉnh"}
            rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="note"
            label="Ghi chú"
            rules={[{ required: true, whitespace: true, message: "Vui lòng nhập ghi chú" }]}
          >
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      )}
    </DrawerForm>
  );
}
