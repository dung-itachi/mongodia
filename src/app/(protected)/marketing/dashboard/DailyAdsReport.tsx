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
 */

import { memo, useState, useEffect } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic, Button, Modal, Form, InputNumber, DatePicker, Popconfirm, Space, Select, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMarketingDailyAdsReport } from "@/hooks/useMarketingDailyAdsReport";
import { useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";
import { useAuthStore } from "@/store/auth.store";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import api from "@/lib/axios";
import styles from "./marketing.module.css";
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { useMessage } from "@/contexts/MessageContext";

export type DailyAdsReportProps = {
  period: ChartPeriod;
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

function DailyAdsReportInner({ period }: DailyAdsReportProps) {
  const user = useAuthStore((state) => state.user);
  const isGlobal = isGlobalUser(user);
  const message = useMessage();
  const pageSize = getPageSize(period);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page khi period thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [period]);

  // Chỉ fetch MKT list khi user là GLOBAL — non-GLOBAL bị khoá cứng rồi.
  const { employees: marketingEmployeeOptions } = useMarketingEmployees();

  const [selectedMarketingEmployeeId, setSelectedMarketingEmployeeId] = useState<
    string | undefined
  >(undefined);

  const { data, loading, error, refetch, scope } = useMarketingDailyAdsReport({
    period,
    marketingEmployeeId: isGlobal ? selectedMarketingEmployeeId : undefined,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyAdsRow | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

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
        reportDate: values.reportDate ? values.reportDate.toISOString() : new Date().toISOString(),
        xinSang: values.xinSang || 0,
        xinChieu: values.xinChieu || 0,
        xinGap: values.xinGap || 0,
      });

      if (response.data.success) {
        message.success("Đã thêm báo cáo thành công!");
        setIsModalOpen(false);
        form.resetFields();
        refetch();
      } else {
        message.error(response.data.message || "Không thể thêm báo cáo");
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đã xảy ra lỗi khi thêm báo cáo");
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
        message.success("Đã cập nhật báo cáo thành công!");
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingReport(null);
        form.resetFields();
        refetch();
      } else {
        message.error(response.data.message || "Không thể cập nhật báo cáo");
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đã xảy ra lỗi khi cập nhật báo cáo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      const response = await api.delete(`/api/marketing/expenses/${id}`);

      if (response.data.success) {
        message.success("Đã xóa báo cáo thành công!");
        refetch();
      } else {
        message.error(response.data.message || "Không thể xóa báo cáo");
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đã xảy ra lỗi khi xóa báo cáo");
    }
  };

  const openEditModal = (record: DailyAdsRow) => {
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

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingReport(null);
    form.resetFields();
  };

  // Computed values - only use data when available
  const tableData: DailyAdsRow[] = data
    ? data.data.map((item, index) => {
        const dateParts = item.date.split("-");
        return {
          key: item.date || String(index),
          _id: (item as any).firstReportId || "",
          date: item.date,
          dateDisplay: `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`,
          xinSang: item.xinSang,
          xinChieu: item.xinChieu,
          xinGap: item.xinGap,
          tongTieu: item.tongTieu,
          tienDu: item.tienDu,
          totalRevenue: item.totalRevenue,
          percentAds: item.percentAds,
          status: (item as any).status || "",
        };
      })
    : [];

  // Paginated data
  const paginatedData =
    !pageSize || tableData.length <= pageSize
      ? tableData
      : tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const showPagination = pageSize > 0 && tableData.length > pageSize;

  const columns: ColumnsType<DailyAdsRow> = [
    {
      title: "Ngày",
      dataIndex: "dateDisplay",
      key: "dateDisplay",
      width: 100,
      fixed: "left",
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "Xin sáng",
      dataIndex: "xinSang",
      key: "xinSang",
      width: 140,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Xin chiều",
      dataIndex: "xinChieu",
      key: "xinChieu",
      width: 140,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Xin gấp",
      dataIndex: "xinGap",
      key: "xinGap",
      width: 130,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Tổng tiêu",
      dataIndex: "tongTieu",
      key: "tongTieu",
      width: 140,
      align: "right",
      render: (value: number) => (
        <span style={{ color: "#fa8c16", fontWeight: 600 }}>{formatNumber(value)}</span>
      ),
    },
    {
      title: "Tiền dư",
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
      title: "DS",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 150,
      align: "right",
      render: (value: number) => (
        <span style={{ color: "#13c2c2", fontWeight: 600 }}>{formatNumber(value)}</span>
      ),
    },
    {
      title: "%Ads",
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
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_: unknown, record: DailyAdsRow) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa báo cáo?"
            description="Bạn có chắc muốn xóa báo cáo này?"
            onConfirm={() => handleDeleteReport(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const showingMktName = isGlobal
    ? selectedMarketingEmployeeId
      ? marketingEmployeeOptions.find(
          (e) => e.value === selectedMarketingEmployeeId
        )?.label
      : "Tất cả MKT"
    : user?.fullName ?? "MKT của bạn";

  // Default summary values for empty/null state
  const defaultSummary = {
    tongXin: 0,
    tongTieu: 0,
    tienDu: 0,
    totalRevenue: 0,
    percentAds: 0,
    totalLeads: 0,
  };
  const summary = data?.summary ?? defaultSummary;

  return (
    <Card
      title="📊 Báo cáo Ads theo ngày"
      className={styles["mk-daily-report-card"]}
      extra={
        <Space size={12}>
          {isGlobal && (
            <Space size={8}>
              <UserOutlined style={{ color: "#8c8c8c" }} />
              <Select
                allowClear
                placeholder="Chọn MKT cụ thể"
                value={selectedMarketingEmployeeId}
                onChange={(v) => setSelectedMarketingEmployeeId(v)}
                options={[
                  { value: "__all__", label: "Tất cả MKT" },
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
            + Thêm báo cáo
          </Button>
        </Space>
      }
    >
      {/* Sub-header showing scope */}
      <div
        style={{
          marginBottom: 12,
          fontSize: 13,
          color: "#595959",
        }}
      >
        Đang xem: <strong>{showingMktName}</strong>
        {scope === "SELF" && (
          <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
            (chỉ báo cáo Ads của bạn)
          </span>
        )}
      </div>
      {/* Summary Stats */}
      <Row gutter={16} className={styles["mk-daily-report-summary"]}>
        <Col span={4}>
          <Statistic
            title="Tổng xin"
            value={summary.tongXin}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="Tổng tiêu"
            value={summary.tongTieu}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#fa8c16", fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="Tiền dư"
            value={summary.tienDu}
            formatter={(value) => formatNumber(Number(value))}
            styles={{
              content: {
                color: Number(summary.tienDu) >= 0 ? "#52c41a" : "#ff4d4f",
                fontSize: "18px",
              },
            }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="Doanh số"
            value={summary.totalRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#13c2c2", fontSize: "18px" } }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="%Ads"
            value={summary.percentAds}
            formatter={(value) => `${value}%`}
            styles={{
              content: {
                color: summary.percentAds <= 100 ? "#52c41a" : "#ff4d4f",
                fontSize: "18px",
              },
            }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="Tổng số khách hàng"
            value={summary.totalLeads}
            styles={{ content: { fontSize: "18px" } }}
          />
        </Col>
      </Row>

      {/* Daily Table */}
      {data && tableData.length > 0 ? (
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
                    `${range[0]}-${range[1]} / ${total} ngày`,
                }
              : false
          }
          size="small"
          scroll={{ x: 1100 }}
          className={styles["mk-daily-report-table"]}
          bordered
        />
      ) : (
        <Empty description="Chưa có dữ liệu báo cáo Ads" />
      )}

      {/* Add/Edit Report Modal */}
      <Modal
        title={isEditMode ? "📝 Sửa báo cáo Ads" : "📝 Thêm báo cáo Ads"}
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
              label="Ngày báo cáo"
              name="reportDate"
              rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày"
                disabledDate={(current) => current && current > dayjs().endOf("day")}
              />
            </Form.Item>
          )}

          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#1890ff" }}>XIN</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Xin sáng" name="xinSang" style={{ marginBottom: 8 }}>
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
                <Form.Item label="Xin chiều" name="xinChieu" style={{ marginBottom: 8 }}>
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
                <Form.Item label="Xin gấp" name="xinGap" style={{ marginBottom: 8 }}>
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
              <div style={{ fontWeight: 600, marginBottom: 12, color: "#fa8c16" }}>ĐÃ TIÊU</div>
              <Form.Item label="Tổng tiêu" name="tongTieu" style={{ marginBottom: 0 }}>
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
              <Button onClick={closeModal}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEditMode ? "Cập nhật" : "Thêm báo cáo"}
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
