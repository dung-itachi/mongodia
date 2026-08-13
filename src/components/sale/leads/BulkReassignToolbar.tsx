/**
 * Bulk Reassign Toolbar (Sprint 8.5)
 *
 * Toolbar for bulk reassigning leads to multiple sale employees.
 * Shows selected count and action buttons.
 */

import { useState, useEffect } from "react";
import { Button, Select, Space, Spin, message, Modal } from "antd";
import { UserSwitchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import api from "@/lib/axios";

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
      message.error("Không thể tải danh sách nhân viên Sale");
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (selectedEmployeeIds.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 nhân viên Sale");
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
      message.success(`Đã phân công ${selectedKeys.length} lead cho ${selectedEmployeeIds.length} nhân viên`);
      setConfirmOpen(false);
      onClearSelection();
      setSelectedEmployeeIds([]);
      onSuccess();
    } catch (err: unknown) {
      console.error("Bulk reassign failed:", err);
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || "Phân công thất bại");
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
          Đã chọn <span style={{ color: "#1890ff", fontSize: 16 }}>{selectedCount}</span> lead
        </span>
        <Button size="small" onClick={onClearSelection}>
          Bỏ chọn
        </Button>
      </Space>

      <Space>
        <span style={{ fontWeight: 500, marginRight: 8 }}>Phân công cho:</span>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Select
            mode="multiple"
            style={{ minWidth: 300 }}
            placeholder="Chọn nhân viên Sale"
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
          Phân công
        </Button>
      </Space>

      <Modal
        title="Xác nhận phân công hàng loạt"
        open={confirmOpen}
        onOk={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={submitting}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>
          Bạn có chắc muốn phân công <strong>{selectedKeys.length}</strong> lead cho{" "}
          <strong>{selectedEmployeeIds.length}</strong> nhân viên Sale đã chọn?
        </p>
        <p style={{ color: "#888", marginTop: 8 }}>
          Mỗi lead sẽ được phân công cho một nhân viên (phân theo vòng tròn).
        </p>
      </Modal>
    </div>
  );
}
