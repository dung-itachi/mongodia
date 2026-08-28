/**
 * Daily Ads Report Component
 *
 * 📊 Báo cáo Ads theo ngày
 * Hiển thị bảng chi tiết từ MarketingExpenseReport:
 * - Xin sáng, Xin chiều, Xin gấp (editable)
 * - Tổng tiêu (readonly)
 * - Tiền dư, DS, %Ads
 *
 * Sprint 7.4 — Scope theo tài khoản đăng nhập:
 *  - MKT (non-GLOBAL): API tự khoá cứng theo `marketingEmployeeId = currentUser._id`.
 *  - ADMIN/GLOBAL: mặc định xem tất cả MKT, có dropdown chọn MKT cụ thể.
 *
 * Sprint 8.0 — Phân trang khi period > 30 ngày
 *
 * Sprint 8.X — Team/Area filter support:
 *  - Khi lọc theo Team hoặc Area, component render NHIỀU BẢNG (mỗi MKT là 1 bảng).
 *  - Khi lọc theo MKT cụ thể hoặc global, render 1 bảng tổng (giống cũ).
 *  - Mỗi bảng đều có Card riêng, summary riêng, phân trang riêng.
 */

import { memo, useState, useEffect, useMemo } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic, Button, Modal, Form, InputNumber, DatePicker, Popconfirm, Space, Select, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMarketingDailyAdsReport, type DailyAdsReportRow, type DailyAdsReportSummary } from "@/hooks/useMarketingDailyAdsReport";
import { useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";
import { useAuthStore } from "@/store/auth.store";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import api from "@/lib/axios";
import styles from "./marketing.module.css";
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { useMessage } from "@/contexts/MessageContext";

export type DailyAdsReportProps = {
  period: ChartPeriod;
  teamId?: string;
  areaId?: string;
  /** When true, API returns per-MKT data; component renders multiple tables. */
  groupByEmployee?: boolean;
};

type DailyAdsRow = {
  key: string;
  _id: string;
  date: string;
  dateDisplay: string;
  xinSang: number;
  xinChieu: number;
  xinGap: number;
  tongTieu: number;
  tienDu: number;
  totalRevenue: number;
  percentAds: number;
  status: string;
};

/**
 * ADMIN (role=ADMIN) hoặc user có wildcard permission "*" được xem tất cả MKT.
 */
function isGlobalUser(user: { role: string; permissions: string[] } | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.permissions.includes("*");
}

/**
 * Tính page size dựa vào period
 * - period < 30 ngày: hiển thị tất cả (no pagination)
 * - period >= 30 ngày: phân trang 15 ngày/page
 */
function getPageSize(period: ChartPeriod): number {
  const periodDays: Record<ChartPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "monthStart": 31,
    "1month": 30,
    "30d": 30,
    "90d": 90,
  };
  const days = periodDays[period] ?? 30;
  return days >= 30 ? 15 : 0;
}

// ============================================================================
// Shared mutators (Add/Edit/Delete) — same handlers as before
// ============================================================================

