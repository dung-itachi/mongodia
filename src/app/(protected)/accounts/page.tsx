"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Avatar, Button, DatePicker, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/store/auth.store";
import {
  useAccounts,
  useDisableAccount,
  useResetPassword,
  useUpdateAccount,
  type Account,
  type AccountInput,
} from "@/hooks/useAccounts";
import { useAreas } from "@/hooks/useAreas";
import { useDepartments } from "@/hooks/useDepartments";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import AccountCreateDrawer from "@/components/accounts/AccountCreateDrawer";
import {
  PageContainer,
  PageHeader,
} from "@/components/common";

export default function AccountsPage() {
  const user = useAuthStore((state) => state.user);
  const isGlobal = user?.permissions.includes("*") ?? false;
  const canCreate = isGlobal || (user?.permissions.includes("account.create") ?? false);
  const canUpdate = isGlobal || (user?.permissions.includes("account.update") ?? false);
  const canDisable = isGlobal || (user?.permissions.includes("account.disable") ?? false);
  const canResetPassword = isGlobal || (user?.permissions.includes("account.resetPassword") ?? false);

  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterCreated, setFilterCreated] = useState<[Dayjs, Dayjs] | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [draftData, setDraftData] = useState<AccountInput | null>(null);
  const [passwordForm] = Form.useForm<{ newPassword: string }>();
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = useAccounts({ search, pageSize: 100 });
  const { data: departmentsData } = useDepartments();
  const { data: teamsData } = useTeams();
  const { data: employeesData } = useEmployees({ pageSize: 100 });
  const { data: areasData } = useAreas();

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

  const areaOptions = useMemo(() => {
    const items = (areasData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((a) => ({ value: a._id, label: `${a.code ?? ""} — ${a.name ?? ""}` }));
  }, [areasData]);

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
    { title: "Khu vực", render: (_: unknown, item: Account) => item.area?.code ? <Tag color="green">{item.area.code}</Tag> : "-" },
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

  const accounts = data?.items ?? [];
  const totalAccounts = data?.total ?? 0;

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    if (filterTeam) {
      result = result.filter((a) => a.team?._id === filterTeam);
    }
    if (filterArea) {
      result = result.filter((a) => a.area?._id === filterArea || a.team?.areaId === filterArea);
    }
    if (filterCreated) {
      const [start, end] = filterCreated;
      result = result.filter((a) => {
        if (!a.createdAt) return false;
        const d = dayjs(a.createdAt);
        return d.isAfter(start) && d.isBefore(end) || d.isSame(start, "day") || d.isSame(end, "day");
      });
    }

    result.sort((a, b) => {
      const nameA = (a.fullName ?? a.username ?? "").toLowerCase();
      const nameB = (b.fullName ?? b.username ?? "").toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return result;
  }, [accounts, filterTeam, filterArea, filterCreated, sortOrder]);

  const activeAccounts = filteredAccounts.filter((a) => a.isActive).length;
  const lockedAccounts = filteredAccounts.filter((a) => !a.isActive).length;

  // Count by role
  const roleCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((acc) => {
      const role = acc.role?.code ?? "OTHER";
      map[role] = (map[role] || 0) + 1;
    });
    return map;
  }, [accounts]);

  const handleSaved = () => {
    setDraftData(null);
    setOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý tài khoản"
        subtitle={
          <span style={{ fontSize: 13, color: "#595959" }}>
            <span style={{ fontWeight: 700, color: "#1890ff", fontSize: 16 }}>{totalAccounts}</span> tài khoản
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#52c41a" }}>{activeAccounts}</span> hoạt động
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#ff4d4f" }}>{lockedAccounts}</span> bị khóa
          </span>
        }
        actions={
          <Space>
            <Input.Search
              placeholder="Username, họ tên, email, mã nhân viên"
              allowClear
              onSearch={setSearch}
              style={{ width: 280 }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters((v) => !v)}
              type={showFilters ? "primary" : "default"}
            >
              Lọc
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Tạo tài khoản
              </Button>
            )}
          </Space>
        }
      />

      {error && (
        <Typography.Text type="danger" style={{ marginBottom: 16, display: "block" }}>
          Lỗi tải dữ liệu: {(error as Error).message}. Vui lòng đăng xuất rồi đăng nhập lại.
        </Typography.Text>
      )}

      {showFilters && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #f0f0f0",
            padding: "16px 20px",
            marginBottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Team</div>
            <Select
              allowClear
              placeholder="Tất cả team"
              style={{ width: 200 }}
              options={teamOptions}
              value={filterTeam}
              onChange={setFilterTeam}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Khu vực</div>
            <Select
              allowClear
              placeholder="Tất cả khu vực"
              style={{ width: 180 }}
              options={areaOptions}
              value={filterArea}
              onChange={setFilterArea}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Ngày tạo</div>
            <DatePicker.RangePicker
              value={filterCreated}
              onChange={(dates) => setFilterCreated(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="DD/MM/YYYY"
              style={{ width: 260 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Sắp xếp</div>
            <Select
              value={sortOrder}
              onChange={setSortOrder}
              style={{ width: 140 }}
              options={[
                { value: "asc", label: "A → Z" },
                { value: "desc", label: "Z → A" },
              ]}
            />
          </div>
          <Button
            onClick={() => {
              setFilterTeam(null);
              setFilterArea(null);
              setFilterCreated(null);
              setSortOrder("asc");
            }}
          >
            Đặt lại
          </Button>
        </div>
      )}

      <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #f0f0f0" }}>
        <Table
          rowKey="_id"
          loading={isLoading}
          dataSource={filteredAccounts}
          columns={columns}
          pagination={{
            total: filteredAccounts.length,
            pageSize: 100,
            showTotal: (total) => `Hiển thị ${total} tài khoản`,
          }}
          scroll={{ x: 1400 }}
        />
      </div>

      <AccountCreateDrawer
        open={open}
        onClose={() => setOpen(false)}
        mode={mode}
        selected={selected}
        defaultValues={mode === "create" ? draftData ?? undefined : undefined}
        roleOptions={roleOptions}
        teamOptions={teamOptions}
        leaderOptions={leaderOptions}
        areaOptions={areaOptions}
        onSuccess={handleSaved}
      />

      <Drawer title="�ặt lại mật khẩu" open={passwordOpen} onClose={() => setPasswordOpen(false)} size="default">
        <Form form={passwordForm} layout="vertical" onFinish={({ newPassword }) => selected && reset.mutate({ id: selected._id, newPassword }, { onSuccess: () => setPasswordOpen(false) })}>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" loading={reset.isPending}>Xác nhận</Button>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
