"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import { useWarehouseAdjustments, useCreateAdjustment } from "@/hooks/useWarehouseAdjustments";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import { useMessage } from "@/contexts/MessageContext";
import type { WarehouseStockMovementType } from "@/models/WarehouseStockMovement";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


type AdjustmentRow = {
  itemType: "PRODUCT" | "GIFT";
  productId?: string;
  variantId?: string;
  giftId?: string;
  newQuantity: number;
  reason: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PRODUCT: { label: "Sản phẩm", color: "blue" },
  GIFT: { label: "Quà tặng", color: "green" },
};

// Movement type labels
const MOVEMENT_TYPE_LABELS: Record<WarehouseStockMovementType, { label: string; color: string }> = {
  IMPORT: { label: "Nhập kho", color: "green" },
  TRANSFER_OUT: { label: "Chuyển đi", color: "orange" },
  TRANSFER_IN: { label: "Nhận chuyển", color: "blue" },
  ORDER_OUT: { label: "Xuất đơn", color: "red" },
  ORDER_RETURN: { label: "Hoàn đơn", color: "purple" },
  ADJUSTMENT: { label: "Điều chỉnh", color: "magenta" },
};

// Movement types that decrease stock
const OUT_TYPES: WarehouseStockMovementType[] = ["TRANSFER_OUT", "ORDER_OUT"];

function formatQuantity(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

export default function WarehouseAdjustmentsPage() {
  const lang = useLanguageStore((s) => s.language);
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const message = useMessage();
  const gifts = giftResponse?.items ?? [];
  const [products, setProducts] = useState<{ _id: string; code: string; name: string }[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [movementType, setMovementType] = useState<string | undefined>();

  const filters = useMemo(
    () => ({ warehouseId, type: movementType, page, limit: pageSize }),
    [warehouseId, movementType, page, pageSize]
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
        title: "Thời gian",
        dataIndex: "createdAt",
        width: 160,
        key: "createdAt",
        render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN"),
      },
      {
        title: "Loại",
        dataIndex: "type",
        width: 130,
        key: "type",
        render: (value: string) => (
          <Tag color={MOVEMENT_TYPE_LABELS[value as WarehouseStockMovementType]?.color}>
            {MOVEMENT_TYPE_LABELS[value as WarehouseStockMovementType]?.label ?? value}
          </Tag>
        ),
      },
      {
        title: "Kho",
        dataIndex: "warehouseId",
        width: 160,
        key: "warehouse",
        render: (value: unknown) => readWarehouseName(value),
      },
      {
        title: "Mặt hàng",
        key: "item",
        width: 220,
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
        title: "Số lượng",
        dataIndex: "quantity",
        key: "quantity",
        width: 120,
        align: "right" as const,
        render: (value: number, row: Record<string, unknown>) => {
          const isOut = OUT_TYPES.includes(row.type as WarehouseStockMovementType);
          const sign = isOut ? "-" : "+";
          const color = isOut ? "#f5222d" : "#52c41a";
          return (
            <span style={{ fontWeight: 600, color }}>
              {sign}{formatQuantity(Math.abs(value))}
            </span>
          );
        },
      },
      {
        title: "Mã tham chiếu",
        dataIndex: "referenceCode",
        width: 160,
        key: "referenceCode",
        render: (value: string) => value || "-",
      },
      {
        title: "Người thực hiện",
        dataIndex: "createdBy",
        width: 180,
        key: "creator",
        render: (value: unknown) =>
          ((value as { fullName?: string } | null)?.fullName ?? "-"),
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
      <PageHeader title={t("Lịch sử tồn kho", lang)}
        subtitle={`${data?.total ?? 0} movement`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: "Lịch sử tồn kho" },
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
        <WarehouseQuickPick
          value={warehouseId}
          onChange={(next) => {
            setWarehouseId(next);
            setPage(1);
          }}
          warehouses={warehouses}
        />
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
          <Select
            allowClear
            placeholder="Loại"
            style={{ width: 160 }}
            value={movementType}
            onChange={(value) => {
              setMovementType(value);
              setPage(1);
            }}
            options={Object.entries(MOVEMENT_TYPE_LABELS).map(([value, info]) => ({
              value,
              label: info.label,
            }))}
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

            <Space orientation="vertical" style={{ width: "100%", marginTop: 12 }} size={8}>
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
