"use client";

import { useEffect, useMemo, useState } from "react";
import {
Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import CardSection from "@/components/common/cards/CardSection";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import {
  useCreateTransfer,
  useReceiveTransfer,
  useWarehouseTransfers,
  WorkflowItem,
} from "@/hooks/useWarehouseWorkflow";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useGiftList } from "@/hooks/useGifts";
import type { WarehouseTransferStatus } from "@/models/WarehouseTransfer";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "PRODUCT" | "VARIANT" | "GIFT";

type TransferRow = {
  itemType: ItemType;
  productId?: string;
  variantId?: string;
  giftId?: string;
  quantity: number;
};

type InventoryItem = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  itemType: "PRODUCT" | "GIFT";
  availableQuantity: number;
  productName?: string;
  variantSku?: string;
  giftName?: string;
};

type TransferRecord = {
  _id: string;
  transferCode: string;
  sourceWarehouseId: { _id: string; name: string } | string;
  destinationWarehouseId: { _id: string; name: string } | string;
  items: {
    productId?: { _id: string; name: string } | null;
    variantId?: { _id: string; sku: string } | null;
    giftId?: { _id: string; name: string } | null;
    sentQuantity: number;
    receivedQuantity: number;
    difference: number;
  }[];
  status: WarehouseTransferStatus;
  note?: string;
  createdBy?: { fullName?: string } | null;
  createdAt: string;
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "default" },
  SENT: { label: "Đang chuyển", color: "processing" },
  RECEIVED: { label: "Đã nhận", color: "success" },
  COMPLETED: { label: "Hoàn tất", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "red" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "SENT", label: "Đang chuyển" },
  { value: "RECEIVED", label: "Đã nhận" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function readWarehouseName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    return (value as { name?: string }).name ?? "-";
  }
  return "-";
}

function readWarehouseId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return (value as { _id: string })._id;
  }
  return "";
}

