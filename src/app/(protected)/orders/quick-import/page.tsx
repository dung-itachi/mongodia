"use client";

/**
 * ==================================================
 * QUICK ORDER IMPORT PAGE
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import
 *
 * UI for importing orders by pasting data from Excel / Google Sheets / Facebook.
 *
 * Flow:
 *   1. User pastes data into textarea
 *   2. Click "Phân tích dữ liệu"
 *   3. Preview table shows parsed rows
 *   4. User can edit rows
 *   5. Click "Tạo đơn" to create orders
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Select,
  InputNumber,
  Spin,
  Typography,
  Divider,
  Alert,
  Badge,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import { useMessage } from "@/contexts/MessageContext";

import type {
  EditableQuickOrderRow,
  QuickOrderComboCandidate,
  QuickOrderProductRef,
} from "@/types/quickOrder";

// ==================================================
// Types
// ==================================================

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

interface ComboOption {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
  giftQuantity: number;
}

interface ParseResponse {
  success: boolean;
  data: {
    rows: EditableQuickOrderRow[];
    totalRows: number;
    validCount: number;
    invalidCount: number;
    warningCount: number;
    exchangeRate: number;
    exchangeRateDate: string;
  };
}

interface ImportResponse {
  success: boolean;
  data: {
    createdOrders: number;
    createdCustomers: number;
    skippedRows: number;
    errors: Array<{ rowNumber: number; message: string }>;
    elapsedTime: number;
  };
}

// ==================================================
// Constants
// ==================================================

const { TextArea } = Input;
const { Text } = Typography;

const EXAMPLE_TEXT = `Гантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYELASH
Онолбаатар\t88249975\tӨмнөговь Ханбогд сум\t1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт
Сараа\t89066743\tУлаанбаатар\t✅120,000₮-өөр 6 нь 12 нь үнэгүй\tLASH`;

const CURRENCY_FORMAT = new Intl.NumberFormat("mn-MN", {
  style: "currency",
  currency: "MNT",
  maximumFractionDigits: 0,
});

// ==================================================
// Component
// ==================================================

export default function QuickOrderImportPage() {
  const router = useRouter();
  const message = useMessage();

  // State
  const [pastedText, setPastedText] = useState("");
  const [rows, setRows] = useState<EditableQuickOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(7);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [combosByProduct, setCombosByProduct] = useState<Map<string, ComboOption[]>>(
    new Map()
  );

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter((r) => r.status === "VALID").length;
    const invalid = rows.filter((r) => r.status === "INVALID").length;
    const warnings = rows.reduce(
      (sum, r) => sum + r.errors.filter((e) => e.severity === "WARNING").length,
      0
    );
    const totalPrice = rows.reduce(
      (sum, r) => sum + (r.editablePrice || 0) * (r.editableQuantity || 1),
      0
    );
    const newCustomers = rows.filter((r) => r.isNewCustomer).length;
    const existingCustomers = rows.filter((r) => !r.isNewCustomer).length;

    return { total, valid, invalid, warnings, totalPrice, newCustomers, existingCustomers };
  }, [rows]);

  // Load products and combos for selectors
  const loadReferenceData = useCallback(async () => {
    try {
      const response = await fetch("/api/quick-order-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", text: "__LOAD_REF__" }),
      });

      if (response.ok) {
        // Products and combos will be loaded as part of context
        // We need to fetch them separately for the selectors
      }
    } catch (error) {
      console.error("Failed to load reference data:", error);
    }
  }, []);

  // Parse pasted text
  const handleParse = useCallback(async () => {
    if (!pastedText.trim()) {
      message.warning("Vui lòng paste dữ liệu trước");
      return;
    }

    setLoading(true);
    setParsed(false);

    try {
      const response = await fetch("/api/quick-order-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", text: pastedText }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse data");
      }

      const result: ParseResponse = await response.json();

      console.log("[QUICK IMPORT PAGE] API Response:", JSON.stringify({
        success: result.success,
        totalRows: result.data?.totalRows,
        rows: result.data?.rows?.map((r: EditableQuickOrderRow) => ({
          rowNumber: r.rowNumber,
          customerName: r.customerName,
          phone: r.phone,
          editablePhone: r.editablePhone,
          address: r.address,
          productText: r.productText,
          productId: r.productId,
          priceText: r.priceText,
          editablePrice: r.editablePrice,
        })),
      }, null, 2));

      if (result.success) {
        setRows(result.data.rows);
        setExchangeRate(result.data.exchangeRate);
        setParsed(true);

        // Build products and combos maps for selectors
        const productMap = new Map<string, ProductOption>();
        const comboMap = new Map<string, ComboOption[]>();

        for (const row of result.data.rows) {
          // Collect products
          if (row.productId && row.productName) {
            if (!productMap.has(row.productId)) {
              productMap.set(row.productId, {
                id: row.productId,
                code: row.productCode || "",
                name: row.productName,
              });
            }
          }

          // Collect combos
          if (row.comboCandidates) {
            const combos = row.comboCandidates.map((c: QuickOrderComboCandidate) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              sellingPrice: c.sellingPrice,
              giftQuantity: c.giftQuantity,
            }));

            if (row.productId) {
              const existing = comboMap.get(row.productId) || [];
              for (const combo of combos) {
                if (!existing.find((c) => c.id === combo.id)) {
                  existing.push(combo);
                }
              }
              comboMap.set(row.productId, existing);
            }
          }
        }

        setProducts(Array.from(productMap.values()));
        setCombosByProduct(comboMap);

        message.success(`Đã phân tích ${result.data.totalRows} dòng`);
      }
    } catch (error) {
      console.error("Parse error:", error);
      message.error(error instanceof Error ? error.message : "Lỗi khi phân tích dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [pastedText]);

  // Update a single row field
  const updateRow = useCallback(
    (rowIndex: number, field: keyof EditableQuickOrderRow, value: unknown) => {
      setRows((prev) =>
        prev.map((row, idx) => {
          if (idx !== rowIndex) return row;

          const updated = { ...row, [field]: value } as EditableQuickOrderRow;

          // If product changed, reset combo selection
          if (field === "editableProductId") {
            updated.editableComboId = undefined;
            // Reset combo candidates
            updated.comboCandidates = [];
          }

          return updated;
        })
      );
    },
    []
  );

  // Delete a row
  const handleDeleteRow = useCallback((rowIndex: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  }, []);

  // Clear all rows
  const handleClear = useCallback(() => {
    setRows([]);
    setPastedText("");
    setParsed(false);
  }, []);

  // Import orders
  const handleImport = useCallback(async () => {
    if (rows.length === 0) {
      message.warning("Không có dữ liệu để import");
      return;
    }

    const invalidRows = rows.filter((r) => r.status === "INVALID");
    if (invalidRows.length > 0) {
      message.error(`Còn ${invalidRows.length} dòng lỗi. Vui lòng sửa trước khi import.`);
      return;
    }

    setImporting(true);

    try {
      const response = await fetch("/api/quick-order-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", rows }),
      });

      if (!response.ok) {
        throw new Error("Failed to import orders");
      }

      const result: ImportResponse = await response.json();

      if (result.success) {
        message.success(
          `Đã tạo ${result.data.createdOrders} đơn hàng (${result.data.createdCustomers} khách mới)`
        );

        // Navigate to orders list
        router.push("/orders");
      }
    } catch (error) {
      console.error("Import error:", error);
      message.error(error instanceof Error ? error.message : "Lỗi khi tạo đơn hàng");
    } finally {
      setImporting(false);
    }
  }, [rows, router]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "rowNumber",
        title: "#",
        width: 50,
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
      {
        key: "customerName",
        title: "Khách hàng",
        width: 150,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <Input
            value={record.editableCustomerName}
            onChange={(e) => updateRow(index, "editableCustomerName", e.target.value)}
            placeholder="Tên khách hàng"
            status={record.errors.find((e) => e.field === "customerName") ? "error" : undefined}
          />
        ),
      },
      {
        key: "phone",
        title: "SĐT",
        width: 120,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <Input
            value={record.editablePhone}
            onChange={(e) => updateRow(index, "editablePhone", e.target.value)}
            placeholder="Số điện thoại"
            status={record.errors.find((e) => e.field === "phone") ? "error" : undefined}
          />
        ),
      },
      {
        key: "address",
        title: "Địa chỉ",
        width: 180,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <Input
            value={record.editableAddress}
            onChange={(e) => updateRow(index, "editableAddress", e.target.value)}
            placeholder="Địa chỉ"
          />
        ),
      },
      {
        key: "product",
        title: "Sản phẩm",
        width: 150,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <Select
            value={record.editableProductId}
            onChange={(value) => updateRow(index, "editableProductId", value)}
            placeholder="Chọn sản phẩm"
            allowClear
            style={{ width: "100%" }}
            status={record.errors.find((e) => e.field === "product") ? "error" : undefined}
            options={products.map((p) => ({
              value: p.id,
              label: `${p.code} - ${p.name}`,
            }))}
          />
        ),
      },
      {
        key: "combo",
        title: "Combo",
        width: 180,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => {
          const availableCombos = record.editableProductId
            ? combosByProduct.get(record.editableProductId) || []
            : record.comboCandidates?.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                sellingPrice: c.sellingPrice,
                giftQuantity: c.giftQuantity,
              })) || [];

          return (
            <Select
              value={record.editableComboId}
              onChange={(value) => updateRow(index, "editableComboId", value)}
              placeholder="Chọn combo"
              allowClear
              style={{ width: "100%" }}
              status={record.errors.find((e) => e.field === "combo") ? "error" : undefined}
              options={availableCombos.map((c) => ({
                value: c.id,
                label: `${c.name} - ${CURRENCY_FORMAT.format(c.sellingPrice)}`,
              }))}
            />
          );
        },
      },
      {
        key: "quantity",
        title: "SL",
        width: 80,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <InputNumber
            value={record.editableQuantity}
            onChange={(value) => updateRow(index, "editableQuantity", value || 1)}
            min={1}
            max={99}
            style={{ width: "100%" }}
          />
        ),
      },
      {
        key: "price",
        title: "Giá",
        width: 130,
        render: (_: unknown, record: EditableQuickOrderRow, index: number) => (
          <InputNumber
            value={record.editablePrice}
            onChange={(value) => updateRow(index, "editablePrice", value || 0)}
            min={0}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => Number(value?.replace(/,/g, "") || 0)}
            style={{ width: "100%" }}
            status={record.errors.find((e) => e.field === "price") ? "error" : undefined}
          />
        ),
      },
      {
        key: "total",
        title: "Tổng",
        width: 130,
        render: (_: unknown, record: EditableQuickOrderRow) =>
          CURRENCY_FORMAT.format(
            (record.editablePrice || 0) * (record.editableQuantity || 1)
          ),
      },
      {
        key: "status",
        title: "Trạng thái",
        width: 120,
        render: (_: unknown, record: EditableQuickOrderRow) => {
          if (record.status === "VALID") {
            return (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {record.isNewCustomer ? "Khách mới" : "Hợp lệ"}
              </Tag>
            );
          }

          const errorIssues = record.errors.filter((e) => e.severity === "ERROR");
          const warningIssues = record.errors.filter((e) => e.severity === "WARNING");

          if (errorIssues.length > 0) {
            return (
              <Tooltip
                title={
                  <div>
                    {errorIssues.map((e, i) => (
                      <div key={i}>{e.message}</div>
                    ))}
                  </div>
                }
              >
                <Tag color="error" icon={<CloseCircleOutlined />}>
                  Lỗi
                </Tag>
              </Tooltip>
            );
          }

          if (warningIssues.length > 0) {
            return (
              <Tooltip
                title={
                  <div>
                    {warningIssues.map((e, i) => (
                      <div key={i}>{e.message}</div>
                    ))}
                  </div>
                }
              >
                <Tag color="warning" icon={<WarningOutlined />}>
                  Cảnh báo
                </Tag>
              </Tooltip>
            );
          }

          return null;
        },
      },
      {
        key: "actions",
        title: "",
        width: 60,
        render: (_: unknown, __: EditableQuickOrderRow, index: number) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRow(index)}
          />
        ),
      },
    ],
    [products, combosByProduct, updateRow, handleDeleteRow]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Nhập đơn nhanh"
        subtitle="Dán dữ liệu từ Excel / Google Sheets / Facebook"
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Đơn hàng", href: "/orders" },
          { label: "Nhập nhanh" },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Input Section */}
        <Card title="Dữ liệu nguồn" size="small">
          <TextArea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Paste dữ liệu vào đây...\n\nVí dụ:\n${EXAMPLE_TEXT}`}
            rows={8}
            style={{ fontFamily: "monospace" }}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleParse}
              loading={loading}
              disabled={!pastedText.trim()}
            >
              Phân tích dữ liệu
            </Button>

            {parsed && (
              <Button icon={<ReloadOutlined />} onClick={handleParse} loading={loading}>
                Phân tích lại
              </Button>
            )}

            <Button icon={<DeleteOutlined />} onClick={handleClear}>
              Xóa
            </Button>
          </div>

          {parsed && (
            <Alert
              type="info"
              showIcon
              icon={<UploadOutlined />}
              message={
                <span>
                  Tỷ giá MNT → VND: <strong>{exchangeRate}</strong>
                </span>
              }
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* Preview Section */}
        {parsed && (
          <>
            {/* Stats */}
            <Card size="small">
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <Text type="secondary">Đã phân tích:</Text>
                  <Badge
                    count={stats.total}
                    showZero
                    color="blue"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text type="secondary">Hợp lệ:</Text>
                  <Badge
                    count={stats.valid}
                    showZero
                    color="green"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text type="secondary">Cần kiểm tra:</Text>
                  <Badge
                    count={stats.warnings}
                    showZero
                    color="orange"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text type="secondary">Lỗi:</Text>
                  <Badge
                    count={stats.invalid}
                    showZero
                    color="red"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <Divider type="vertical" />
                <div>
                  <Text type="secondary">Khách mới:</Text>
                  <Badge
                    count={stats.newCustomers}
                    showZero
                    color="purple"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text type="secondary">Khách cũ:</Text>
                  <Badge
                    count={stats.existingCustomers}
                    showZero
                    color="cyan"
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <Divider type="vertical" />
                <div>
                  <Text type="secondary">Tổng tiền:</Text>
                  <Text strong style={{ marginLeft: 8 }}>
                    {CURRENCY_FORMAT.format(stats.totalPrice)}
                  </Text>
                </div>
              </div>
            </Card>

            {/* Table */}
            <Card
              title="Preview"
              size="small"
              extra={
                <Space>
                  <Text type="secondary">
                    {rows.length} dòng
                  </Text>
                </Space>
              }
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                  <Spin tip="Đang phân tích..." />
                </div>
              ) : (
                <Table
                  columns={columns}
                  dataSource={rows}
                  rowKey="rowNumber"
                  size="small"
                  pagination={false}
                  scroll={{ x: 1400 }}
                  rowClassName={(record) =>
                    record.status === "INVALID" ? "ant-table-row-error" : ""
                  }
                />
              )}
            </Card>

            {/* Actions */}
            <Card size="small">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {stats.invalid > 0 && (
                    <Alert
                      type="error"
                      message={`Còn ${stats.invalid} dòng lỗi. Không thể tạo đơn.`}
                      showIcon
                      style={{ display: "inline-block" }}
                    />
                  )}
                  {stats.invalid === 0 && stats.valid > 0 && (
                    <Alert
                      type="success"
                      message={`${stats.valid} đơn hàng sẵn sàng để tạo.`}
                      showIcon
                      style={{ display: "inline-block" }}
                    />
                  )}
                </div>

                <Space>
                  <Button onClick={handleClear}>Hủy</Button>
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={handleImport}
                    loading={importing}
                    disabled={stats.valid === 0 || stats.invalid > 0}
                  >
                    Tạo đơn ({stats.valid})
                  </Button>
                </Space>
              </div>
            </Card>
          </>
        )}
      </div>

      <style jsx global>{`
        .ant-table-row-error {
          background-color: #fff2f0;
        }
        .ant-table-row-error:hover {
          background-color: #ffebe8 !important;
        }
      `}</style>
    </PageContainer>
  );
}
