"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Drawer, Form, Input, Popconfirm, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/auth.store";
import { useAccounts, useDisableAccount, useResetPassword, useUpdateAccount, type Account, type AccountInput } from "@/hooks/useAccounts";
import { useDepartments } from "@/hooks/useDepartments";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import AccountCreateDrawer from "@/components/accounts/AccountCreateDrawer";

export default function AccountsPage() {
  const user = useAuthStore((state) => state.user);
  const isGlobal = user?.permissions.includes("*") ?? false;
  const canCreate = isGlobal || (user?.permissions.includes("account.create") ?? false);
  const canUpdate = isGlobal || (user?.permissions.includes("account.update") ?? false);
  const canDisable = isGlobal || (user?.permissions.includes("account.disable") ?? false);
  const canResetPassword = isGlobal || (user?.permissions.includes("account.resetPassword") ?? false);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [draftData, setDraftData] = useState<AccountInput | null>(null);
  const [passwordForm] = Form.useForm<{ newPassword: string }>();

  const { data, isLoading, error, refetch } = useAccounts({ search, pageSize: 100 });
  const { data: departmentsData } = useDepartments();
  const { data: teamsData } = useTeams();
  const { data: employeesData } = useEmployees({ pageSize: 100 });

  const update = useUpdateAccount();
  const disable = useDisableAccount();
  const reset = useResetPassword();

  const roleOptions = useMemo(() => {
    const scope = user?.role ?? "";
    if (scope === "ADMIN" || isGlobal) {
      return [
        { value: "MANAGER", label: "MANAGER" },
        { value: "LEADER", label: "LEADER" },
        { value: "SALE", label: "SALE" },
        { value: "MKT", label: "MKT" },
        { value: "WAREHOUSE", label: "WAREHOUSE" },
        { value: "EMPLOYEE", label: "EMPLOYEE" },
      ];
    }
    if (scope === "MANAGER") {
      return [
        { value: "LEADER", label: "LEADER" },
        { value: "SALE", label: "SALE" },
        { value: "MKT", label: "MKT" },
        { value: "WAREHOUSE", label: "WAREHOUSE" },
        { value: "EMPLOYEE", label: "EMPLOYEE" },
      ];
    }
    if (scope === "LEADER") {
      return [
        { value: "SALE", label: "SALE" },
        { value: "MKT", label: "MKT" },
        { value: "WAREHOUSE", label: "WAREHOUSE" },
        { value: "EMPLOYEE", label: "EMPLOYEE" },
      ];
    }
    return [];
  }, [user?.role, isGlobal]);

  const teamOptions = useMemo(() => {
    const items = (teamsData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((t) => ({ value: t._id, label: `${t.code ?? ""} — ${t.name ?? ""}` }));
  }, [teamsData]);

  const leaderOptions = useMemo(() => {
    const items = (employeesData ?? []) as unknown as Array<{ _id: string; fullName?: string; employeeCode?: string; role?: { code?: string } }>;
    return items.filter((e) => e.role?.code === "LEADER").map((e) => ({ value: e._id, label: `${e.fullName ?? ""} (${e.employeeCode ?? ""})` }));
  }, [employeesData]);

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setOpen(true);
  };
  const openView = (account: Account) => { setSelected(account); setMode("view"); setOpen(true); };
  const openEdit = (account: Account) => {
    setSelected(account);
    setMode("edit");
    setOpen(true);
  };

  const columns = useMemo(() => [
    { title: "STT", render: (_: unknown, __: Account, index: number) => index + 1, width: 60 },
    { title: "Avatar", render: (_: unknown, item: Account) => <Avatar src={item.avatar || undefined}>{item.fullName?.charAt(0)}</Avatar>, width: 70 },
    { title: "Mã NV", dataIndex: "employeeCode", width: 110 },
    { title: "Họ tên", dataIndex: "fullName" },
    { title: "Username", dataIndex: "username" },
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Role", render: (_: unknown, item: Account) => <Tag color="blue">{item.role?.code ?? "-"}</Tag>, width: 110 },
    { title: "Department", render: (_: unknown, item: Account) => <Tag color="purple">{item.department?.name ?? item.team?.code ?? "-"}</Tag>, width: 130 },
    { title: "Team", dataIndex: "team", render: (_: unknown, item: Account) => item.team?.code ?? "-" },
    { title: "Leader", render: (_: unknown, item: Account) => item.leader?.fullName ?? "-" },
    { title: "Trạng thái", render: (_: unknown, item: Account) => <Tag color={item.isActive ? "green" : "red"}>{item.isActive ? "Hoạt động" : "Đã khóa"}</Tag>, width: 110 },
    {
      title: "Thao tác",
      render: (_: unknown, item: Account) => (
        <Space wrap>
          <Button size="small" onClick={() => openView(item)}>Xem</Button>
          {canUpdate && <Button size="small" onClick={() => openEdit(item)}>Sửa</Button>}
          {canDisable && <Popconfirm title={`${item.isActive ? "Khóa" : "Mở khóa"} tài khoản này?`} onConfirm={() => disable.mutate({ id: item._id, isActive: !item.isActive })}><Button size="small" danger={item.isActive}>{item.isActive ? "Khóa" : "Mở khóa"}</Button></Popconfirm>}
          {canResetPassword && <Button size="small" onClick={() => { setSelected(item); passwordForm.resetFields(); setPasswordOpen(true); }}>Reset password</Button>}
        </Space>
      ),
    },
  ], [canUpdate, canDisable, canResetPassword, disable, passwordForm]);

  const handleSaved = () => {
    setDraftData(null);
    setOpen(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>Quản lý tài khoản</Typography.Title>
          <Space>
            <Input.Search placeholder="Username, họ tên, email, mã nhân viên" allowClear onSearch={setSearch} style={{ width: 300 }} />
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo tài khoản</Button>}
          </Space>
        </Space>
        {error && <Typography.Text type="danger">Lỗi tải dữ liệu: {(error as Error).message}. Vui lòng đăng xuất rồi đăng nhập lại.</Typography.Text>}
        <div style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
          <Table rowKey="_id" loading={isLoading} dataSource={data?.items ?? []} columns={columns} pagination={{ total: data?.total, pageSize: 100, showTotal: (total) => `Tổng ${total} tài khoản` }} scroll={{ x: 1400 }} />
        </div>
      </Space>

      <AccountCreateDrawer
        open={open}
        onClose={() => setOpen(false)}
        mode={mode}
        selected={selected}
        defaultValues={mode === "create" ? draftData ?? undefined : undefined}
        roleOptions={roleOptions}
        teamOptions={teamOptions}
        leaderOptions={leaderOptions}
        onSuccess={handleSaved}
      />

      <Drawer title="Đặt lại mật khẩu" open={passwordOpen} onClose={() => setPasswordOpen(false)} size="default">
        <Form form={passwordForm} layout="vertical" onFinish={({ newPassword }) => selected && reset.mutate({ id: selected._id, newPassword }, { onSuccess: () => setPasswordOpen(false) })}>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" loading={reset.isPending}>Xác nhận</Button>
        </Form>
      </Drawer>
    </div>
  );
}
