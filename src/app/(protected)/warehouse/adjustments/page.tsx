"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from "antd";
import { PlusOutlined, MinusCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import { useWarehouseAdjustments, useCreateAdjustment } from "@/hooks/useWarehouseAdjustments";

type AdjustmentRow = {
  itemType: "PRODUCT" | "GIFT";
  productId?: string;
  variantId?: string;
  giftId?: string;
  newQuantity: number;
  reason: string;
};

type Direction = "INCREASE" | "DECREASE" | "NEUTRAL";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PRODUCT: { label: "Sản phẩm", color: "blue" },
  GIFT: { label: "Quà tặng", color: "green" },
};

const DIRECTION_META: Record<Direction, { label: string; color: string; sign: "+" | "-" | "±"; icon: React.ReactNode }> = {
  INCREASE: { label: "Tăng", color: "green", sign: "+", icon: <ArrowUpOutlined /> },
  DECREASE: { label: "Giảm", color: "red", sign: "-", icon: <ArrowDownOutlined /> },
  NEUTRAL: { label: "Không đổi", color: "default", sign: "±", icon: <MinusOutlined /> },
};

function readDirection(row: Record<string, unknown>): Direction {
  const value = row.direction;
  if (value === "INCREASE" || value === "DECREASE" || value === "NEUTRAL") return value;
  // Backward-compatibility fallback: derive from `changeSigned` if present
  const signed = Number(row.changeSigned ?? 0);
  if (signed > 0) return "INCREASE";
  if (signed < 0) return "DECREASE";
  return "NEUTRAL";
}