function useAdsColumns(): ColumnsType<DailyAdsRow> {
  const lang = useLanguageStore((s) => s.language);
  return useMemo<ColumnsType<DailyAdsRow>>(() => [
    {
      title: t("Ngày", lang),
      dataIndex: "dateDisplay",
      key: "dateDisplay",
      width: 100,
      fixed: "left",
      render: (_: unknown, row: DailyAdsRow) => {
        const v =
          row?.dateDisplay && typeof row.dateDisplay === "string"
            ? row.dateDisplay
            : row?.date
              ? String(row.date)
              : "—";
        return <span style={{ fontWeight: 500 }}>{v}</span>;
      },
    },
    {
      title: t("Xin sáng", lang),
      dataIndex: "xinSang",
      key: "xinSang",
      width: 140,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: t("Xin chiều", lang),
      dataIndex: "xinChieu",
      key: "xinChieu",
      width: 140,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: t("Xin gấp", lang),
      dataIndex: "xinGap",
      key: "xinGap",
      width: 130,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: t("Tổng tiêu", lang),
      dataIndex: "tongTieu",
      key: "tongTieu",
      width: 140,
      align: "right",
      render: (value: number) => (
        <span style={{ color: "#fa8c16", fontWeight: 600 }}>{formatNumber(value)}</span>
      ),
    },
    {
      title: t("Tiền dư", lang),
      dataIndex: "tienDu",
      key: "tienDu",
      width: 130,
      align: "right",
      render: (value: number) => (
        <span style={{ color: value >= 0 ? "#52c41a" : "#ff4d4f" }}>
          {formatNumber(value)}
        </span>
      ),
    },
    {
      title: t("DS", lang),
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 150,
      align: "right",
      render: (value: number) => (
        <span style={{ color: "#13c2c2", fontWeight: 600 }}>{formatNumber(value)}</span>
      ),
    },
    {
      title: t("%Ads", lang),
      dataIndex: "percentAds",
      key: "percentAds",
      width: 80,
      align: "center",
      render: (value: number) => (
        <span style={{
          color: value <= 100 ? "#52c41a" : "#ff4d4f",
          fontWeight: 600
        }}>
          {value}%
        </span>
      ),
    },
    {
      title: t("Thao tác", lang),
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_: unknown, record: DailyAdsRow) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => (window as any).__openEditAdsReport?.(record)}
          >
            {t("Sửa", lang)}
          </Button>
          <Popconfirm
            title={t("Xóa báo cáo?", lang)}
            description={t("Bạn có chắc muốn xóa báo cáo này?", lang)}
            onConfirm={() => (window as any).__deleteAdsReport?.(record._id)}
            okText={t("Xóa", lang)}
            cancelText={t("Hủy", lang)}
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t("Xóa", lang)}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [lang]);
}

// ============================================================================
// Single-table block — used both standalone and per-MKT in grouped view
// ============================================================================

function toRows(items: DailyAdsReportRow[]): DailyAdsRow[] {
  return items.map((item, index) => {
    const rawDate = String(item.date ?? "");
    const dateParts = rawDate ? rawDate.split("-") : [];
    const dateDisplay =
      dateParts.length === 3
        ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        : rawDate || "—";
    const empId = String((item as any).marketingEmployeeId ?? "");
    return {
      key: empId ? `${empId}-${rawDate || index}` : `${rawDate || "row"}-${index}`,
      _id: (item as any).firstReportId || "",
      date: rawDate,
      dateDisplay,
      xinSang: item.xinSang ?? 0,
      xinChieu: item.xinChieu ?? 0,
      xinGap: item.xinGap ?? 0,
      tongTieu: item.tongTieu ?? 0,
      tienDu: item.tienDu ?? 0,
      totalRevenue: item.totalRevenue ?? 0,
      percentAds: item.percentAds ?? 0,
      status: (item as any).status || "",
    };
  });
}

function defaultSummary(): DailyAdsReportSummary {
  return {
    totalDays: 0,
    tongXin: 0,
    tongTieu: 0,
    tienDu: 0,
    totalRevenue: 0,
    totalLeads: 0,
    closedLeads: 0,
    percentAds: 0,
  };
}

type AdsTableBlockProps = {
  title?: React.ReactNode;
  items: DailyAdsReportRow[];
  summary: DailyAdsReportSummary;
  period: ChartPeriod;
  loading: boolean;
};

