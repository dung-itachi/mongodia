/**
 * AssignSaleDrawer Component (Sprint 5.5.2 — Lead Assignment)
 *
 * Drawer form to assign a Sale employee to a Lead.
 * Uses AsyncSelect with debounced search for Sale employee list.
 */

import { useState, useEffect, useCallback } from "react";
import { message, Spin } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import type { SelectOption as AsyncSelectOption } from "@/components/common/inputs/AsyncSelect";
import type { MarketingLead } from "@/types/marketing-lead";

interface SaleEmployee {
  _id: string;
  employeeCode: string;
  fullName: string;
}

interface AssignSaleDrawerProps {
  open: boolean;
  lead: MarketingLead | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (saleEmployeeId: string) => Promise<void>;
}

export default function AssignSaleDrawer({
  open,
  lead,
  loading = false,
  onClose,
  onConfirm,
}: AssignSaleDrawerProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>(undefined);
  const [saleOptions, setSaleOptions] = useState<AsyncSelectOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedSaleId(undefined);
      setSaleOptions([]);
    }
  }, [open]);

  const searchSaleEmployees = useCallback(async (keyword: string) => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        role: "SALE",
        isActive: "true",
        pageSize: "50",
      });

      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }

      const res = await fetch(`/api/employees?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        message.error(json.message ?? "Không thể tải danh sách Sale");
        return;
      }

      const employees = json.data.items as SaleEmployee[];
      setSaleOptions(
        employees.map((emp) => ({
          label: `${emp.fullName} — ${emp.employeeCode}`,
          value: emp._id,
        }))
      );
    } catch {
      message.error("Lỗi kết nối khi tải danh sách Sale");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Initial load when drawer opens
  useEffect(() => {
    if (open) {
      void searchSaleEmployees("");
    }
  }, [open, searchSaleEmployees]);

  const handleConfirm = async () => {
    if (!selectedSaleId) {
      void message.error("Vui lòng chọn nhân viên Sale");
      return;
    }

    setConfirming(true);
    try {
      await onConfirm(selectedSaleId);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <DrawerForm
      open={open}
      title={`Phân công Sale — ${lead?.leadCode ?? ""}`}
      width={480}
      loading={confirming}
      onClose={onClose}
      onSubmit={handleConfirm}
      submitText="Phân công"
      cancelText="Hủy"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {lead && (
          <div style={{ padding: "12px 16px", background: "#fafafa", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#8c8c8c", marginBottom: 4 }}>
              Lead
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{lead.customerName}</div>
            <div style={{ fontSize: 13, color: "#8c8c8c" }}>{lead.phone ?? lead.email ?? "—"}</div>
          </div>
        )}

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Nhân viên Sale <span style={{ color: "#ff4d4f" }}>*</span>
          </label>
          {searchLoading && saleOptions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin size="small" />
              <div style={{ marginTop: 8, fontSize: 13, color: "#8c8c8c" }}>
                Đang tải danh sách Sale...
              </div>
            </div>
          ) : (
            <AsyncSelect
              value={selectedSaleId}
              onChange={(val) => setSelectedSaleId(val as string | undefined)}
              options={saleOptions}
              placeholder="Tìm và chọn nhân viên Sale..."
              searchable
              loading={searchLoading}
              minSearchChars={0}
              onSearch={(keyword) => {
                void searchSaleEmployees(keyword);
              }}
              style={{ width: "100%" }}
            />
          )}
        </div>
      </div>
    </DrawerForm>
  );
}
