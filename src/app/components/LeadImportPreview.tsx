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
  LeadValidationIssue,
  LEAD_DUPLICATE_LABELS,
} from "@/utils/import/leadParser";

import type { LeadImportField } from "@/constants/importHeaders";

import {
  loadLeadImportContext,
  LeadImportContext,
} from "@/services/import/leadImportValidation.service";

import {
  simulateLeadImport,
  LeadImportSimulation,
} from "@/services/import/leadImportSimulation.service";

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

  // Phase 3.4 - duplicate statistics
  const newCustomers = useMemo(
    () => parsedRows.filter(r => !r.isDuplicate && r.status === "VALID").length,
    [parsedRows]
  );
  const returningCustomers = useMemo(
    () =>
      parsedRows.filter(
        r =>
          r.isDuplicate &&
          r.duplicateType === "PHONE" &&
          r.customerId
      ).length,
    [parsedRows]
  );
  const duplicateLeads = useMemo(
    () =>
      parsedRows.filter(
        r => r.isDuplicate && !r.customerId && r.duplicateType === "PHONE"
      ).length,
    [parsedRows]
  );
  const duplicateFacebook = useMemo(
    () =>
      parsedRows.filter(r => r.isDuplicate && r.duplicateType === "FACEBOOK")
        .length,
    [parsedRows]
  );
  const totalDuplicates = useMemo(
    () => parsedRows.filter(r => r.isDuplicate).length,
    [parsedRows]
  );

  // Phase 3.5 - Read-only simulation of the import pipeline.
  // Pure derivation from `parsedRows` + `importContext`; never writes to DB.
  const simulation: LeadImportSimulation = useMemo(
    () => simulateLeadImport(parsedRows, importContext ?? undefined),
    [parsedRows, importContext]
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
      <Space orientation="vertical" size={2}>
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
                <Space orientation="vertical" size={2}>
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
              <Space orientation="vertical" size={2}>
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
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
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
    // ==================================================
    // Phase 3.4 - Duplicate Detection columns (INFO only)
    // ==================================================
    {
      title: "Duplicate",
      key: "duplicate",
      width: 130,
      align: "center",
      render: (_: unknown, record: ParsedLead) => {
        if (!record.isDuplicate) {
          return (
            <Tag color="default" style={{ margin: 0 }}>
              Khách mới
            </Tag>
          );
        }
        return (
          <Tooltip
            title={
              <span>
                Phát hiện trùng lặp - vẫn cho phép Import (INFO)
              </span>
            }
          >
            <Tag icon={<ExclamationCircleOutlined />} color="processing" style={{ margin: 0 }}>
              🔁 Trùng
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Loại trùng",
      key: "duplicateType",
      width: 160,
      render: (_: unknown, record: ParsedLead) => {
        if (!record.isDuplicate) {
          return <Text type="secondary">-</Text>;
        }
        const colorMap: Record<string, string> = {
          PHONE: "orange",
          FACEBOOK: "purple",
          CUSTOMER: "blue",
          LEAD: "magenta",
          NONE: "default",
        };
        return (
          <Tag color={colorMap[record.duplicateType] || "default"} style={{ margin: 0 }}>
            {LEAD_DUPLICATE_LABELS[record.duplicateType]}
          </Tag>
        );
      },
    },
    {
      title: "Khách hàng trùng",
      key: "matchedCustomer",
      width: 200,
      render: (_: unknown, record: ParsedLead) => {
        if (!record.isDuplicate) return <Text type="secondary">-</Text>;
        if (record.matchedCode) {
          return (
            <Space size={4}>
              <Tag color="cyan" style={{ margin: 0 }}>
                {record.matchedCode}
              </Tag>
              {record.customerId && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  (link vào KH)
                </Text>
              )}
            </Space>
          );
        }
        return <Text type="secondary">-</Text>;
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
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              Lead Import - Preview
            </Title>
            <Text type="secondary">
              Paste dữ liệu từ Google Sheet hoặc Landing Page.
              Header được map linh hoạt theo nhiều alias. <br />
              <Text strong style={{ color: "#fa8c16" }}>
                Chưa lưu Database. Chưa tạo Customer. Chưa tạo Lead. Chưa import.
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Phase 3.4: Duplicate Detection (Phone / Facebook) - chỉ phát hiện và hiển thị, vẫn cho phép Import.
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
            <Space orientation="vertical" size="small" style={{ width: "100%", marginTop: 8 }}>
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
                <Tag color="processing" style={{ marginLeft: 8 }}>
                  INFO
                </Tag>
                <Text type="secondary">Duplicate - vẫn cho Import</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ color: "#722ed1" }}>
                  Phase 3.4 - Duplicate Detection:
                </Text>{" "}
                <Tag color="orange">Phone → Customer</Tag>
                <Tag color="magenta">Phone → Lead</Tag>
                <Tag color="purple">Facebook → Lead</Tag>
                <Text type="secondary">
                  (1 batch query / domain, đọc từ cache Map)
                </Text>
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
                <Space orientation="vertical" size={4}>
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
                <Col span={4}>
                  <Statistic title="Tổng số dòng" value={totalRows} />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Hợp lệ"
                    value={validRows}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Cảnh báo"
                    value={warningRows}
                    valueStyle={{
                      color: warningRows > 0 ? "#fa8c16" : undefined,
                    }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Không hợp lệ"
                    value={invalidRows}
                    valueStyle={{
                      color: invalidRows > 0 ? "#cf1322" : undefined,
                    }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Khách mới"
                    value={newCustomers}
                    valueStyle={{ color: "#1890ff" }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Khách quay lại"
                    value={returningCustomers}
                    valueStyle={{
                      color: returningCustomers > 0 ? "#722ed1" : undefined,
                    }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
              </Row>
              {totalDuplicates > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #d9d9d9" }}>
                  <Space size="middle" wrap>
                    <Text type="secondary">Thống kê trùng lặp (INFO - vẫn cho Import):</Text>
                    <Tag color="orange">🔁 Trùng SĐT - Khách quay lại: {returningCustomers}</Tag>
                    <Tag color="magenta">📋 Trùng SĐT - Lead cũ: {duplicateLeads}</Tag>
                    <Tag color="purple">🔗 Trùng Facebook: {duplicateFacebook}</Tag>
                    <Tag color="cyan">Tổng trùng: {totalDuplicates}</Tag>
                  </Space>
                </div>
              )}
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
              {hasData && newCustomers > 0 && (
                <Tag color="blue">👤 {newCustomers} khách mới</Tag>
              )}
              {hasData && totalDuplicates > 0 && (
                <Tag color="purple">🔁 {totalDuplicates} trùng lặp (INFO)</Tag>
              )}
            </Space>
            <Space size="small">
              {hasData ? (
                <>
                  <Tag color="orange">Chưa tạo Customer</Tag>
                  <Tag color="orange">Chưa tạo Lead</Tag>
                  <Tag color="orange">Chưa import</Tag>
                </>
              ) : (
                !hasHeaderError && <Tag>Chưa có dữ liệu</Tag>
              )}
            </Space>
          </div>

          {/* Phase 3.5 - Simulation Summary (read-only, no DB writes) */}
          {hasData && !hasHeaderError && (
            <Card
              size="small"
              data-testid="lead-import-simulation"
              style={{
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
              }}
              title={
                <Space>
                  <Text strong style={{ color: "#389e0d" }}>
                    Mô phỏng Import
                  </Text>
                  <Tag color="green">Phase 3.5</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chỉ mô phỏng - không ghi Database
                  </Text>
                  <Tag
                    color={simulation.readyToImport ? "success" : "default"}
                    icon={
                      simulation.readyToImport ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                    data-testid="lead-import-ready-tag"
                  >
                    {simulation.readyToImport
                      ? "Sẵn sàng Import"
                      : "Chưa sẵn sàng"}
                  </Tag>
                  {simulation.leadsToCreate > 0 && (
                    <Tooltip
                      title={`Ước tính thời gian xử lý ${simulation.leadsToCreate} Lead (chỉ mang tính UX, không chính xác)`}
                    >
                      <Tag
                        color="blue"
                        data-testid="lead-import-estimate-tag"
                      >
                        ⏱ {simulation.leadsToCreate} Lead →{" "}
                        {simulation.estimatedExecution.label}
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              }
            >
              <Row gutter={[16, 12]}>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Tổng số dòng"
                    value={simulation.totalRows}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Lead sẽ tạo"
                    value={simulation.leadsToCreate}
                    valueStyle={{ color: "#389e0d" }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Customer sẽ tạo"
                    value={simulation.customersToCreate}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Khách mới"
                    value={simulation.newCustomers}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Khách quay lại"
                    value={simulation.returningCustomers}
                    valueStyle={{
                      color:
                        simulation.returningCustomers > 0
                          ? "#722ed1"
                          : undefined,
                    }}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Trùng SĐT"
                    value={simulation.duplicatePhone}
                    valueStyle={{
                      color:
                        simulation.duplicatePhone > 0
                          ? "#fa8c16"
                          : undefined,
                    }}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Trùng Facebook"
                    value={simulation.duplicateFacebook}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Trùng Customer"
                    value={simulation.duplicateCustomer}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Warning"
                    value={simulation.warningCount}
                    valueStyle={{
                      color:
                        simulation.warningCount > 0
                          ? "#fa8c16"
                          : undefined,
                    }}
                    prefix={<WarningOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Error"
                    value={simulation.errorCount}
                    valueStyle={{
                      color:
                        simulation.errorCount > 0 ? "#cf1322" : undefined,
                    }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Dòng sẽ bỏ qua"
                    value={simulation.invalidRows}
                    valueStyle={{
                      color:
                        simulation.invalidRows > 0
                          ? "#cf1322"
                          : undefined,
                    }}
                  />
                </Col>
              </Row>

              {simulation.skippedRowNumbers.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 12 }}
                  title={
                    <Text>
                      Sẽ bỏ qua {simulation.invalidRows} dòng:{" "}
                      <Text code>
                        {simulation.skippedRowNumbers.join(", ")}
                      </Text>
                    </Text>
                  }
                />
              )}

              {Object.keys(simulation.issueSummary).length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px dashed #d9d9d9",
                  }}
                >
                  <Space size={[4, 4]} wrap>
                    <Text type="secondary">Tóm tắt lỗi:</Text>
                    {Object.entries(simulation.issueSummary)
                      .sort(([, a], [, b]) => b - a)
                      .map(([code, count]) => (
                        <Tag key={code} color="default">
                          {code}: <strong>{count}</strong>
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}
            </Card>
          )}

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
                scroll={{ x: 1700 }}
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