"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Input, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import { useAreas } from "@/hooks/useAreas";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees as useEmployeesAll } from "@/hooks/useEmployees";
import { useAuthStore } from "@/store/auth.store";
import type { EmployeeListItem } from "@/hooks/useEmployees";
import AccountCreateDrawer from "@/components/accounts/AccountCreateDrawer";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function LeadersPage() {
  const user = useAuthStore((state) => state.user);
  const lang = useLanguageStore((s) => s.language);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading, error, refetch } = useEmployees({ pageSize: 200 });
  const { data: teamsData } = useTeams();
  const { data: areasData } = useAreas();
  const { data: departmentsData } = useDepartments();
  const { data: employeesData } = useEmployeesAll({ pageSize: 100 });

  const roleOptions = useMemo(() => [
    { value: "LEADER", label: "LEADER" },
  ], []);

  const teamOptions = useMemo(() => {
    const items = (teamsData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((t) => ({ value: t._id, label: `${t.code ?? ""} — ${t.name ?? ""}` }));
  }, [teamsData]);

  const areaOptions = useMemo(() => {
    const items = (areasData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((a) => ({ value: a._id, label: `${a.code ?? ""} — ${a.name ?? ""}` }));
  }, [areasData]);

  const departmentOptions = useMemo(() => {
    const items = (departmentsData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((d) => ({ value: d._id, label: `${d.code ?? ""} — ${d.name ?? ""}` }));
  }, [departmentsData]);

  const leaderOptions = useMemo(() => {
    const items = (employeesData ?? []) as unknown as Array<{ _id: string; fullName?: string; employeeCode?: string; role?: { code?: string } }>;
    return items.filter((e) => e.role?.code === "MANAGER" || e.role?.code === "ADMIN").map((e) => ({ value: e._id, label: `${e.fullName ?? ""} (${e.employeeCode ?? ""}) - ${e.role?.code ?? ""}` }));
  }, [employeesData]);

  const leaders = useMemo(() => {
    return (data ?? []).filter((e) => e.role?.code === "LEADER");
  }, [data]);

  const filteredData = useMemo(() => {
    if (!search) return leaders;
    const q = search.toLowerCase();
    return leaders.filter(
      (l) =>
        l.fullName?.toLowerCase().includes(q) ||
        l.employeeCode?.toLowerCase().includes(q) ||
        l.username?.toLowerCase().includes(q)
    );
  }, [leaders, search]);

  const columns = useMemo(() => [
    { title: "STT", render: (_: unknown, __: EmployeeListItem, index: number) => index + 1, width: 60 },
    {
      title: t("Avatar", lang),
      render: (_: unknown, item: EmployeeListItem) => (
        <Avatar src={item.avatar || undefined}>{item.fullName?.charAt(0)}</Avatar>
      ),
      width: 70,
    },
    { title: t("Mã NV", lang), dataIndex: "employeeCode", width: 110 },
    { title: t("Họ tên", lang), dataIndex: "fullName" },
    { title: t("Username", lang), dataIndex: "username" },
    { title: t("Email", lang), render: (_: unknown, item: EmployeeListItem) => item.email || "-" },
    { title: t("Phone", lang), render: (_: unknown, item: EmployeeListItem) => item.phone || "-" },
    {
      title: t("Team", lang),
      render: (_: unknown, item: EmployeeListItem) => {
        return item.team?.name ?? "-";
      },
    },
    {
      title: t("Trạng thái", lang),
      render: (_: unknown, item: EmployeeListItem) => (
        <Tag color={item.isActive ? "green" : "red"}>{item.isActive ? t("Hoạt động", lang) : t("Đã khóa", lang)}</Tag>
      ),
      width: 110,
    },
  ], [lang]);

  return (
    <div style={{ padding: 24 }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>{t("Quản lý Leaders", lang)}</Typography.Title>
          <Space>
            <Input.Search
              placeholder={t("Tìm kiếm leader", lang)}
              onSearch={setSearch}
              allowClear
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>{t("Làm mới", lang)}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t("Thêm Leader", lang)}</Button>
          </Space>
        </Space>
        {error && <Typography.Text type="danger">{t("Lỗi tải dữ liệu:", lang)} {(error as Error).message}</Typography.Text>}
        <div style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
          <Table
            rowKey="_id"
            loading={isLoading}
            dataSource={filteredData}
            columns={columns}
            pagination={{ total: filteredData.length, pageSize: 50, showTotal: (total) => `${t("Tổng", lang)} ${total} ${t("leader", lang)}` }}
            scroll={{ x: 900 }}
          />
        </div>

        <AccountCreateDrawer
          open={open}
          onClose={() => setOpen(false)}
          mode="create"
          selected={null}
          defaultValues={{ roleCode: "LEADER" }}
          roleOptions={roleOptions}
          teamOptions={teamOptions}
          departmentOptions={departmentOptions}
          leaderOptions={leaderOptions}
          areaOptions={areaOptions}
          onSuccess={() => void refetch()}
        />
      </Space>
    </div>
  );
}
