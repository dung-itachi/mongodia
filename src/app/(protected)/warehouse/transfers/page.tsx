"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import { useCreateTransfer, useReceiveTransfer, useWarehouseTransfers } from "@/hooks/useWarehouseWorkflow";

type ItemRow = { itemType: "PRODUCT" | "GIFT"; productId?: string; giftId?: string; quantity: number };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "default" },
  SENT: { label: "Đang chuyển", color: "processing" },
  RECEIVED: { label: "Đã nhận", color: "success" },
  COMPLETED: { label: "Hoàn tất", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "red" },
};

export default function WarehouseTransfersPage() {
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const gifts = giftResponse?.items ?? [];
  const [products, setProducts] = useState<{ _id: string; code: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, loading } = useWarehouseTransfers({ page, limit: pageSize });
  const createTransfer = useCreateTransfer();
  const receiveTransfer = useReceiveTransfer();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemRow[]>([]);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [active, setActive] = useState<{ _id: string; items: { sentQuantity: number }[] } | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/products?limit=100").then((res) => res.json()).then((data) => setProducts(data?.data?.items ?? []));
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    if (!items.length) { message.warning("Vui lòng thêm ít nhất 1 mặt hàng"); return; }
    try {
      await createTransfer.mutateAsync({ sourceWarehouseId: values.sourceWarehouseId, destinationWarehouseId: values.destinationWarehouseId, items, note: values.note, status: "SENT" });
      message.success("Tạo phiếu chuyển kho thành công");
      setOpen(false);
      form.resetFields();
      setItems([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Tạo phiếu chuyển kho thất bại");
    }
  };

  const startReceive = (record: { _id: string; items: { sentQuantity: number }[] }) => {
    setActive(record);
    setReceiveQuantities(record.items.map((item) => item.sentQuantity));
    setReceiveOpen(true);
  };

  const submitReceive = async () => {
    if (!active) return;
    try {
      await receiveTransfer.mutateAsync({ id: active._id, payload: { receivedQuantities: receiveQuantities } });
      message.success("Nhận kho thành công");
      setReceiveOpen(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Nhận kho thất bại");
    }
  };

  const columns = useMemo(() => [
    { key: "code", title: "Mã phiếu", dataIndex: "transferCode", width: 160 },
    { key: "source", title: "Kho nguồn", dataIndex: "sourceWarehouseId", width: 160, render: (value: unknown) => readWarehouseName(value) },
    { key: "dest", title: "Kho đích", dataIndex: "destinationWarehouseId", width: 160, render: (value: unknown) => readWarehouseName(value) },
    { key: "items", title: "Số mặt hàng", width: 130, render: (_: unknown, row: Record<string, unknown>) => Array.isArray(row.items) ? row.items.length : 0 },
    { key: "quantity", title: "Tổng SL", align: "right" as const, width: 130, render: (_: unknown, row: Record<string, unknown>) => sumQuantities(row.items as { sentQuantity?: number }[] | undefined) },
    { key: "creator", title: "Người tạo", dataIndex: "createdBy", width: 160, render: (value: unknown) => ((value as { fullName?: string } | null)?.fullName ?? "-") },
    { key: "status", title: "Trạng thái", dataIndex: "status", width: 140, render: (value: unknown) => <Tag color={STATUS_LABELS[String(value)]?.color}>{STATUS_LABELS[String(value)]?.label ?? String(value)}</Tag> },
    {
      key: "actions", title: "Thao tác", width: 180, render: (_: unknown, row: Record<string, unknown>) => (
        <Button size="small" disabled={String(row.status) !== "SENT"} onClick={() => startReceive(row as unknown as { _id: string; items: { sentQuantity: number }[] })}>Nhận kho</Button>
      ),
    },
  ], [startReceive]);

  function sumQuantities(items: { sentQuantity?: number }[] | undefined) {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + Number(item?.sentQuantity ?? 0), 0);
  }

  function readWarehouseName(value: unknown) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "name" in value) {
      return (value as { name?: string }).name ?? "-";
    }
    return "-";
  }

  return (
    <PageContainer>
      <PageHeader
        title="Chuyển kho"
        subtitle={`${data?.total ?? 0} phiếu`}
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho", href: "/warehouses" }, { label: "Chuyển kho" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo phiếu chuyển</Button>}
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

      <Modal title="Tạo phiếu chuyển kho" open={open} onCancel={() => { setOpen(false); form.resetFields(); setItems([]); }} onOk={submit} confirmLoading={createTransfer.isPending} width={760} okText="Tạo phiếu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item label="Kho nguồn" name="sourceWarehouseId" rules={[{ required: true, message: "Chọn kho nguồn" }]} style={{ width: "50%" }}>
              <Select placeholder="Kho nguồn" options={(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))} />
            </Form.Item>
            <Form.Item label="Kho đích" name="destinationWarehouseId" rules={[{ required: true, message: "Chọn kho đích" }]} style={{ width: "50%" }}>
              <Select placeholder="Kho đích" options={(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500} rows={2} /></Form.Item>
          <CardSection title="Danh sách mặt hàng">
            <Button onClick={() => setItems((current) => [...current, { itemType: "PRODUCT", quantity: 1 }])} icon={<PlusOutlined />} type="dashed" block>
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
                    <Select style={{ width: 240 }} placeholder="Sản phẩm" value={row.productId} options={products.map((product) => ({ value: product._id, label: `${product.code} • ${product.name}` }))} onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, productId: value } : item))} />
                  ) : (
                    <Select style={{ width: 240 }} placeholder="Quà tặng" value={row.giftId} options={gifts.map((gift: { _id: string; name: string }) => ({ value: gift._id, label: gift.name }))} onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, giftId: value } : item))} />
                  )}
                  <InputNumber style={{ width: 160 }} placeholder="Số lượng" min={1} value={row.quantity} onChange={(value) => setItems((current) => current.map((item, idx) => idx === index ? { ...item, quantity: value ?? 0 } : item))} />
                  <Button danger icon={<MinusCircleOutlined />} onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))} />
                </Space.Compact>
              ))}
            </Space>
          </CardSection>
        </Form>
      </Modal>

      <Modal title="Nhận chuyển kho" open={receiveOpen} onCancel={() => setReceiveOpen(false)} onOk={submitReceive} confirmLoading={receiveTransfer.isPending} okText="Xác nhận nhận" cancelText="Hủy">
        <Table
          rowKey={(_, index) => String(index)}
          dataSource={active?.items.map((item, idx) => ({ ...item, idx })) ?? []}
          pagination={false}
          columns={[
            { title: "Mặt hàng", render: (_: unknown, row: Record<string, unknown>) => String(row.productName ?? row.giftName ?? "-") },
            { title: "SL gửi", dataIndex: "sentQuantity", width: 120, align: "right" as const },
            {
              title: "SL nhận", width: 160, render: (_: unknown, row: Record<string, unknown>) => {
                const idx = Number(row.idx);
                return (
                  <InputNumber min={0} max={receiveQuantities[idx]} value={receiveQuantities[idx]} onChange={(value) => setReceiveQuantities((current) => current.map((qty, i) => i === idx ? (value ?? 0) : qty))} />
                );
              },
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
}
