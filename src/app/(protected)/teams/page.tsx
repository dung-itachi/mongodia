"use client";

import { useMemo, useState } from "react";
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { useTeams } from "@/hooks/useTeams";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { useAreas } from "@/hooks/useAreas";
import { useAntApp } from "@/providers/AntdProvider";
import api from "@/lib/axios";
import {
  PageContainer,
  PageHeader,
  PageStatsBanner,
} from "@/components/common";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

type Team = {
  _id: string;
  code: string;
  name: string;
  departmentId?: { _id?: string; code?: string; name?: string } | null;
  areaId?: { _id?: string; code?: string; name?: string } | null;
  leaderId?: { _id?: string; fullName?: string } | null;
  managerId?: { _id?: string; fullName?: string } | null;
  isActive?: boolean;
  createdAt?: string;
};

export default function TeamsPage() {
  const { message } = useAntApp();
  const lang = useLanguageStore((s) => s.language);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [draftData, setDraftData] = useState<{ code?: string; name?: string; departmentCode?: string; areaCode?: string; leaderCode?: string; managerCode?: string } | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { data, isLoading, error, refetch } = useTeams();
  const { data: departmentsData } = useDepartments();
  const { data: employeesData } = useEmployees({ pageSize: 200 });
  const { data: areasData } = useAreas();

  // Calculate team stats
  const teams = data ?? [];
  const totalTeams = teams.length;
  const activeTeams = teams.filter((t) => t.isActive !== false).length;
  const inactiveTeams = teams.filter((t) => t.isActive === false).length;
  const totalLeaders = teams.filter((t) => t.leaderId).length;
  const totalManagers = teams.filter((t) => t.managerId).length;

  const departmentOptions = useMemo(() => {
    return (departmentsData ?? []).map((d: { _id: string; code?: string; name?: string }) => ({
      value: d.code ?? d._id,
      label: `${d.code ?? ""} — ${d.name ?? ""}`,
    }));
  }, [departmentsData]);

  const areaOptions = useMemo(() => {
    return (areasData ?? []).map((a: { _id: string; code?: string; name?: string }) => ({
      value: a.code ?? a._id,
      label: `${a.code ?? ""} — ${a.name ?? ""}`,
    }));
  }, [areasData]);

  const leaderOptions = useMemo(() => {
    const leaders = (employeesData ?? []).filter((e: { role?: { code?: string } }) => e.role?.code === "LEADER");
    return leaders.map((e: { _id: string; fullName?: string; employeeCode?: string }) => ({
      value: e.employeeCode ?? e._id,
      label: `${e.fullName ?? ""} (${e.employeeCode ?? e._id})`,
    }));
  }, [employeesData]);

  const managerOptions = useMemo(() => {
    const managers = (employeesData ?? []).filter((e: { role?: { code?: string } }) => e.role?.code === "MANAGER");
    return managers.map((e: { _id: string; fullName?: string; employeeCode?: string }) => ({
      value: e.employeeCode ?? e._id,
      label: `${e.fullName ?? ""} (${e.employeeCode ?? e._id})`,
    }));
  }, [employeesData]);

  const filteredData = useMemo(() => {
    if (!search) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (t) =>
        t.code?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.departmentId?.name?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const columns = useMemo(() => [
    { title: "STT", render: (_: unknown, __: Team, index: number) => index + 1, width: 60 },
    { title: t("Mã Team", lang), dataIndex: "code", width: 120 },
    { title: t("Tên Team", lang), dataIndex: "name" },
    { title: t("Phòng ban", lang), render: (_: unknown, item: Team) => item.departmentId?.name ?? "-" },
    { title: t("Khu vực", lang), render: (_: unknown, item: Team) => item.areaId?.name ?? "-" },
    { title: t("Trưởng nhóm (Leader)", lang), render: (_: unknown, item: Team) => item.leaderId?.fullName ?? "-" },
    { title: t("Quản lý (Manager)", lang), render: (_: unknown, item: Team) => item.managerId?.fullName ?? "-" },
    { title: t("Trạng thái", lang), render: (_: unknown, item: Team) => <Tag color={item.isActive !== false ? "green" : "red"}>{item.isActive !== false ? t("Hoạt động", lang) : t("Không hoạt động", lang)}</Tag>, width: 130 },
    {
      title: t("Thao tác", lang),
      render: (_: unknown, item: Team) => (
        <Space>
          <Button size="small" onClick={() => openView(item)}>{t("Xem", lang)}</Button>
          <Button size="small" onClick={() => openEdit(item)}>{t("Sửa", lang)}</Button>
          <Popconfirm title={t("Xóa team này?", lang)} onConfirm={() => handleDelete(item._id)}>
            <Button size="small" danger>{t("Xóa", lang)}</Button>
          </Popconfirm>
        </Space>
      ),
      width: 180,
    },
  ], [lang]);

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    if (draftData) {
      form.setFieldsValue(draftData);
    } else {
      form.resetFields();
    }
    setOpen(true);
  };

  const openView = (team: Team) => {
    setSelected(team);
    setMode("view");
    setOpen(true);
  };

  const openEdit = (team: Team) => {
    setDraftData(null);
    setSelected(team);
    setMode("edit");
    form.setFieldsValue({
      code: team.code,
      name: team.name,
      departmentCode: team.departmentId?.code,
      areaCode: (team as { areaId?: { code?: string } }).areaId?.code,
      leaderCode: team.leaderId && typeof team.leaderId === "object" ? team.leaderId.fullName ? team.leaderId.fullName : undefined : undefined,
      managerCode: team.managerId && typeof team.managerId === "object" ? team.managerId.fullName ? team.managerId.fullName : undefined : undefined,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/api/teams/${id}`);
      message.success(t("Xóa thành công", lang));
      void refetch();
    } catch {
      message.error(t("Xóa thất bại", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { code: string; name: string; departmentCode: string; areaCode?: string; leaderCode?: string; managerCode?: string }) => {
    try {
      setLoading(true);
      const payload = {
        code: values.code,
        name: values.name,
        departmentCode: values.departmentCode,
        areaCode: values.areaCode || "DEFAULT",
        leaderCode: values.leaderCode || null,
        managerCode: values.managerCode || null,
      };
      if (mode === "create") {
        await api.post("/api/teams", payload);
        message.success(t("Tạo team thành công", lang));
        setDraftData(null);
      } else if (selected) {
        await api.put(`/api/teams/${selected._id}`, payload);
        message.success(t("Cập nhật thành công", lang));
      }
      setOpen(false);
      void refetch();
    } catch (e) {
      message.error((e as Error).message ?? t("Thao tác thất bại", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    if (mode === "create") {
      const values = form.getFieldsValue(true);
      setDraftData(values);
    }
    setOpen(false);
  };

  const drawerTitle = mode === "create" ? t("Tạo Team", lang) : mode === "edit" ? t("Cập nhật Team", lang) : t("Chi tiết Team", lang);

  return (
    <PageContainer>
      <PageHeader
        title={t("Quản lý Teams", lang)}
        subtitle={`${totalTeams} ${t("teams trong hệ thống", lang)}`}
        actions={
          <Space>
            <Input.Search
              placeholder={t("Mã team, tên team", lang)}
              allowClear
              onSearch={setSearch}
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t("Tạo Team", lang)}
            </Button>
          </Space>
        }
      />

      {/* Stats Banner */}
      <PageStatsBanner
        stats={[
          {
            key: "total",
            value: totalTeams,
            label: t("Tổng Teams", lang),
            icon: <TeamOutlined style={{ color: "#1890ff" }} />,
            color: "blue",
          },
          {
            key: "active",
            value: activeTeams,
            label: t("Đang hoạt động", lang),
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            color: "green",
          },
          {
            key: "inactive",
            value: inactiveTeams,
            label: t("Không hoạt động", lang),
            icon: <StopOutlined style={{ color: "#ff4d4f" }} />,
            color: "red",
          },
          {
            key: "leaders",
            value: totalLeaders,
            label: t("Có Trưởng nhóm", lang),
            icon: <CrownOutlined style={{ color: "#722ed1" }} />,
            color: "purple",
          },
          {
            key: "managers",
            value: totalManagers,
            label: t("Có Quản lý", lang),
            icon: <TeamOutlined style={{ color: "#fa8c16" }} />,
            color: "orange",
          },
        ]}
        loading={isLoading}
        style={{ marginBottom: 16 }}
      />

      {error && (
        <Typography.Text type="danger" style={{ marginBottom: 16, display: "block" }}>
          {t("Lỗi tải dữ liệu:", lang)} {(error as Error).message}
        </Typography.Text>
      )}

      <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #f0f0f0" }}>
        <Table
          rowKey="_id"
          loading={isLoading}
          dataSource={filteredData}
          columns={columns}
          pagination={{
            total: filteredData.length,
            pageSize: 50,
            showTotal: (total) => `${t("Tổng", lang)} ${total} ${t("team", lang)}`,
          }}
          scroll={{ x: 900 }}
        />
      </div>

      <Drawer title={drawerTitle} open={open} onClose={handleCloseDrawer} size="default">
        {mode === "view" && selected ? (
          <Space orientation="vertical">
            <p><b>{t("Mã Team:", lang)}</b> {selected.code}</p>
            <p><b>{t("Tên Team:", lang)}</b> {selected.name}</p>
            <p><b>{t("Phòng ban:", lang)}</b> {selected.departmentId?.name ?? "-"}</p>
            <p><b>{t("Khu vực:", lang)}</b> {(selected as { areaId?: { name?: string } }).areaId?.name ?? "-"}</p>
            <p><b>{t("Trưởng nhóm (Leader):", lang)}</b> {selected.leaderId?.fullName ?? "-"}</p>
            <p><b>{t("Quản lý (Manager):", lang)}</b> {selected.managerId?.fullName ?? "-"}</p>
            <p><b>{t("Trạng thái:", lang)}</b> <Tag color={selected.isActive !== false ? "green" : "red"}>{selected.isActive !== false ? t("Hoạt động", lang) : t("Không hoạt động", lang)}</Tag></p>
            <p><b>{t("Ngày tạo:", lang)}</b> {selected.createdAt ?? "-"}</p>
          </Space>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="code" label={t("Mã Team", lang)} rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item name="name" label={t("Tên Team", lang)} rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item name="departmentCode" label={t("Phòng ban", lang)} rules={[{ required: true }]}>
              <Select options={departmentOptions} placeholder={t("Chọn phòng ban", lang)} />
            </Form.Item>
            <Form.Item name="areaCode" label={t("Khu vực", lang)}>
              <Select options={areaOptions} allowClear placeholder={t("Chọn khu vực", lang)} />
            </Form.Item>
            <Form.Item name="leaderCode" label={t("Trưởng nhóm (Leader)", lang)}>
              <Select options={leaderOptions} allowClear placeholder={t("Chọn leader", lang)} showSearch filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item name="managerCode" label={t("Quản lý (Manager)", lang)}>
              <Select options={managerOptions} allowClear placeholder={t("Chọn manager", lang)} showSearch filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" loading={loading}>{mode === "create" ? t("Tạo Team", lang) : t("Lưu thay đổi", lang)}</Button></Form.Item>
          </Form>
        )}
      </Drawer>
    </PageContainer>
  );
}
