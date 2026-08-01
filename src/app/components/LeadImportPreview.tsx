"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Tag,
  Space,
  Typography,
  Card,
  Empty,
  Input,
  Button,
  Alert,
  Statistic,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  ClearOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import {
  parseLead,
  ParsedLead,
  LeadImportField,
  LeadValidationIssue,
} from "@/utils/import/leadParser";

import {
  loadLeadImportContext,
  LeadImportContext,
} from "@/services/import/leadImportValidation.service";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ==================================================
// Helpers
// ==================================================

/** Field → display column key (table dataIndex). */
const FIELD_TO_COLUMN: Partial<Record<LeadImportField, string>> = {
  customerName: "customerName",
  phone: "phone",
  combo: "combo",
  price: "price",
  sourceType: "sourceType",
  date: "date",
};

const fieldLabels: Record<LeadImportField, string> = {
  customerName: "Tên (customerName)",
  phone: "SĐT (phone)",
  combo: "Combo",
  price: "Giá (price)",
  sourceType: "Loại (sourceType)",
  date: "Ngày (date)",
};

// ==================================================
// Component - UI only, no parsing/validation logic
// ==================================================

export default function LeadImportPreview() {
  const [rawData, setRawData] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedLead[]>([]);
  const [headerDetected, setHeaderDetected] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<LeadImportField[]>([]);

  // Business-validation cache loaded ONCE via batch query.
  // Parser only ever reads from this; it never queries the DB itself.
  const [importContext, setImportContext] = useState<LeadImportContext | null>(
    null
  );

  // ==================================================
  // Load reference-data context on mount (Phase 3.2 refactor)
  // ==================================================
  useEffect(() => {
    let cancelled = false;
    loadLeadImportContext()
      .then(ctx => {
        if (!cancelled) setImportContext(ctx);
      })
      .catch(err => {
        // Context is optional - parser still works (format checks only).
        // eslint-disable-next-line no-console
        console.warn("[LeadImportPreview] Failed to load import context:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ==================================================
  // Handle textarea change - delegate to parser
  // ==================================================
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawData(value);
    const { rows, headers, missing } = parseLead(value, importContext ?? undefined);
    setParsedRows(rows);
    setHeaderDetected(headers);
    setMissingFields(missing);
  };

  // ==================================================
  // Handle Clear
  // ==================================================
  const handleClear = () => {
    setRawData("");
    setParsedRows([]);
    setHeaderDetected([]);
    setMissingFields([]);
  };

  // ==================================================
  // Statistics
  // ==================================================
  const totalRows = parsedRows.length;
  const validRows = useMemo(
    () => parsedRows.filter(r => r.status === "VALID").length,
    [parsedRows]
  );
  const invalidRows = useMemo(
    () => parsedRows.filter(r => r.status === "INVALID").length,
    [parsedRows]
  );
  const warningRows = useMemo(
    () =>
      parsedRows.filter(
        r =>
          r.status === "VALID" &&
          r.errors.some(i => i.severity === "WARNING")
      ).length,
    [parsedRows]
  );

  const hasData = totalRows > 0;
  const hasHeader = headerDetected.length > 0;
  const hasHeaderError = missingFields.length > 0;
  const hasRowErrors = hasData && invalidRows > 0;
  const hasErrors = hasHeaderError || hasRowErrors;

  // ==================================================
  // Cell render helpers (cell-level highlight)
  // ==================================================
  const fieldHasError = (
    record: ParsedLead,
    field: LeadImportField
  ): LeadValidationIssue[] =>
    record.errors.filter(
      i => i.severity === "ERROR" && i.field === field
    );

  const fieldHasWarning = (
    record: ParsedLead,
    field: LeadImportField
  ): LeadValidationIssue[] =>
    record.errors.filter(
      i => i.severity === "WARNING" && i.field === field
    );

  /**
   * Wrap a cell value with optional red/yellow border highlight
   * when there's an ERROR / WARNING attached to that field.
   */
  const renderCell = (
    value: string,
    record: ParsedLead,
    field: LeadImportField,
    displayNode: React.ReactNode
  ): React.ReactNode => {
    const errors = fieldHasError(record, field);
    const warnings = fieldHasWarning(record, field);

    if (errors.length === 0 && warnings.length === 0) {
      return displayNode;
    }

    const tooltipContent = (
      <Space direction="vertical" size={2}>
        {errors.map((e, i) => (
          <span key={`e-${i}`}>
            <strong style={{ color: "#ff7875" }}>Lỗi:</strong> {e.message}{" "}
            <Text type="secondary" style={{ fontSize: 11 }}>({e.code})</Text>
          </span>
        ))}
        {warnings.map((w, i) => (
          <span key={`w-${i}`}>
            <strong style={{ color: "#ffe58f" }}>Cảnh báo:</strong>{" "}
            {w.message}{" "}
            <Text type="secondary" style={{ fontSize: 11 }}>({w.code})</Text>
          </span>
        ))}
      </Space>
    );

    const isError = errors.length > 0;

    return (
      <Tooltip title={tooltipContent} placement="topLeft">
        <span
          data-testid={`cell-${field}-${record.rowNumber}`}
          style={{
            display: "inline-block",
            width: "100%",
            padding: "2px 6px",
            borderRadius: 4,
            border: isError
              ? "1px solid #ff4d4f"
              : "1px solid #faad14",
            background: isError ? "#fff1f0" : "#fffbe6",
          }}
        >
          {displayNode}
        </span>
      </Tooltip>
    );
  };

  // ==================================================
  // Table columns
  // ==================================================
  const columns: ColumnsType<ParsedLead> = [
    {
      title: "STT",
      key: "rowNumber",
      width: 80,
      align: "center",
      fixed: "left",
      render: (_: unknown, record: ParsedLead) => (
        <Tag color={record.status === "INVALID" ? "red" : "blue"}>
          Dòng {record.rowNumber}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      align: "center",
      render: (_: unknown, record: ParsedLead) => {
        const hasWarning = record.errors.some(i => i.severity === "WARNING");
        if (record.status === "VALID" && hasWarning) {
          return (
            <Tooltip
              title={
                <Space direction="vertical" size={2}>
                  {record.errors.map((e, i) => (
                    <span key={i}>• [{e.severity}] {e.message}</span>
                  ))}
                </Space>
              }
            >
              <Tag icon={<ExclamationCircleOutlined />} color="warning">
                ⚠ WARNING
              </Tag>
            </Tooltip>
          );
        }
        if (record.status === "VALID") {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              ✔ VALID
            </Tag>
          );
        }
        return (
          <Tooltip
            title={
              <Space direction="vertical" size={2}>
                {record.errors.map((e, i) => (
                  <span key={i}>• [{e.severity}] {e.message}</span>
                ))}
              </Space>
            }
          >
            <Tag icon={<CloseCircleOutlined />} color="error">
              ❌ INVALID
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Lý do",
      key: "errors",
      width: 280,
      render: (_: unknown, record: ParsedLead) => {
        if (record.errors.length === 0) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            {record.errors.map((e, i) => (
              <Tag
                key={i}
                color={e.severity === "ERROR" ? "error" : "warning"}
                style={{ margin: 0 }}
              >
                [{e.severity}] {e.message}{" "}
                <Text type="secondary" style={{ fontSize: 10 }}>
                  ({e.code})
                </Text>
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Tên",
      dataIndex: "customerName",
      key: "customerName",
      ellipsis: true,
      render: (value: string, record: ParsedLead) => {
        const display = <span>{value || <Text type="secondary">-</Text>}</span>;
        return renderCell(value, record, "customerName", display);
      },
    },
    {
      title: "SĐT",
      dataIndex: "phone",
      key: "phone",
      width: 140,
      render: (value: string, record: ParsedLead) =>
        renderCell(value, record, "phone", <span>{value || "-"}</span>),
    },
    {
      title: "Combo",
      dataIndex: "combo",
      key: "combo",
      ellipsis: true,
      render: (value: string, record: ParsedLead) =>
        renderCell(value, record, "combo", <span>{value || "-"}</span>),
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      width: 140,
      align: "right",
      render: (value: string, record: ParsedLead) => {
        const display = (
          <Text strong style={{ color: "#d4380d" }}>
            {value || "-"}
          </Text>
        );
        return renderCell(value, record, "price", display);
      },
    },
    {
      title: "Loại",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 140,
      render: (value: string, record: ParsedLead) => {
        const display = value ? (
          <Tag color="purple">{value}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        );
        return renderCell(value, record, "sourceType", display);
      },
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 160,
      render: (value: string, record: ParsedLead) => {
        const display = <span>{value || "-"}</span>;
        return renderCell(value, record, "date", display);
      },
    },
  ];

  // suppress unused-var lint for FIELD_TO_COLUMN (kept for future cell-level config)
  void FIELD_TO_COLUMN;

  // ==================================================
  // Render
  // ==================================================
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              Lead Import - Preview
            </Title>
            <Text type="secondary">
              Paste dữ liệu từ Google Sheet hoặc Landing Page.
              Header được map linh hoạt theo nhiều alias. <br />
              <Text strong style={{ color: "#fa8c16" }}>
                Chưa lưu Database. Chưa check trùng. Chưa import.
              </Text>
            </Text>
          </div>

          {/* Header Mapping Info */}
          <details
            style={{
              padding: "12px 16px",
              background: "#e6f4ff",
              border: "1px solid #91caff",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <summary style={{ fontWeight: 600 }}>
              Header Mapping hỗ trợ (nhấn để xem chi tiết)
            </summary>
            <Space direction="vertical" size="small" style={{ width: "100%", marginTop: 8 }}>
              <div>
                <Text strong>tên → customerName:</Text>{" "}
                <Text type="secondary">
                  Tên, Ten, Tên KH, Tên Khách Hàng, Khách Hàng, KH, Name, Customer Name, Full Name, Họ Tên ...
                </Text>
              </div>
              <div>
                <Text strong>sđt → phone:</Text>{" "}
                <Text type="secondary">
                  SĐT, SDT, Số Điện Thoại, Điện Thoại, Phone, Tel, Mobile ...
                </Text>
              </div>
              <div>
                <Text strong>combo:</Text>{" "}
                <Text type="secondary">Combo, Gói, Gói Combo, Package, Dịch Vụ, Service ...</Text>
              </div>
              <div>
                <Text strong>giá → price:</Text>{" "}
                <Text type="secondary">Giá, Gia, Giá Combo, Price, Số Tiền, Amount, Thành Tiền ...</Text>
              </div>
              <div>
                <Text strong>loại → sourceType:</Text>{" "}
                <Text type="secondary">
                  Loại, Loại Nguồn, Type, Source, Nguồn, Channel ...
                </Text>
              </div>
              <div>
                <Text strong>ngày → date:</Text>{" "}
                <Text type="secondary">Ngày, Ngày Tạo, Ngày Đăng Ký, Date, Created ...</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ color: "#cf1322" }}>
                  Bắt buộc:
                </Text>{" "}
                <Tag color="red">Tên</Tag>
                <Tag color="red">SĐT</Tag>
                <Text type="secondary">→ các cột khác optional</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ color: "#fa8c16" }}>
                  Mức độ lỗi:
                </Text>{" "}
                <Tag color="error">ERROR</Tag>
                <Text type="secondary">chặn import</Text>
                <Tag color="warning" style={{ marginLeft: 8 }}>
                  WARNING
                </Tag>
                <Text type="secondary">cho phép import (cảnh báo)</Text>
              </div>
            </Space>
          </details>

          {/* Paste Area */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text strong>
                <FileTextOutlined /> Paste dữ liệu (Ctrl + V):
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Có thể kèm header (dòng đầu) hoặc không
              </Text>
            </div>
            <TextArea
              value={rawData}
              onChange={handleChange}
              placeholder={`Ví dụ CÓ header:
Tên KH\tĐiện thoại\tGói\tGiá\tLoại\tNgày
Nguyễn Văn A\t0901234567\tCombo Cơ bản\t500000\tLANDING_PAGE\t2025-07-31
Trần Thị B\tabc123\tCombo Pro\t1000000\tLANDING_PAGE\t2025-07-31
Lê Văn C\t0909999999\tCombo VIP\t-500\tINVALID_SOURCE\tnot-a-date`}
              autoSize={{ minRows: 8, maxRows: 16 }}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              data-testid="lead-import-textarea"
            />
          </div>

          {/* Error Alert - thiếu cột bắt buộc (header) */}
          {hasHeaderError && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message="Không thể parse dữ liệu"
              description={
                <Space direction="vertical" size={4}>
                  <Text strong>Thiếu cột bắt buộc:</Text>
                  <Space size={[4, 4]} wrap>
                    {missingFields.map(f => (
                      <Tag key={f} color="red">
                        {fieldLabels[f]}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary">
                    Vui lòng paste đầy đủ các cột bắt buộc (Tên, SĐT).
                  </Text>
                </Space>
              }
            />
          )}

          {/* Statistics */}
          {hasData && !hasHeaderError && (
            <Card size="small" style={{ background: "#fafafa" }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Tổng số dòng" value={totalRows} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Hợp lệ"
                    value={validRows}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Cảnh báo"
                    value={warningRows}
                    valueStyle={{
                      color: warningRows > 0 ? "#fa8c16" : undefined,
                    }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Không hợp lệ"
                    value={invalidRows}
                    valueStyle={{
                      color: invalidRows > 0 ? "#cf1322" : undefined,
                    }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              padding: "12px 16px",
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: 6,
            }}
          >
            <Space size="middle">
              <Button
                type="default"
                danger
                icon={<ClearOutlined />}
                onClick={handleClear}
                disabled={!rawData && !hasData}
              >
                Clear
              </Button>
              {hasData && (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Đã parse: <strong>{totalRows}</strong> dòng
                </Tag>
              )}
              {hasHeader && (
                <Tag color="purple">
                  Header: {headerDetected.length} cột
                </Tag>
              )}
              {hasData && validRows > 0 && (
                <Tag color="green">✔ {validRows} hợp lệ</Tag>
              )}
              {hasData && warningRows > 0 && (
                <Tag color="orange">⚠ {warningRows} cảnh báo</Tag>
              )}
              {hasData && invalidRows > 0 && (
                <Tag color="red">❌ {invalidRows} không hợp lệ</Tag>
              )}
            </Space>
            <Space size="small">
              {hasData ? (
                <>
                  <Tag color="orange">Chưa check trùng</Tag>
                  <Tag color="orange">Chưa import</Tag>
                </>
              ) : (
                !hasHeaderError && <Tag>Chưa có dữ liệu</Tag>
              )}
            </Space>
          </div>

          {/* Preview Table */}
          <div>
            <Title level={5}>Preview</Title>
            {hasHeaderError ? (
              <Empty
                description="Không parse được do thiếu cột bắt buộc."
                style={{ padding: "40px 0" }}
              />
            ) : totalRows === 0 ? (
              <Empty
                description="Chưa có dữ liệu. Vui lòng paste dữ liệu vào ô trên."
                style={{ padding: "40px 0" }}
              />
            ) : (
              <Table<ParsedLead>
                columns={columns}
                dataSource={parsedRows}
                rowKey="rowNumber"
                size="small"
                bordered
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50", "100"],
                  showTotal: total => `Tổng ${total} dòng đã parse`,
                }}
              />
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
}