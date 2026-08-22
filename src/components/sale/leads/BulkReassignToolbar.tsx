/**
 * Bulk Reassign Toolbar (Sprint 8.5)
 *
 * Toolbar for bulk reassigning leads to multiple sale employees.
 * Shows selected count and action buttons.
 */

import { useState, useEffect } from "react";
import { Button, Select, Space, Spin, App, Modal } from "antd";
import { UserSwitchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import api from "@/lib/axios";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface Employee {
  _id: string;
  employeeCode: string;
  name: string;
}

interface BulkReassignToolbarProps {
  selectedCount: number;
  selectedKeys: string[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export default function BulkReassignToolbar({
  selectedCount,
  selectedKeys,
  onClearSelection,
  onSuccess,
}: BulkReassignToolbarProps) {
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch employees
  useEffect(() => {
    if (selectedCount > 0) {
      fetchEmployees();
    }
  }, [selectedCount]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/employees?role=SALE&isActive=true&limit=100");
      setEmployees(response.data.data.items || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      message.error(t("Không thể tải danh sách nhân viên Sale", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (selectedEmployeeIds.length === 0) {
      message.warning(t("Vui lòng chọn ít nhất 1 nhân viên Sale", lang));
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/sale/leads/bulk-reassign", {
        leadIds: selectedKeys,
        saleEmployeeIds: selectedEmployeeIds,
      });
      message.success(t(`Đã phân công ${selectedKeys.length} đơn hàng cho ${selectedEmployeeIds.length} nhân viên`, lang));
      setConfirmOpen(false);
      onClearSelection();
      setSelectedEmployeeIds([]);
      onSuccess();
    } catch (err: unknown) {
      console.error("Bulk reassign failed:", err);
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t("Phân công thất bại", lang));
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: "#e6f7ff",
        borderRadius: 8,
        marginBottom: 16,
        border: "1px solid #91d5ff",
      }}
    >
      <Space>
        <CheckCircleOutlined style={{ color: "#1890ff", fontSize: 18 }} />
        <span style={{ fontWeight: 500 }}>
          {t("Đã chọn", lang)} <span style={{ color: "#1890ff", fontSize: 16 }}>{selectedCount}</span> {t("đơn hàng", lang)}
        </span>
        <Button size="small" onClick={onClearSelection}>
          {t("Bỏ chọn", lang)}
        </Button>
      </Space>

      <Space>
        <span style={{ fontWeight: 500, marginRight: 8 }}>{t("Phân công cho:", lang)}</span>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Select
            mode="multiple"
            style={{ minWidth: 300 }}
            placeholder={t("Chọn nhân viên Sale", lang)}
            value={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            showSearch
            optionFilterProp="label"
            maxTagCount={2}
            options={employees.map((emp) => ({
              value: emp._id,
              label: `${emp.name} (${emp.employeeCode})`,
            }))}
          />
        )}
        <Button
          type="primary"
          icon={<UserSwitchOutlined />}
          onClick={handleReassign}
          disabled={selectedEmployeeIds.length === 0}
          loading={submitting}
        >
          {t("Phân công", lang)}
        </Button>
      </Space>

      <Modal
        title={t("Xác nhận phân công hàng loạt", lang)}
        open={confirmOpen}
        onOk={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={submitting}
        okText={t("Xác nhận", lang)}
        cancelText={t("Hủy", lang)}
      >
        <p>
          {t("Bạn có chắc muốn phân công", lang)} <strong>{selectedKeys.length}</strong> {t("đơn hàng cho", lang)}{" "}
          <strong>{selectedEmployeeIds.length}</strong> {t("nhân viên Sale đã chọn?", lang)}
        </p>
        <p style={{ color: "#888", marginTop: 8 }}>
          {t("Mỗi khách hàng sẽ được phân công cho một nhân viên (phân theo vòng tròn).", lang)}
        </p>
      </Modal>
    </div>
  );
}
