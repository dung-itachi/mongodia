"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Spin, Typography } from "antd";
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

const { Text } = Typography;

type ItemType = "PRODUCT" | "VARIANT" | "GIFT";

type ItemRow = {
  itemType: ItemType;
  productId?: string;
  variantId?: string;
  giftId?: string;
  orderedQuantity: number;
  receivedQuantity: number;
};

type VariantLite = { _id: string; sku: string; price?: number };

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

  // Cache variants per product
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantLite[]>>({});
  const [variantsLoadingMap, setVariantsLoadingMap] = useState<Record<string, boolean>>({});

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

  /**
   * Load variants for a product. Used to:
   *  1) Decide whether a "PRODUCT" row should be coerced into VARIANT.
   *  2) Populate the variant picker.
   */
  const loadVariants = async (productId: string): Promise<VariantLite[]> => {
    if (variantsMap[productId]) return variantsMap[productId];
    setVariantsLoadingMap((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/products/${productId}/variants`);
      const data = await res.json();
      const list: VariantLite[] = data?.data?.variants ?? [];
      setVariantsMap((prev) => ({ ...prev, [productId]: list }));
      return list;
    } catch {
      return [];
    } finally {
      setVariantsLoadingMap((prev) => ({ ...prev, [productId]: false }));
    }
  };

  /**
   * Handle picking a product in a PRODUCT row.
   * If the product has variants, auto-coerce the row into VARIANT mode so
   * the user is forced to pick a SKU before saving.
   */
  const handleProductSelect = async (index: number, productId: string) => {
    setItems((current) =>
      current.map((item, idx) =>
        idx === index
          ? { ...item, productId, variantId: undefined }
          : item
      )
    );
    const variants = await loadVariants(productId);
    if (variants.length > 0) {
      setItems((current) =>
        current.map((item, idx) =>
          idx === index ? { ...item, itemType: "VARIANT" } : item
        )
      );
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (!items.length) { message.warning(t("Vui lòng thêm ít nhất 1 mặt hàng", lang)); return; }
    for (const row of items) {
      if (row.itemType === "PRODUCT" && !row.productId) {
        message.warning(t("Vui lòng chọn sản phẩm", lang));
        return;
      }
      if (row.itemType === "VARIANT") {
        if (!row.productId || !row.variantId) {
          message.warning(t("Vui lòng chọn sản phẩm và phân loại", lang));
          return;
        }
      }
      if (row.itemType === "GIFT" && !row.giftId) {
        message.warning(t("Vui lòng chọn quà tặng", lang));
        return;
      }
      if (row.receivedQuantity < 0 || row.orderedQuantity < 0) {
        message.warning(t("Số lượng không được âm", lang));
        return;
      }
    }
    try {
      await createReceipt.mutateAsync({ warehouseId: values.warehouseId, items, note: values.note });
      message.success(t("Tạo phiếu nhập kho thành công", lang));
      setOpen(false);
      reset();
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("Tạo phiếu nhập thất bại", lang));
    }
  };

  const columns = useMemo(() => [
    { key: "code", title: t("Mã phiếu", lang), dataIndex: "receiptCode", width: 160 },
    { key: "warehouse", title: t("Kho", lang), dataIndex: "warehouseId", width: 160, render: (value: unknown) => readWarehouseName(value) },
    {
      key: "items",
      title: t("Sản phẩm", lang),
      width: 260,
      render: (_: unknown, row: Record<string, unknown>) => {
        const items = (row.items as ReceiptItemRender[] | undefined) ?? [];
        return items.map((it, i) => {
          const variant = it.variantId as { sku?: string } | string | null;
          const product = it.productId as { code?: string; name?: string } | string | null;
          const gift = it.giftId as { name?: string } | string | null;
          let label = "";
          if (gift) {
            const gname = typeof gift === "string" ? null : gift?.name;
            label = `🎁 ${gname ?? t("Quà tặng", lang)}`;
          } else if (variant && typeof variant !== "string") {
            const pname = typeof product === "string" ? null : product?.name;
            const pcode = typeof product === "string" ? null : product?.code;
            label = `${pcode ?? pname ?? t("Sản phẩm", lang)} • ${variant.sku ?? ""}`;
          } else if (product) {
            const pname = typeof product === "string" ? null : product?.name;
            const pcode = typeof product === "string" ? null : product?.code;
            label = `${pcode ?? ""} • ${pname ?? ""}`;
          } else {
            label = t("Mặt hàng", lang);
          }
          const qty = it.receivedQuantity ?? it.orderedQuantity ?? 0;
          return (
            <div key={i} style={{ fontSize: 12 }}>
              {label} <Text type="secondary">× {qty}</Text>
            </div>
          );
        });
      },
    },
    { key: "ordered", title: t("SL đặt", lang), width: 120, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { orderedQuantity?: number }[] | undefined, "orderedQuantity") },
    { key: "received", title: t("SL thực nhận", lang), width: 130, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { receivedQuantity?: number }[] | undefined, "receivedQuantity") },
    { key: "diff", title: t("Chênh lệch", lang), width: 130, align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => sumQuantity(row.items as { difference?: number }[] | undefined, "difference") },
    { key: "creator", title: t("Người tạo", lang), dataIndex: "createdBy", width: 160, render: (value: unknown) => ((value as { fullName?: string } | null)?.fullName ?? "-") },
    { key: "createdAt", title: t("Ngày tạo", lang), dataIndex: "createdAt", width: 160, render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN") },
  ], [lang]);

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
      { value: "", label: t("Tất cả sản phẩm", lang) },
      ...(productsFromApi ?? []).map((p: { _id: string; code: string; name: string }) => ({ value: p._id, label: `${p.code} • ${p.name}` })),
    ],
    [productsFromApi, lang]
  );
  const creatorFilterOptions = useMemo(
    () => [
      { value: "", label: t("Tất cả người tạo", lang) },
      ...(employees ?? []).map((e: { _id: string; employeeCode: string; fullName: string }) => ({ value: e._id, label: `${e.employeeCode} • ${e.fullName}` })),
    ],
    [employees, lang]
  );
  const hasActiveFilters = Boolean(warehouseId || productId || createdBy || searchTerm);

  return (
    <PageContainer>
      <PageHeader title={t("Nhập kho", lang)}
        subtitle={`${data?.total ?? 0} ${t("phiếu", lang)}`}
        breadcrumb={[{ label: t("Trang chủ", lang), href: "/" }, { label: t("Kho", lang), href: "/warehouses" }, { label: t("Nhập kho", lang) }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t("Tạo phiếu nhập", lang)}</Button>}
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
            placeholder={t("Tìm theo mã phiếu hoặc sản phẩm", lang)}
            allowClear
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={triggerSearch}
            style={{ width: 360 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={triggerSearch}>
            {t("Tìm kiếm", lang)}
          </Button>
          {searchTerm ? (
            <Button onClick={() => { setSearchInput(""); setSearchTerm(""); setPage(1); }}>{t("Xóa tìm kiếm", lang)}</Button>
          ) : null}
        </div>
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Select
            allowClear
            placeholder={t("Lọc theo kho", lang)}
            style={{ width: 220 }}
            value={warehouseId}
            onChange={(value) => {
              setWarehouseId(value);
              setPage(1);
            }}
            options={[
              { value: "", label: t("Tất cả kho", lang) },
              ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({
                value: w._id,
                label: w.name,
              })),
            ]}
          />
          <Select
            allowClear
            placeholder={t("Lọc theo sản phẩm", lang)}
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
            placeholder={t("Lọc theo người tạo", lang)}
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
            <Button onClick={resetFilters}>{t("Xóa bộ lọc", lang)}</Button>
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

      <Modal title={t("Tạo phiếu nhập kho", lang)} open={open} onCancel={() => { setOpen(false); reset(); }} onOk={submit} confirmLoading={createReceipt.isPending} width={860} okText={t("Lưu phiếu", lang)} cancelText={t("Hủy", lang)} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item label={t("Kho nhập", lang)} name="warehouseId" rules={[{ required: true, message: t("Vui lòng chọn kho", lang) }]}>
            <Select options={(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))} placeholder={t("Chọn kho", lang)} />
          </Form.Item>
          <Form.Item label={t("Ghi chú", lang)} name="note"><Input.TextArea maxLength={500} rows={2} /></Form.Item>
          <CardSection title={t("Danh sách mặt hàng", lang)}>
            <Button
              onClick={() => setItems((current) => [...current, { itemType: "PRODUCT", orderedQuantity: 1, receivedQuantity: 1 }])}
              icon={<PlusOutlined />}
              type="dashed"
              block
            >
              {t("Thêm dòng", lang)}
            </Button>
            <div className="receipt-item-headers" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              <div style={{ width: 110 }}>{t("Loại", lang)}</div>
              <div style={{ width: 200 }}>{t("Sản phẩm", lang)}</div>
              <div style={{ width: 160 }}>{t("Phân loại", lang)}</div>
              <div style={{ width: 100 }}>{t("SL đặt", lang)}</div>
              <div style={{ width: 120 }}>{t("SL thực nhận", lang)}</div>
              <div style={{ width: 32 }} aria-hidden="true"></div>
            </div>
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              {items.map((row, index) => {
                const variants = row.productId ? variantsMap[row.productId] ?? [] : [];
                const variantsLoading = row.productId ? variantsLoadingMap[row.productId] : false;
                return (
                  <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Select
                      style={{ width: 110 }}
                      value={row.itemType}
                      options={[
                        { value: "PRODUCT", label: t("Sản phẩm", lang) },
                        { value: "VARIANT", label: t("Phân loại", lang) },
                        { value: "GIFT", label: t("Quà tặng", lang) },
                      ]}
                      onChange={(value: ItemType) =>
                        setItems((current) =>
                          current.map((item, idx) =>
                            idx === index
                              ? {
                                  ...item,
                                  itemType: value,
                                  productId: undefined,
                                  variantId: undefined,
                                  giftId: undefined,
                                }
                              : item
                          )
                        )
                      }
                    />

                    {/* PRODUCT / VARIANT: shared product picker */}
                    {row.itemType !== "GIFT" && (
                      <Select
                        style={{ width: 200 }}
                        placeholder={t("Sản phẩm", lang)}
                        value={row.productId}
                        options={productOptions}
                        onChange={(value) => handleProductSelect(index, value)}
                        showSearch
                        filterOption={(input, option) =>
                          Boolean(
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          )
                        }
                      />
                    )}

                    {/* VARIANT: variant picker */}
                    {row.itemType === "VARIANT" && (
                      <Select
                        style={{ width: 160 }}
                        placeholder={t("Phân loại", lang)}
                        value={row.variantId}
                        options={variants.map((v) => ({ value: v._id, label: v.sku }))}
                        onChange={(value) =>
                          setItems((current) =>
                            current.map((item, idx) =>
                              idx === index ? { ...item, variantId: value } : item
                            )
                          )
                        }
                        disabled={!row.productId || !variants.length}
                        loading={Boolean(row.productId) && !variants.length && variantsLoading}
                        notFoundContent={
                          row.productId && !variantsLoading && !variants.length ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {t("Sản phẩm này chưa có phân loại", lang)}
                            </Text>
                          ) : null
                        }
                      />
                    )}

                    {/* PRODUCT: empty cell to align header (only shows loading) */}
                    {row.itemType === "PRODUCT" && (
                      <div style={{ width: 160, display: "flex", alignItems: "center", justifyContent: "flex-start", fontSize: 12 }}>
                        {variantsLoading ? <Spin size="small" /> : null}
                        {row.productId && !variantsLoading && variants.length > 0 ? (
                          <Text type="warning" style={{ fontSize: 12 }}>
                            {t("Chọn lại để nhập theo phân loại", lang)}
                          </Text>
                        ) : null}
                      </div>
                    )}

                    {/* GIFT: gift picker spans product/variant columns */}
                    {row.itemType === "GIFT" && (
                      <Select
                        style={{ width: 360 }}
                        placeholder={t("Quà tặng", lang)}
                        value={row.giftId}
                        options={giftOptions}
                        onChange={(value) =>
                          setItems((current) =>
                            current.map((item, idx) =>
                              idx === index ? { ...item, giftId: value } : item
                            )
                          )
                        }
                        showSearch
                        filterOption={(input, option) =>
                          Boolean(
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          )
                        }
                      />
                    )}

                    <InputNumber
                      style={{ width: 100 }}
                      placeholder={t("SL đặt", lang)}
                      min={0}
                      value={row.orderedQuantity}
                      onChange={(value) =>
                        setItems((current) =>
                          current.map((item, idx) =>
                            idx === index ? { ...item, orderedQuantity: value ?? 0 } : item
                          )
                        )
                      }
                    />
                    <InputNumber
                      style={{ width: 120 }}
                      placeholder={t("SL thực nhận", lang)}
                      min={0}
                      value={row.receivedQuantity}
                      onChange={(value) =>
                        setItems((current) =>
                          current.map((item, idx) =>
                            idx === index ? { ...item, receivedQuantity: value ?? 0 } : item
                          )
                        )
                      }
                    />
                    <Button
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))}
                    />
                  </div>
                );
              })}
            </Space>
          </CardSection>
        </Form>
      </Modal>
    </PageContainer>
  );
}

// Local type for the receipts list renderer (kept loose to match API shape)
type ReceiptItemRender = {
  productId?: { code?: string; name?: string } | string | null;
  variantId?: { sku?: string } | string | null;
  giftId?: { name?: string } | string | null;
  orderedQuantity?: number;
  receivedQuantity?: number;
  difference?: number;
};