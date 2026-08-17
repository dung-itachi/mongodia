/**
 * Reassign Lead Modal (Sprint 8.5)
 *
 * Modal for Admin/Manager to reassign leads to different Sale employees.
 */

import { useState, useEffect } from "react";
import { Modal, Select, Spin, Alert } from "antd";
import { UserSwitchOutlined } from "@ant-design/icons";
import api from "@/lib/axios";
import type { SaleLead } from "@/hooks/useSaleLeads";
import { useMessage } from "@/contexts/MessageContext";

interface Employee {
  _id: string;
  employeeCode: string;
  name: string;
}

interface ReassignModalProps {
  open: boolean;
  lead: SaleLead | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReassignModal({
  open,
  lead,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const message = useMessage();

  // Fetch sale employees
  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

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

  const handleSubmit = async () => {
    if (!lead || !selectedEmployeeId) {
      message.warning("Vui lòng chọn nhân viên Sale");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/api/sale/leads/${lead._id}/reassign`, {
        saleEmployeeId: selectedEmployeeId,
      });
      message.success("Phân công thành công!");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error("Reassign failed:", err);
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || "Phân công thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployeeId(null);
    onClose();
  };

  const currentSaleName = lead?.saleEmployeeId?.name || lead?.saleEmployeeId?.employeeCode || "Chưa phân công";

  return (
    <Modal
      title={
        <span>
          <UserSwitchOutlined style={{ marginRight: 8 }} />
          Phân công Lead cho Sale
        </span>
      }
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Phân công"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
      width={500}
    >
      {lead && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            icon={<UserSwitchOutlined />}
            message={
              <div>
                <div><strong>Lead:</strong> {lead.leadCode} - {lead.customerName}</div>
                <div><strong>Điện thoại:</strong> {lead.phone || "-"}</div>
                <div><strong>Sale hiện tại:</strong> {currentSaleName}</div>
              </div>
            }
          />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Chọn nhân viên Sale:
        </label>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin /> Đang tải...
          </div>
        ) : (
          <Select
            style={{ width: "100%" }}
            placeholder="Chọn nhân viên Sale"
            value={selectedEmployeeId}
            onChange={setSelectedEmployeeId}
            showSearch
            optionFilterProp="label"
            options={employees.map((emp) => ({
              value: emp._id,
              label: `${emp.name} (${emp.employeeCode})`,
            }))}
          />
        )}
      </div>
    </Modal>
  );
}