function formatQuantity(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

export default function WarehouseAdjustmentsPage() {
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const gifts = giftResponse?.items ?? [];
  const [products, setProducts] = useState<{ _id: string; code: string; name: string }[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();

  const filters = useMemo(
    () => ({ warehouseId, page, limit: pageSize }),
    [warehouseId, page, pageSize]
  );
  const { data, loading, refetch } = useWarehouseAdjustments(filters);
  const createAdjustment = useCreateAdjustment();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState<AdjustmentRow[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/products?limit=100")
      .then((res) => res.json())
      .then((data) => setProducts(data?.data?.items ?? []))
      .catch(() => undefined);
  }, [open]);

  const reset = () => {
    form.resetFields();
    setItems([]);
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (!items.length) {
      message.warning("Vui lòng thêm ít nhất 1 mặt hàng");
      return;
    }

    // Validate each item has reason
    const invalidItem = items.find((item) => !item.reason?.trim());
    if (invalidItem) {
      message.warning("Vui lòng nhập lý do điều chỉnh cho tất cả các mặt hàng");
      return;
    }

    try {
      await createAdjustment.mutateAsync({
        warehouseId: values.warehouseId,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          giftId: item.giftId,
          newQuantity: item.newQuantity,
          reason: item.reason,
        })),
        note: values.note,
      });
      message.success("Điều chỉnh tồn kho thành công");
      setOpen(false);
      reset();
      void refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Điều chỉnh thất bại");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Mã điều chỉnh",
        dataIndex: "referenceCode",
        width: 180,
        key: "code",
      },
      {
        title: "Kho",
        dataIndex: "warehouseId",
        width: 160,
        key: "warehouse",
        render: (value: unknown) => readWarehouseName(value),
      },
      {
        title: "Loại",
        dataIndex: "itemType",
        width: 130,
        key: "type",
        render: (value: unknown) => (
          <Tag color={TYPE_LABELS[String(value)]?.color}>
            {TYPE_LABELS[String(value)]?.label ?? String(value)}
          </Tag>
        ),
      },
      {
        title: "Mặt hàng",
        key: "item",
        render: (_: unknown, row: Record<string, unknown>) => {
          if (row.itemType === "GIFT") {
            return (row.giftId as { name?: string } | null)?.name ?? "Quà tặng";
          }
          const variant = row.variantId as { sku?: string } | null;
          const product = row.productId as { name?: string; code?: string } | null;
          return `${product?.name ?? product?.code ?? "Sản phẩm"} • ${variant?.sku ?? "N/A"}`;
        },
      },
      {
        title: "Hướng điều chỉnh",
        key: "direction",
        width: 170,
        filterMultiple: false,
        filters: [
          { text: "Tăng", value: "INCREASE" },
          { text: "Giảm", value: "DECREASE" },
          { text: "Không đổi", value: "NEUTRAL" },
        ],
        onFilter: (value: unknown, row: Record<string, unknown>) =>
          readDirection(row) === value,
        render: (_: unknown, row: Record<string, unknown>) => {
          const direction = readDirection(row);
          const meta = DIRECTION_META[direction];
          return (
            <Tag color={meta.color} icon={meta.icon}>
              {meta.label}
            </Tag>
          );
        },
      },
      {
        title: "Trước → Sau",
        key: "beforeAfter",
        width: 200,
        align: "right" as const,
        render: (_: unknown, row: Record<string, unknown>) => {
          const beforeRaw = row.beforeQuantity;
          const afterRaw = row.afterQuantity;
          const before = typeof beforeRaw === "number" ? beforeRaw : Number(beforeRaw ?? 0);
          const after = typeof afterRaw === "number" ? afterRaw : Number(afterRaw ?? 0);
          if (!Number.isFinite(before) && !Number.isFinite(after)) return "-";
          const direction = readDirection(row);
          const color = direction === "INCREASE" ? "#52c41a" : direction === "DECREASE" ? "#f5222d" : "#8c8c8c";
          return (
            <span style={{ fontFamily: "monospace", color }}>
              {formatQuantity(before)} → {formatQuantity(after)}
            </span>
          );
        },
      },
      {
        title: "Số lượng thay đổi",
        key: "change",
        width: 150,
        align: "right" as const,
        render: (_: unknown, row: Record<string, unknown>) => {
          const direction = readDirection(row);
          const meta = DIRECTION_META[direction];
          const signed = row.changeSigned !== undefined
            ? Number(row.changeSigned)
            : Number(row.quantity ?? 0) * (direction === "DECREASE" ? -1 : direction === "INCREASE" ? 1 : 0);
          return (
            <span style={{ color: meta.color === "default" ? "#8c8c8c" : meta.color, fontWeight: 600 }}>
              {meta.sign}{formatQuantity(Math.abs(signed))}
            </span>
          );
        },
      },
      {
        title: "Người thực hiện",
        dataIndex: "createdBy",
        width: 180,
        key: "creator",
        render: (value: unknown) =>
          ((value as { fullName?: string } | null)?.fullName ?? "-"),
      },
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        width: 180,
        key: "createdAt",
        render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN"),
      },
    ],
    []
  );

  function readWarehouseName(value: unknown) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "name" in value) {
      return (value as { name?: string }).name ?? "-";
    }
    return "-";
  }

  const productOptions = useMemo(
    () =>
      (products ?? []).map((product: { _id: string; name: string; code: string }) => ({
        value: product._id,
        label: `${product.code} • ${product.name}`,
      })),
    [products]
  );

  const giftOptions = useMemo(
    () =>
      (gifts ?? []).map((gift: { _id: string; name: string }) => ({
        value: gift._id,
        label: gift.name,
      })),
    [gifts]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Điều chỉnh tồn kho"
        subtitle={`${data?.total ?? 0} điều chỉnh`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: "Điều chỉnh tồn kho" },
        ]}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Tạo điều chỉnh
          </Button>
        }
      />

      <div className="card">
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Kho"
            style={{ width: 200 }}
            value={warehouseId}
            onChange={(value) => {
              setWarehouseId(value);
              setPage(1);
            }}
            options={[
              { value: "", label: "Tất cả kho" },
              ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({
                value: w._id,
                label: w.name,
              })),
            ]}
          />
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      </div>

      <Modal
        title="Điều chỉnh tồn kho"
        open={open}
        onCancel={() => {
          setOpen(false);
          reset();
        }}
        onOk={submit}
        confirmLoading={createAdjustment.isPending}
        width={800}
        okText="Lưu điều chỉnh"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Kho"
            name="warehouseId"
            rules={[{ required: true, message: "Vui lòng chọn kho" }]}
          >
            <Select
              options={(warehouses ?? []).map((w: { _id: string; name: string }) => ({
                value: w._id,
                label: w.name,
              }))}
              placeholder="Chọn kho"
            />
          </Form.Item>

          <Form.Item label="Ghi chú chung" name="note">
            <Input.TextArea maxLength={500} rows={2} placeholder="Ghi chú (tùy chọn)" />
          </Form.Item>

          <CardSection title="Danh sách mặt hàng điều chỉnh">
            <Button
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { itemType: "PRODUCT", newQuantity: 0, reason: "" },
                ])
              }
              icon={<PlusOutlined />}
              type="dashed"
              block
            >
              Thêm dòng
            </Button>

            <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={8}>
              {items.map((row, index) => (
                <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start", width: "100%" }}>
                  <Select
                    style={{ width: 120 }}
                    value={row.itemType}
                    options={[
                      { value: "PRODUCT", label: "Sản phẩm" },
                      { value: "GIFT", label: "Quà tặng" },
                    ]}
                    onChange={(value) =>
                      setItems((current) =>
                        current.map((item, idx) =>
                          idx === index ? { ...item, itemType: value } : item
                        )
                      )
                    }
                  />

                  {row.itemType === "PRODUCT" ? (
                    <Select
                      style={{ width: 200 }}
                      placeholder="Sản phẩm"
                      value={row.productId}
                      options={productOptions}
                      onChange={(value) =>
                        setItems((current) =>
                          current.map((item, idx) =>
                            idx === index
                              ? { ...item, productId: value, variantId: undefined, giftId: undefined }
                              : item
                          )
                        )
                      }
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    />
                  ) : (
                    <Select
                      style={{ width: 200 }}
                      placeholder="Quà tặng"
                      value={row.giftId}
                      options={giftOptions}
                      onChange={(value) =>
                        setItems((current) =>
                          current.map((item, idx) =>
                            idx === index
                              ? { ...item, giftId: value, productId: undefined, variantId: undefined }
                              : item
                          )
                        )
                      }
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    />
                  )}

                  <InputNumber
                    style={{ width: 100 }}
                    placeholder="SL mới"
                    min={0}
                    value={row.newQuantity}
                    onChange={(value) =>
                      setItems((current) =>
                        current.map((item, idx) =>
                          idx === index
                            ? { ...item, newQuantity: value ?? 0 }
                            : item
                        )
                      )
                    }
                  />

                  <Input
                    style={{ width: 180 }}
                    placeholder="Lý do"
                    value={row.reason}
                    onChange={(e) =>
                      setItems((current) =>
                        current.map((item, idx) =>
                          idx === index
                            ? { ...item, reason: e.target.value }
                            : item
                        )
                      )
                    }
                  />

                  <Button
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, idx) => idx !== index)
                      )
                    }
                  />
                </div>
              ))}
            </Space>
          </CardSection>
        </Form>
      </Modal>
    </PageContainer>
  );
}
