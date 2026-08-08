"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, message } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import { useCreateReceipt, useWarehouseReceipts } from "@/hooks/useWarehouseWorkflow";

type ItemRow = { itemType: "PRODUCT" | "GIFT"; productId?: string; variantId?: string; giftId?: string; orderedQuantity: number; receivedQuantity: number };

export default function WarehouseReceiptsPage() {
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const gifts = giftResponse?.items ?? [];
  const [products, setProducts] = useState<{ _id: string; code: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, loading } = useWarehouseReceipts({ page, limit: pageSize });
  const createReceipt = useCreateReceipt();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/products?limit=100")
      .then((res) => res.json())
      .then((data) => setProducts(data?.data?.items ?? []))
      .catch(() => undefined);
  }, [open]);

  const reset = () => { form.resetFields(); setItems([]); };

  const submit = async () => {
    const values = await form.validateFields();
    if (!items.length) { message.warning("Vui lòng thêm ít nhất 1 mặt hàng"); return; }
    try {
      await createReceipt.mutateAsync({ warehouseId: values.warehouseId, items, note: values.note });
      message.success("Tạo phiếu nhập kho thành công");
      setOpen(false);
      reset();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Tạo phiếu nhập thất bại");
    }
  };

  const columns = useMemo(() => [
    { key: "code", title: "Mã phiếu", dataIndex: "receiptCode", width: 160 },
    { key: "warehouse", title: "Kho", dataIndex: "warehouseId", width: 160, render: (value: unknown) => readWarehouseName(value) },
    { key: "items", title: "Số mặt hàng", width: 130, render: (_: unknown, row: Record<string, unknown>) => Array.isArray(row.items) ? row.items.length : 0 },
    { key: "ordered", title: "SL đặt", width: 120, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { orderedQuantity?: number }[] | undefined, "orderedQuantity") },
    { key: "received", title: "SL thực nhận", width: 130, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { receivedQuantity?: number }[] | undefined, "receivedQuantity") },
    { key: "diff", title: "Chênh lệch", width: 130, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { difference?: number }[] | undefined, "difference") },
    { key: "creator", title: "Người tạo", dataIndex: "createdBy", width: 160, render: (value: unknown) => ((value as { fullName?: string } | null)?.fullName ?? "-") },
    { key: "createdAt", title: "Ngày tạo", dataIndex: "createdAt", width: 160, render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN") },
  ], []);

  function sumQuantity(items: { [k: string]: number }[] | undefined, key: string) {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + Number(item?.[key] ?? 0), 0);
  }

  function readWarehouseName(value: unknown) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "name" in value) {
      return (value as { name?: string }).name ?? "-";
    }
    return "-";
  }

  const productOptions = useMemo(() => (products ?? []).map((product: { _id: string; name: string; code: string }) => ({ value: product._id, label: `${product.code} • ${product.name}` })), [products]);
  const giftOptions = useMemo(() => (gifts ?? []).map((gift: { _id: string; name: string }) => ({ value: gift._id, label: gift.name })), [gifts]);

  return (
    <PageContainer>
      <PageHeader
        title="Nhập kho"
        subtitle={`${data?.total ?? 0} phiếu`}
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho", href: "/warehouses" }, { label: "Nhập kho" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo phiếu nhập</Button>}
      />
      <div className="card">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
        />
      </div>

      <Modal title="Tạo phiếu nhập kho" open={open} onCancel={() => { setOpen(false); reset(); }} onOk={submit} confirmLoading={createReceipt.isPending} width={760} okText="Lưu phiếu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item label="Kho nhập" name="warehouseId" rules={[{ required: true, message: "Vui lòng chọn kho" }]}>
            <Select options={(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))} placeholder="Chọn kho" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500} rows={2} /></Form.Item>
          <CardSection title="Danh sách mặt hàng">
            <Button onClick={() => setItems((current) => [...current, { itemType: "PRODUCT", orderedQuantity: 1, receivedQuantity: 1 }])} icon={<PlusOutlined />} type="dashed" block>
              Thêm dòng
            </Button>
            <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={8}>
              {items.map((row, index) => (
                <Space.Compact key={index} style={{ width: "100%" }}>
                  <Select
                    style={{ width: 120 }}
                    value={row.itemType}
                    options={[{ value: "PRODUCT", label: "Sản phẩm" }, { value: "GIFT", label: "Quà tặng" }]}
                    onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, itemType: value } : item))}
                  />
                  {row.itemType === "PRODUCT" ? (
                    <Select
                      style={{ width: 220 }}
                      placeholder="Sản phẩm"
                      value={row.productId}
                      options={productOptions}
                      onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, productId: value, variantId: undefined } : item))}
                    />
                  ) : (
                    <Select
                      style={{ width: 220 }}
                      placeholder="Quà tặng"
                      value={row.giftId}
                      options={giftOptions}
                      onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, giftId: value } : item))}
                    />
                  )}
                  <InputNumber style={{ width: 120 }} placeholder="SL đặt" min={0} value={row.orderedQuantity} onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, orderedQuantity: value ?? 0 } : item))} />
                  <InputNumber style={{ width: 130 }} placeholder="SL thực nhận" min={0} value={row.receivedQuantity} onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, receivedQuantity: value ?? 0 } : item))} />
                  <Button danger icon={<MinusCircleOutlined />} onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))} />
                </Space.Compact>
              ))}
            </Space>
          </CardSection>
        </Form>
      </Modal>
    </PageContainer>
  );
}