function sumQuantities(
  items: { sentQuantity?: number }[] | undefined
): number {
  if (!items) return 0;
  return items.reduce(
    (sum, item) => sum + Number(item?.sentQuantity ?? 0),
    0
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function WarehouseTransfersPage() {
  const lang = useLanguageStore((s) => s.language);
  const { warehouses } = useWarehouses();
  const { data: giftResponse } = useGiftList();
  const message = useMessage();
  const gifts = giftResponse?.items ?? [];

  // Products list
  const [products, setProducts] = useState<
    { _id: string; code: string; name: string }[]
  >([]);

  // Variants map: productId -> variant[]
  const [variantsMap, setVariantsMap] = useState<
    Record<string, { _id: string; sku: string; price: number }[]>
  >({});

  // Source warehouse inventory for availableQuantity
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>();
  const [sourceInventory, setSourceInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Transfer list pagination + filter
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filters = useMemo(
    () => ({ status: statusFilter || undefined, page, limit: pageSize }),
    [statusFilter, page, pageSize]
  );
  const { data, loading, refetch } = useWarehouseTransfers(filters);
  const createTransfer = useCreateTransfer();
  const receiveTransfer = useReceiveTransfer();

  // Create modal
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState<TransferRow[]>([]);

  // Receive modal
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<TransferRecord | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<number[]>([]);
  const [receiveNote, setReceiveNote] = useState("");

  // ─── Load products on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/products?limit=200")
      .then((res) => res.json())
      .then((data) => setProducts(data?.data?.items ?? []))
      .catch(() => undefined);
  }, []);

  // ─── Load source warehouse inventory when sourceWarehouseId changes ────────
  useEffect(() => {
    if (!sourceWarehouseId) {
      setSourceInventory([]);
      return;
    }
    setInventoryLoading(true);
    fetch(`/api/warehouse/inventory?warehouseId=${sourceWarehouseId}&limit=200`)
      .then((res) => res.json())
      .then((data) => {
        const items: InventoryItem[] = (data?.data?.items ?? []).map(
          (inv: Record<string, unknown>) => ({
            productId: (inv.productId as { _id?: string } | null)?._id,
            variantId: (inv.variantId as { _id?: string } | null)?._id,
            giftId: (inv.giftId as { _id?: string } | null)?._id,
            itemType: inv.itemType as "PRODUCT" | "GIFT",
            availableQuantity: inv.availableQuantity as number,
            productName: (inv.productId as { name?: string } | null)?.name,
            variantSku: (inv.variantId as { sku?: string } | null)?.sku,
            giftName: (inv.giftId as { name?: string } | null)?.name,
          })
        );
        setSourceInventory(items);
        setInventoryLoading(false);
      })
      .catch(() => setInventoryLoading(false));
  }, [sourceWarehouseId]);

  // ─── Load variants when a product is selected ──────────────────────────────
  const loadVariants = (productId: string) => {
    if (variantsMap[productId]) return;
    fetch(`/api/products/${productId}/variants`)
      .then((res) => res.json())
      .then((data) => {
        setVariantsMap((prev) => ({
          ...prev,
          [productId]: data?.data?.variants ?? [],
        }));
      })
      .catch(() => undefined);
  };

  // ─── Build availableQuantity map for UI ────────────────────────────────────
  const availableQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of sourceInventory) {
      const key = invItemKey(inv);
      map[key] = inv.availableQuantity;
    }
    return map;
  }, [sourceInventory]);

  // ─── Key builder ──────────────────────────────────────────────────────────
  function invItemKey(inv: InventoryItem | TransferRow): string {
    if (inv.giftId) return `GIFT:${inv.giftId}`;
    if (inv.variantId) return `VARIANT:${inv.variantId}`;
    if (inv.productId) return `PRODUCT:${inv.productId}`;
    return "";
  }

  // ─── Add row ──────────────────────────────────────────────────────────────
  const addRow = () => {
    setItems((current) => [
      ...current,
      { itemType: "PRODUCT", quantity: 1 },
    ]);
  };

  // ─── Submit transfer ────────────────────────────────────────────────────────
  const submitTransfer = async () => {
    const values = await form.validateFields();
    const dest = values.destinationWarehouseId;
    const src = values.sourceWarehouseId;

    if (src === dest) {
      message.error("Kho nguồn và kho đích phải khác nhau");
      return;
    }

    if (!items.length) {
      message.warning("Vui lòng thêm ít nhất 1 mặt hàng");
      return;
    }

    for (const row of items) {
      if (!row.productId && !row.variantId && !row.giftId) {
        message.warning("Vui lòng chọn mặt hàng cho tất cả các dòng");
        return;
      }
      if (!row.quantity || row.quantity <= 0) {
        message.warning("Số lượng phải lớn hơn 0");
        return;
      }
      const key = invItemKey(row as unknown as InventoryItem);
      const available = availableQuantityMap[key] ?? 0;
      if (row.quantity > available) {
        message.error(
          `Số lượng vượt quá tồn kho khả dụng (${available}) của mặt hàng này`
        );
        return;
      }
    }

    try {
      const payloadItems: WorkflowItem[] = items.map((row) => ({
        productId: row.productId,
        variantId: row.variantId,
        giftId: row.giftId,
        quantity: row.quantity,
      }));

      await createTransfer.mutateAsync({
        sourceWarehouseId: src,
        destinationWarehouseId: dest,
        items: payloadItems,
        note: values.note,
        status: "SENT",
      });

      message.success("Tạo phiếu chuyển kho thành công");
      setOpen(false);
      form.resetFields();
      setItems([]);
      setSourceWarehouseId(undefined);
      void refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Tạo phiếu chuyển kho thất bại");
    }
  };

  // ─── Open receive modal ────────────────────────────────────────────────────
  const startReceive = (record: TransferRecord) => {
    setActiveRecord(record);
    setReceiveQuantities(record.items.map((item) => item.sentQuantity));
    setReceiveNote("");
    setReceiveOpen(true);
  };

  // ─── Submit receive ────────────────────────────────────────────────────────
  const submitReceive = async () => {
    if (!activeRecord) return;
    for (let i = 0; i < receiveQuantities.length; i++) {
      if (receiveQuantities[i] < 0) {
        message.error("Số lượng nhận không được âm");
        return;
      }
    }
    try {
      await receiveTransfer.mutateAsync({
        id: activeRecord._id,
        payload: {
          receivedQuantities: receiveQuantities,
          note: receiveNote,
        },
      });
      message.success("Nhận kho thành công");
      setReceiveOpen(false);
      void refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Nhận kho thất bại");
    }
  };

  // ─── Reset create form ─────────────────────────────────────────────────────
  const resetForm = () => {
    form.resetFields();
    setItems([]);
    setSourceWarehouseId(undefined);
    setSourceInventory([]);
  };

  // ─── Source warehouse change ──────────────────────────────────────────────
  const handleSourceWarehouseChange = (value: string) => {
    setSourceWarehouseId(value);
    // Clear selected items that may no longer be available
    setItems([]);
  };

  // ─── Warehouse options ────────────────────────────────────────────────────
  const warehouseOptions = useMemo(
    () =>
      (warehouses ?? []).map((w: { _id: string; name: string }) => ({
        value: w._id,
        label: w.name,
      })),
    [warehouses]
  );

  // ─── Product options (only show those in source warehouse inventory) ─────
  const productOptionsInStock = useMemo(() => {
    const ids = new Set(
      sourceInventory
        .filter((inv) => inv.itemType === "PRODUCT" && !inv.variantId)
        .map((inv) => inv.productId)
        .filter(Boolean)
    );
    return products
      .filter((p) => ids.has(p._id))
      .map((p) => ({ value: p._id, label: `${p.code} • ${p.name}` }));
  }, [products, sourceInventory]);

  // ─── Gift options (only show those in source warehouse inventory) ─────────
  const giftOptionsInStock = useMemo(() => {
    const ids = new Set(
      sourceInventory
        .filter((inv) => inv.itemType === "GIFT")
        .map((inv) => inv.giftId)
        .filter(Boolean)
    );
    return (gifts as { _id: string; name: string }[])
      .filter((g) => ids.has(g._id))
      .map((g) => ({ value: g._id, label: g.name }));
  }, [gifts, sourceInventory]);

  // ─── Item display label ──────────────────────────────────────────────────
  function getItemDisplay(row: TransferRow): string {
    if (row.giftId) {
      const gift = gifts.find((g) => g._id === row.giftId);
      return gift?.name ?? "Quà tặng";
    }
    if (row.variantId) {
      for (const pid of Object.keys(variantsMap)) {
        const v = variantsMap[pid].find((vv) => vv._id === row.variantId);
        if (v) {
          const prod = products.find((p) => p._id === pid);
          return `${prod?.code ?? ""} • ${v.sku}`;
        }
      }
      return row.variantId;
    }
    const prod = products.find((p) => p._id === row.productId);
    return prod ? `${prod.code} • ${prod.name}` : "Sản phẩm";
  }

  // ─── Table columns ────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "code",
        title: "Mã phiếu",
        dataIndex: "transferCode",
        width: 180,
      },
      {
        key: "source",
        title: "Kho nguồn",
        dataIndex: "sourceWarehouseId",
        width: 180,
        render: (value: unknown) => readWarehouseName(value),
      },
      {
        key: "dest",
        title: "Kho đích",
        dataIndex: "destinationWarehouseId",
        width: 180,
        render: (value: unknown) => readWarehouseName(value),
      },
      {
        key: "items",
        title: "Số mặt hàng",
        width: 130,
        render: (_: unknown, row: Record<string, unknown>) =>
          Array.isArray(row.items) ? row.items.length : 0,
      },
      {
        key: "quantity",
        title: "Tổng SL",
        align: "right" as const,
        width: 120,
        render: (_: unknown, row: Record<string, unknown>) =>
          sumQuantities(row.items as { sentQuantity?: number }[] | undefined),
      },
      {
        key: "creator",
        title: "Người tạo",
        dataIndex: "createdBy",
        width: 160,
        render: (value: unknown) =>
          ((value as { fullName?: string } | null)?.fullName ?? "-"),
      },
      {
        key: "status",
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        render: (value: unknown) => (
          <Tag color={STATUS_LABELS[String(value)]?.color}>
            {STATUS_LABELS[String(value)]?.label ?? String(value)}
          </Tag>
        ),
      },
      {
        key: "actions",
        title: "Thao tác",
        width: 140,
        render: (_: unknown, row: Record<string, unknown>) => {
          const status = String(row.status);
          const canReceive =
            status === "SENT" &&
            (row.destinationWarehouseId === row.sourceWarehouseId
              ? false
              : true);
          return (
            <Button
              size="small"
              disabled={!canReceive}
              onClick={() =>
                startReceive(row as unknown as TransferRecord)
              }
            >
              Nhận hàng
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader title={t("Chuyển kho", lang)}
        subtitle={`${data?.total ?? 0} phiếu chuyển`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: "Chuyển kho" },
        ]}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Tạo phiếu chuyển
          </Button>
        }
      />

      <div className="card">
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter(value ?? "");
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
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

      {/* ── Create Transfer Modal ─────────────────────────────────────────── */}
      <Modal
        title="Tạo phiếu chuyển kho"
        open={open}
        onCancel={() => {
          setOpen(false);
          resetForm();
        }}
        onOk={submitTransfer}
        confirmLoading={createTransfer.isPending}
        width={820}
        okText="Tạo phiếu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Kho nguồn"
                name="sourceWarehouseId"
                rules={[{ required: true, message: "Chọn kho nguồn" }]}
              >
                <Select
                  placeholder="Kho nguồn"
                  options={warehouseOptions}
                  value={sourceWarehouseId}
                  onChange={handleSourceWarehouseChange}
                  disabled={inventoryLoading}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Kho đích"
                name="destinationWarehouseId"
                rules={[
                  { required: true, message: "Chọn kho đích" },
                  {
                    validator: (_rule, value) => {
                      if (value && value === sourceWarehouseId) {
                        return Promise.reject(
                          "Kho đích phải khác kho nguồn"
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  placeholder="Kho đích"
                  options={warehouseOptions.filter(
                    (w) => w.value !== sourceWarehouseId
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea maxLength={500} rows={2} placeholder="Ghi chú (tùy chọn)" />
          </Form.Item>

          <CardSection title="Danh sách mặt hàng">
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Chỉ hiển thị mặt hàng có tồn kho tại kho nguồn
              </Text>

              <Button
                onClick={addRow}
                icon={<PlusOutlined />}
                type="dashed"
                block
                disabled={!sourceWarehouseId}
              >
                Thêm dòng
              </Button>

              {inventoryLoading && (
                <div style={{ textAlign: "center", padding: 12 }}>
                  <Spin size="small" />{" "}
                  <Text type="secondary">Đang tải tồn kho...</Text>
                </div>
              )}

              {!sourceWarehouseId && !inventoryLoading && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Vui lòng chọn kho nguồn để hiển thị mặt hàng
                </Text>
              )}

              {items.map((row, index) => {
                const key = invItemKey(row as unknown as InventoryItem);
                const available = availableQuantityMap[key] ?? 0;
                const isVariant = row.itemType === "VARIANT";
                const variants = row.productId
                  ? variantsMap[row.productId] ?? []
                  : [];

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Item type selector */}
                    <Select
                      style={{ width: 110, flexShrink: 0 }}
                      value={row.itemType}
                      options={[
                        { value: "PRODUCT", label: "Sản phẩm" },
                        { value: "VARIANT", label: "Phân loại" },
                        { value: "GIFT", label: "Quà tặng" },
                      ]}
                      onChange={(value) => {
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
                        );
                      }}
                      disabled={!sourceWarehouseId}
                    />

                    {/* Product selector */}
                    {row.itemType === "PRODUCT" && (
                      <Select
                        style={{ width: 220, flex: "1 1 220px" }}
                        placeholder="Sản phẩm"
                        value={row.productId}
                        options={productOptionsInStock}
                        onChange={(value) => {
                          setItems((current) =>
                            current.map((item, idx) =>
                              idx === index
                                ? { ...item, productId: value, variantId: undefined }
                                : item
                            )
                          );
                          loadVariants(value);
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          Boolean(
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          )
                        }
                        disabled={!sourceWarehouseId}
                      />
                    )}

                    {/* Variant selector */}
                    {row.itemType === "VARIANT" && (
                      <>
                        <Select
                          style={{ width: 160, flex: "1 1 160px" }}
                          placeholder="Sản phẩm cha"
                          value={row.productId}
                          options={productOptionsInStock}
                          onChange={(value) => {
                            setItems((current) =>
                              current.map((item, idx) =>
                                idx === index
                                  ? { ...item, productId: value, variantId: undefined }
                                  : item
                              )
                            );
                            loadVariants(value);
                          }}
                          showSearch
                          filterOption={(input, option) =>
                            Boolean(
                              (option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            )
                          }
                          disabled={!sourceWarehouseId}
                        />
                        <Select
                          style={{ width: 140, flex: "1 1 140px" }}
                          placeholder="Phân loại"
                          value={row.variantId}
                          options={variants.map((v) => ({
                            value: v._id,
                            label: v.sku,
                          }))}
                          onChange={(value) => {
                            setItems((current) =>
                              current.map((item, idx) =>
                                idx === index
                                  ? { ...item, variantId: value }
                                  : item
                              )
                            );
                          }}
                          disabled={!row.productId || !variants.length}
                          loading={Boolean(row.productId) && !variants.length}
                        />
                      </>
                    )}

                    {/* Gift selector */}
                    {row.itemType === "GIFT" && (
                      <Select
                        style={{ width: 220, flex: "1 1 220px" }}
                        placeholder="Quà tặng"
                        value={row.giftId}
                        options={giftOptionsInStock}
                        onChange={(value) => {
                          setItems((current) =>
                            current.map((item, idx) =>
                              idx === index
                                ? { ...item, giftId: value }
                                : item
                            )
                          );
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          Boolean(
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          )
                        }
                        disabled={!sourceWarehouseId}
                      />
                    )}

                    {/* Quantity + available */}
                    <Space.Compact style={{ flex: "0 0 auto" }}>
                      <InputNumber
                        style={{ width: 80 }}
                        placeholder="SL"
                        min={1}
                        max={available > 0 ? available : undefined}
                        value={row.quantity}
                        onChange={(value) =>
                          setItems((current) =>
                            current.map((item, idx) =>
                              idx === index
                                ? { ...item, quantity: value ?? 0 }
                                : item
                            )
                          )
                        }
                        status={
                          row.quantity > available && available > 0
                            ? "error"
                            : undefined
                        }
                      />
                      <Input
                        style={{
                          width: 90,
                          background: "#f5f5f5",
                          color:
                            available > 0 ? "#52c41a" : "#ff4d4f",
                          fontWeight: 600,
                          textAlign: "center",
                        }}
                        value={`Còn: ${available}`}
                        readOnly
                        disabled={!sourceWarehouseId}
                      />
                    </Space.Compact>

                    {/* Remove row */}
                    <Button
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, idx) => idx !== index)
                        )
                      }
                      style={{ flexShrink: 0 }}
                    />
                  </div>
                );
              })}
            </Space>
          </CardSection>
        </Form>
      </Modal>

      {/* ── Receive Transfer Modal ───────────────────────────────────────── */}
      <Modal
        title={`Nhận chuyển kho — ${activeRecord?.transferCode ?? ""}`}
        open={receiveOpen}
        onCancel={() => setReceiveOpen(false)}
        onOk={submitReceive}
        confirmLoading={receiveTransfer.isPending}
        width={640}
        okText="Xác nhận nhận"
        cancelText="Hủy"
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <Text>
            <strong>Kho đích:</strong>{" "}
            {activeRecord
              ? readWarehouseName(activeRecord.destinationWarehouseId)
              : "-"}
          </Text>

          <Table
            rowKey={(_, i) => String(i)}
            dataSource={
              activeRecord?.items.map((item, idx) => ({
                ...item,
                idx,
              })) ?? []
            }
            pagination={false}
            size="small"
            columns={[
              {
                title: "Mặt hàng",
                render: (_: unknown, row: Record<string, unknown>) => {
                  const variant = row.variantId as {
                    sku?: string;
                  } | null;
                  const product = row.productId as {
                    name?: string;
                    code?: string;
                  } | null;
                  const gift = row.giftId as { name?: string } | null;
                  if (gift) return gift.name ?? "Quà tặng";
                  return `${product?.name ?? product?.code ?? "Sản phẩm"} ${
                    variant?.sku ? `• ${variant.sku}` : ""
                  }`;
                },
              },
              {
                title: "SL gửi",
                dataIndex: "sentQuantity",
                width: 100,
                align: "right" as const,
              },
              {
                title: "SL nhận",
                width: 150,
                render: (_: unknown, row: Record<string, unknown>) => {
                  const idx = Number(row.idx);
                  return (
                    <InputNumber
                      min={0}
                      max={
                        typeof row.sentQuantity === "number"
                          ? row.sentQuantity
                          : undefined
                      }
                      value={receiveQuantities[idx]}
                      onChange={(value) =>
                        setReceiveQuantities((current) =>
                          current.map((qty, i) =>
                            i === idx ? value ?? 0 : qty
                          )
                        )
                      }
                      style={{ width: "100%" }}
                    />
                  );
                },
              },
            ]}
          />

          <div>
            <Text strong>Ghi chú nhận kho:</Text>
            <Input.TextArea
              rows={2}
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="Ghi chú (tùy chọn)"
              style={{ marginTop: 6 }}
              maxLength={500}
            />
          </div>
        </Space>
      </Modal>
    </PageContainer>
  );
}