function AdsTableBlock({ title, items, summary, period, loading }: AdsTableBlockProps) {
  const lang = useLanguageStore((s) => s.language);
  const columns = useAdsColumns();
  const pageSize = getPageSize(period);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [period]);

  const tableData = toRows(items);
  const paginatedData =
    !pageSize || tableData.length <= pageSize
      ? tableData
      : tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const showPagination = pageSize > 0 && tableData.length > pageSize;
  const s = summary ?? defaultSummary();

  if (loading) {
    return (
      <Card title={title || t("📊 Báo cáo Ads theo ngày", lang)} className={styles["mk-daily-report-card"]}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  return (
    <Card
      title={title || t("📊 Báo cáo Ads theo ngày", lang)}
      className={styles["mk-daily-report-card"]}
    >
      <Row gutter={16} className={styles["mk-daily-report-summary"]}>
        <Col span={4}>
          <Statistic
            title={t("Tổng xin", lang)}
            value={s.tongXin}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={t("Tổng tiêu", lang)}
            value={s.tongTieu}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#fa8c16", fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={t("Tiền dư", lang)}
            value={s.tienDu}
            formatter={(value) => formatNumber(Number(value))}
            styles={{
              content: {
                color: Number(s.tienDu) >= 0 ? "#52c41a" : "#ff4d4f",
                fontSize: "18px",
              },
            }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={t("Doanh số", lang)}
            value={s.totalRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#13c2c2", fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={t("%Ads", lang)}
            value={s.percentAds}
            formatter={(value) => `${value}%`}
            styles={{
              content: {
                color: s.percentAds <= 100 ? "#52c41a" : "#ff4d4f",
                fontSize: "18px",
              },
            }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={t("Tổng khách", lang)}
            value={s.totalLeads}
            styles={{ content: { fontSize: "18px" } }}
          />
        </Col>
      </Row>

      {tableData.length > 0 ? (
        <Table
          columns={columns}
          dataSource={paginatedData}
          pagination={
            showPagination
              ? {
                  current: currentPage,
                  pageSize,
                  total: tableData.length,
                  onChange: (page) => setCurrentPage(page),
                  showSizeChanger: false,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} / ${total} ${t("ngày", lang)}`,
                }
              : false
          }
          size="small"
          scroll={{ x: 1100 }}
          className={styles["mk-daily-report-table"]}
          bordered
        />
      ) : (
        <Empty description={t("Chưa có dữ liệu báo cáo Ads", lang)} />
      )}
    </Card>
  );
}

// ============================================================================
// Main component — decides single table vs multi-MKT table layout
// ============================================================================

function DailyAdsReportInner({ period, teamId, areaId, groupByEmployee }: DailyAdsReportProps) {
  const user = useAuthStore((state) => state.user);
  const isGlobal = isGlobalUser(user);
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);

  // Determine effective filter & groupBy flag
  const effectiveTeamId = teamId && teamId !== "__all__" ? teamId : undefined;
  const effectiveAreaId = areaId && areaId !== "__all__" ? areaId : undefined;
  const useGrouped = !!groupByEmployee && (!!effectiveTeamId || !!effectiveAreaId) && isGlobal;

  // MKT dropdown for GLOBAL non-grouped (single-MKT view)
  // Stores the actual selected employee id; "__all__" sentinel is treated as "no filter".
  const [selectedMarketingEmployeeId, setSelectedMarketingEmployeeId] = useState<
    string | undefined
  >(undefined);

  const { employees: marketingEmployeeOptions } = useMarketingEmployees();

  // Treat "__all__" the same as no selection — never forward the sentinel to the API.
  const effectiveMktId =
    selectedMarketingEmployeeId && selectedMarketingEmployeeId !== "__all__"
      ? selectedMarketingEmployeeId
      : undefined;

  const { data, loading, error, refetch, scope } = useMarketingDailyAdsReport({
    period,
    marketingEmployeeId: isGlobal && !useGrouped ? effectiveMktId : undefined,
    teamId: effectiveTeamId,
    areaId: effectiveAreaId,
    groupBy: useGrouped ? "employee" : null,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyAdsRow | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Expose handlers to Table rows via window (same pattern as before, simple & safe in this scope)
  (window as any).__openEditAdsReport = (record: DailyAdsRow) => {
    setEditingReport(record);
    setIsEditMode(true);
    form.setFieldsValue({
      xinSang: record.xinSang,
      xinChieu: record.xinChieu,
      xinGap: record.xinGap,
      tongTieu: record.tongTieu,
    });
    setIsModalOpen(true);
  };

  (window as any).__deleteAdsReport = async (id: string) => {
    try {
      const response = await api.delete(`/api/marketing/expenses/${id}`);
      if (response.data.success) {
        message.success(t("Đã xóa báo cáo thành công!", lang));
        refetch();
      } else {
        message.error(response.data.message || t("Không thể xóa báo cáo", lang));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || t("Đã xảy ra lỗi khi xóa báo cáo", lang));
    }
  };

  const handleAddReport = async (values: {
    reportDate?: dayjs.Dayjs;
    xinSang: number;
    xinChieu: number;
    xinGap: number;
    tongTieu?: number;
  }) => {
    setSubmitting(true);
    try {
      const response = await api.post("/api/marketing/dashboard/daily-ads-report", {
        reportDate: values.reportDate
          ? values.reportDate.format("YYYY-MM-DD")
          : new Date().toISOString().slice(0, 10),
        xinSang: values.xinSang || 0,
        xinChieu: values.xinChieu || 0,
        xinGap: values.xinGap || 0,
      });

      if (response.data.success) {
        message.success(t("Đã thêm báo cáo thành công!", lang));
        setIsModalOpen(false);
        form.resetFields();
        refetch();
      } else {
        message.error(response.data.message || t("Không thể thêm báo cáo", lang));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || t("Đã xảy ra lỗi khi thêm báo cáo", lang));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReport = async (values: {
    reportDate?: dayjs.Dayjs;
    xinSang: number;
    xinChieu: number;
    xinGap: number;
    tongTieu: number;
  }) => {
    if (!editingReport) return;
    setSubmitting(true);
    try {
      const response = await api.patch(`/api/marketing/expenses/${editingReport._id}`, {
        requestedBudget: {
          morning: values.xinSang || 0,
          afternoon: values.xinChieu || 0,
          emergency: values.xinGap || 0,
        },
        spentBudget: {
          morning: values.tongTieu || 0,
          afternoon: 0,
          emergency: 0,
        },
      });
      if (response.data.success) {
        message.success(t("Đã cập nhật báo cáo thành công!", lang));
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingReport(null);
        form.resetFields();
        refetch();
      } else {
        message.error(response.data.message || t("Không thể cập nhật báo cáo", lang));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || t("Đã xảy ra lỗi khi cập nhật báo cáo", lang));
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingReport(null);
    form.resetFields();
  };

  // Determine showing scope text
  const showingMktName = useGrouped
    ? t(`Đang xem theo ${effectiveAreaId ? "khu vực" : "team"}`, lang)
    : isGlobal
      ? selectedMarketingEmployeeId && selectedMarketingEmployeeId !== "__all__"
        ? marketingEmployeeOptions.find((e) => e.value === selectedMarketingEmployeeId)?.label ?? t("Tất cả MKT", lang)
        : t("Tất cả MKT", lang)
      : scope === "SELF"
        ? t("MKT của bạn", lang)
        : t("Tất cả MKT", lang);

  // ─── Render: Multi-table mode (team/area filter) ───
  if (useGrouped) {
    if (loading) {
      return (
        <Card title={t("📊 Báo cáo Ads theo ngày", lang)} className={styles["mk-daily-report-card"]}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      );
    }

    if (error) {
      return (
        <Card title={t("📊 Báo cáo Ads theo ngày", lang)} className={styles["mk-daily-report-card"]}>
          <div className={styles["mk-drawer-error"]}>
            {t("Không thể tải dữ liệu báo cáo Ads", lang)}
          </div>
        </Card>
      );
    }

    const grouped = data?.groupedData ?? [];

    return (
      <div className={styles["mk-daily-report-multi"]}>
        <Card
          title={t("📊 Báo cáo Ads theo ngày", lang)}
          className={styles["mk-daily-report-card"]}
          extra={
            <Space size={12}>
              <span style={{ color: "#595959", fontSize: 13 }}>
                {t("Đang xem:", lang)} <strong>{showingMktName}</strong>
                <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
                  {`(${grouped.length} ${t("MKT", lang)})`}
                </span>
              </span>
            </Space>
          }
        >
          {grouped.length === 0 ? (
            <Empty description={t("Chưa có dữ liệu báo cáo Ads", lang)} />
          ) : (
            <div className={styles["mk-daily-report-substack"]}>
              {grouped.map((g, gi) => (
                <AdsTableBlock
                  key={String(g.marketingEmployeeId ?? gi)}
                  title={
                    <span>
                      <UserOutlined style={{ marginRight: 6 }} />
                      <strong>{g.employeeName}</strong>
                    </span>
                  }
                  items={g.data}
                  summary={g.summary}
                  period={period}
                  loading={false}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── Render: Single-table mode (default / MKT cụ thể) ───
  const items = data?.data ?? [];
  const summary = data?.summary ?? defaultSummary();

  return (
    <Card
      title={t("📊 Báo cáo Ads theo ngày", lang)}
      className={styles["mk-daily-report-card"]}
      extra={
        <Space size={12}>
          {isGlobal && (
            <Space size={8}>
              <UserOutlined style={{ color: "#8c8c8c" }} />
              <Select
                allowClear
                placeholder={t("Chọn MKT cụ thể", lang)}
                value={selectedMarketingEmployeeId}
                onChange={(v) => setSelectedMarketingEmployeeId(v)}
                options={[
                  { value: "__all__", label: t("Tất cả MKT", lang) },
                  ...marketingEmployeeOptions,
                ]}
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                size="small"
                style={{ width: 220 }}
              />
            </Space>
          )}
          <Button
            type="primary"
            onClick={() => {
              setIsEditMode(false);
              setEditingReport(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            {t("+ Thêm báo cáo", lang)}
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 12, fontSize: 13, color: "#595959" }}>
        {t("Đang xem:", lang)} <strong>{showingMktName}</strong>
        {scope === "SELF" && (
          <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
            {t("(chỉ báo cáo Ads của bạn)", lang)}
          </span>
        )}
      </div>

      <AdsTableBlock items={items} summary={summary} period={period} loading={loading} />

      {/* Add/Edit Modal */}
      <Modal
        title={isEditMode ? t("📝 Sửa báo cáo Ads", lang) : t("📝 Thêm báo cáo Ads", lang)}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={isEditMode ? handleEditReport : handleAddReport}
          initialValues={{
            reportDate: dayjs(),
            xinSang: 0,
            xinChieu: 0,
            xinGap: 0,
            tongTieu: 0,
          }}
        >
          {!isEditMode && (
            <Form.Item
              label={t("Ngày báo cáo", lang)}
              name="reportDate"
              rules={[{ required: true, message: t("Vui lòng chọn ngày", lang) }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder={t("Chọn ngày", lang)}
                disabledDate={(current) => current && current > dayjs().endOf("day")}
              />
            </Form.Item>
          )}

          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#1890ff" }}>{t("XIN", lang)}</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label={t("Xin sáng", lang)} name="xinSang" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => (Number(value!.replace(/,/g, "")) || 0) as 0}
                    min={0}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Xin chiều", lang)} name="xinChieu" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => (Number(value!.replace(/,/g, "")) || 0) as 0}
                    min={0}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Xin gấp", lang)} name="xinGap" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => (Number(value!.replace(/,/g, "")) || 0) as 0}
                    min={0}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {isEditMode && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fff7e6", borderRadius: 8, border: "1px solid #ffd591" }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: "#fa8c16" }}>{t("ĐÃ TIÊU", lang)}</div>
              <Form.Item label={t("Tổng tiêu", lang)} name="tongTieu" style={{ marginBottom: 0 }}>
                <InputNumber
                  style={{ width: "100%" }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(value) => (Number(value!.replace(/,/g, "")) || 0) as 0}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={closeModal}>{t("Hủy", lang)}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEditMode ? t("Cập nhật", lang) : t("Thêm báo cáo", lang)}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

const DailyAdsReport = memo(DailyAdsReportInner);
export default DailyAdsReport;
