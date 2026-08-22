"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table } from "antd";
import { PlusOutlined, MinusCircleOutlined, SearchOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import { useProducts } from "@/hooks/useProducts";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateReceipt, useWarehouseReceipts } from "@/hooks/useWarehouseWorkflow";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


type ItemRow = { itemType: "PRODUCT" | "GIFT"; productId?: string; variantId?: string; giftId?: string; orderedQuantity: number; receivedQuantity: number };

export default function WarehouseReceiptsPage() {
  const lang = useLanguageStore((s) => s.language);
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const message = useMessage();
  const gifts = giftResponse?.items ?? [];
  const { products: productsList = [] } = useProducts();
  const productsFromApi = productsList ?? [];
  const { data: employees = [] } = useEmployees({ pageSize: 200 });
  const [products, setProducts] = useState<{ _id: string; code: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [createdBy, setCreatedBy] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data, loading } = useWarehouseReceipts({ warehouseId, search: searchTerm, productId, createdBy, page, limit: pageSize });
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

  const triggerSearch = () => {
    const trimmed = searchInput.trim();
    setSearchTerm(trimmed);
    setPage(1);
  };
  const resetFilters = () => {
    setWarehouseId(undefined);
    setProductId(undefined);
    setCreatedBy(undefined);
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

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
  const productFilterOptions = useMemo(
    () => [
      { value: "", label: "Tất cả sản phẩm" },
      ...(productsFromApi ?? []).map((p: { _id: string; code: string; name: string }) => ({ value: p._id, label: `${p.code} • ${p.name}` })),
    ],
    [productsFromApi]
  );
  const creatorFilterOptions = useMemo(
    () => [
      { value: "", label: "Tất cả người tạo" },
      ...(employees ?? []).map((e: { _id: string; employeeCode: string; fullName: string }) => ({ value: e._id, label: `${e.employeeCode} • ${e.fullName}` })),
    ],
    [employees]
  );
  const hasActiveFilters = Boolean(warehouseId || productId || createdBy || searchTerm);

  return (
    <PageContainer>
      <PageHeader title={t("Nhập kho", lang)}
        subtitle={`${data?.total ?? 0} phiếu`}
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho", href: "/warehouses" }, { label: "Nhập kho" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo phiếu nhập</Button>}
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
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input
            placeholder="Tìm theo mã phiếu hoặc sản phẩm"
            allowClear
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={triggerSearch}
            style={{ width: 360 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={triggerSearch}>
            Tìm kiếm
          </Button>
          {searchTerm ? (
            <Button onClick={() => { setSearchInput(""); setSearchTerm(""); setPage(1); }}>Xóa tìm kiếm</Button>
          ) : null}
        </div>
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Select
            allowClear
            placeholder="Lọc theo kho"
            style={{ width: 220 }}
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
            placeholder="Lọc theo sản phẩm"
            style={{ width: 240 }}
            value={productId}
            onChange={(value) => {
              setProductId(value);
              setPage(1);
            }}
            options={productFilterOptions}
            showSearch
            optionFilterProp="label"
          />
          <Select
            allowClear
            placeholder="Lọc theo người tạo"
            style={{ width: 240 }}
            value={createdBy}
            onChange={(value) => {
              setCreatedBy(value);
              setPage(1);
            }}
            options={creatorFilterOptions}
            showSearch
            optionFilterProp="label"
          />
          {hasActiveFilters ? (
            <Button onClick={resetFilters}>Xóa bộ lọc</Button>
          ) : null}
        </Space>
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
            <div className="receipt-item-headers" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              <div style={{ width: 120 }}>Loại</div>
              <div style={{ width: 220 }}>Sản phẩm / Quà tặng</div>
              <div style={{ width: 120 }}>SL đặt</div>
              <div style={{ width: 130 }}>SL thực nhận</div>
              <div style={{ width: 32 }} aria-hidden="true"></div>
            </div>
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
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
