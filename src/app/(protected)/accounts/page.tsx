"use client";

import dayjs, { type Dayjs } from "dayjs";
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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function AccountsPage() {
  const lang = useLanguageStore((s) => s.language);
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

  const departmentOptions = useMemo(() => {
    const items = (departmentsData ?? []) as unknown as Array<{ _id: string; code?: string; name?: string }>;
    return items.map((d) => ({ value: d._id, label: `${d.code ?? ""} — ${d.name ?? ""}` }));
  }, [departmentsData]);

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
    { title: t("STT", lang), render: (_: unknown, __: Account, index: number) => index + 1, width: 60 },
    { title: t("Avatar", lang), render: (_: unknown, item: Account) => <Avatar src={item.avatar || undefined}>{item.fullName?.charAt(0)}</Avatar>, width: 70 },
    { title: t("Mã NV", lang), dataIndex: "employeeCode", width: 110 },
    { title: t("Họ tên", lang), dataIndex: "fullName" },
    { title: t("Username", lang), dataIndex: "username" },
    { title: t("Email", lang), dataIndex: "email" },
    { title: t("Phone", lang), dataIndex: "phone" },
    { title: t("Role", lang), render: (_: unknown, item: Account) => <Tag color="blue">{item.role?.code ?? "-"}</Tag>, width: 110 },
    { title: t("Department", lang), render: (_: unknown, item: Account) => <Tag color="purple">{item.department?.name ?? item.team?.code ?? "-"}</Tag>, width: 130 },
    { title: t("Team", lang), dataIndex: "team", render: (_: unknown, item: Account) => item.team?.code ?? "-" },
    { title: t("Khu vực", lang), render: (_: unknown, item: Account) => item.area?.code ? <Tag color="green">{item.area.code}</Tag> : "-" },
    { title: t("Leader", lang), render: (_: unknown, item: Account) => item.leader?.fullName ?? "-" },
    { title: t("Trạng thái", lang), render: (_: unknown, item: Account) => <Tag color={item.isActive ? "green" : "red"}>{item.isActive ? t("Hoạt động", lang) : t("Đã khóa", lang)}</Tag>, width: 110 },
    {
      title: t("Thao tác", lang),
      render: (_: unknown, item: Account) => (
        <Space wrap>
          <Button size="small" onClick={() => openView(item)}>{t("Xem", lang)}</Button>
          {canUpdate && <Button size="small" onClick={() => openEdit(item)}>{t("Sửa", lang)}</Button>}
          {canDisable && <Popconfirm title={`${item.isActive ? t("Khóa", lang) : t("Mở khóa", lang)} ${t("tài khoản này?", lang)}`} onConfirm={() => disable.mutate({ id: item._id, isActive: !item.isActive })}><Button size="small" danger={item.isActive}>{item.isActive ? t("Khóa", lang) : t("Mở khóa", lang)}</Button></Popconfirm>}
          {canResetPassword && <Button size="small" onClick={() => { setSelected(item); passwordForm.resetFields(); setPasswordOpen(true); }}>{t("Reset password", lang)}</Button>}
        </Space>
      ),
    },
  ], [canUpdate, canDisable, canResetPassword, disable, passwordForm, lang]);

  const accounts = data?.items ?? [];
  const totalAccounts = data?.total ?? 0;

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    if (filterTeam) {
      result = result.filter((a) => a.team?._id === filterTeam);
    }
    if (filterArea) {
      result = result.filter((a) => a.area?._id === filterArea);
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
        title={t("Quản lý tài khoản", lang)}
        subtitle={
          <span style={{ fontSize: 13, color: "#595959" }}>
            <span style={{ fontWeight: 700, color: "#1890ff", fontSize: 16 }}>{totalAccounts}</span> {t("tài khoản", lang)}
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#52c41a" }}>{activeAccounts}</span> {t("hoạt động", lang)}
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#ff4d4f" }}>{lockedAccounts}</span> {t("bị khóa", lang)}
          </span>
        }
        actions={
          <Space>
            <Input.Search
              placeholder={t("Username, họ tên, email, mã nhân viên", lang)}
              allowClear
              onSearch={setSearch}
              style={{ width: 280 }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters((v) => !v)}
              type={showFilters ? "primary" : "default"}
            >
              {t("Lọc", lang)}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t("Tạo tài khoản", lang)}
              </Button>
            )}
          </Space>
        }
      />

      {error && (
        <Typography.Text type="danger" style={{ marginBottom: 16, display: "block" }}>
          {t("Lỗi tải dữ liệu:", lang)} {(error as Error).message}. {t("Vui lòng đăng xuất rồi đăng nhập lại.", lang)}
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
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>{t("Team", lang)}</div>
            <Select
              allowClear
              placeholder={t("Tất cả team", lang)}
              style={{ width: 200 }}
              options={teamOptions}
              value={filterTeam}
              onChange={setFilterTeam}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>{t("Khu vực", lang)}</div>
            <Select
              allowClear
              placeholder={t("Tất cả khu vực", lang)}
              style={{ width: 180 }}
              options={areaOptions}
              value={filterArea}
              onChange={setFilterArea}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>{t("Ngày tạo", lang)}</div>
            <DatePicker.RangePicker
              value={filterCreated}
              onChange={(dates) => setFilterCreated(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="DD/MM/YYYY"
              style={{ width: 260 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>{t("Sắp xếp", lang)}</div>
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
            {t("Đặt lại", lang)}
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
            showTotal: (total) => `${t("Hiển thị", lang)} ${total} ${t("tài khoản", lang)}`,
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
        departmentOptions={departmentOptions}
        leaderOptions={leaderOptions}
        areaOptions={areaOptions}
        onSuccess={handleSaved}
      />

      <Drawer title={t("Đặt lại mật khẩu", lang)} open={passwordOpen} onClose={() => setPasswordOpen(false)} size="default">
        <Form form={passwordForm} layout="vertical" onFinish={({ newPassword }) => selected && reset.mutate({ id: selected._id, newPassword }, { onSuccess: () => setPasswordOpen(false) })}>
          <Form.Item name="newPassword" label={t("Mật khẩu mới", lang)} rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" loading={reset.isPending}>{t("Xác nhận", lang)}</Button>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
