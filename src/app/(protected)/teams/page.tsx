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
    { title: "Mã Team", dataIndex: "code", width: 120 },
    { title: "Tên Team", dataIndex: "name" },
    { title: "Phòng ban", render: (_: unknown, item: Team) => item.departmentId?.name ?? "-" },
    { title: "Khu vực", render: (_: unknown, item: Team) => item.areaId?.name ?? "-" },
    { title: "Trưởng nhóm (Leader)", render: (_: unknown, item: Team) => item.leaderId?.fullName ?? "-" },
    { title: "Quản lý (Manager)", render: (_: unknown, item: Team) => item.managerId?.fullName ?? "-" },
    { title: "Trạng thái", render: (_: unknown, item: Team) => <Tag color={item.isActive !== false ? "green" : "red"}>{item.isActive !== false ? "Hoạt động" : "Không hoạt động"}</Tag>, width: 130 },
    {
      title: "Thao tác",
      render: (_: unknown, item: Team) => (
        <Space>
          <Button size="small" onClick={() => openView(item)}>Xem</Button>
          <Button size="small" onClick={() => openEdit(item)}>Sửa</Button>
          <Popconfirm title="Xóa team này?" onConfirm={() => handleDelete(item._id)}>
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
      width: 180,
    },
  ], []);

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
      message.success("Xóa thành công");
      void refetch();
    } catch {
      message.error("Xóa thất bại");
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
        message.success("Tạo team thành công");
        setDraftData(null);
      } else if (selected) {
        await api.put(`/api/teams/${selected._id}`, payload);
        message.success("Cập nhật thành công");
      }
      setOpen(false);
      void refetch();
    } catch (e) {
      message.error((e as Error).message ?? "Thao tác thất bại");
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

  const drawerTitle = mode === "create" ? "Tạo Team" : mode === "edit" ? "Cập nhật Team" : "Chi tiết Team";

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Teams"
        subtitle={`${totalTeams} teams trong hệ thống`}
        actions={
          <Space>
            <Input.Search
              placeholder="Mã team, tên team"
              allowClear
              onSearch={setSearch}
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo Team
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
            label: "Tổng Teams",
            icon: <TeamOutlined style={{ color: "#1890ff" }} />,
            color: "blue",
          },
          {
            key: "active",
            value: activeTeams,
            label: "Đang hoạt động",
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            color: "green",
          },
          {
            key: "inactive",
            value: inactiveTeams,
            label: "Không hoạt động",
            icon: <StopOutlined style={{ color: "#ff4d4f" }} />,
            color: "red",
          },
          {
            key: "leaders",
            value: totalLeaders,
            label: "Có Trưởng nhóm",
            icon: <CrownOutlined style={{ color: "#722ed1" }} />,
            color: "purple",
          },
          {
            key: "managers",
            value: totalManagers,
            label: "Có Quản lý",
            icon: <TeamOutlined style={{ color: "#fa8c16" }} />,
            color: "orange",
          },
        ]}
        loading={isLoading}
        style={{ marginBottom: 16 }}
      />

      {error && (
        <Typography.Text type="danger" style={{ marginBottom: 16, display: "block" }}>
          Lỗi tải dữ liệu: {(error as Error).message}
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
            showTotal: (total) => `Tổng ${total} team`,
          }}
          scroll={{ x: 900 }}
        />
      </div>

      <Drawer title={drawerTitle} open={open} onClose={handleCloseDrawer} size="default">
        {mode === "view" && selected ? (
          <Space orientation="vertical">
            <p><b>Mã Team:</b> {selected.code}</p>
            <p><b>Tên Team:</b> {selected.name}</p>
            <p><b>Phòng ban:</b> {selected.departmentId?.name ?? "-"}</p>
            <p><b>Khu vực:</b> {(selected as { areaId?: { name?: string } }).areaId?.name ?? "-"}</p>
            <p><b>Trưởng nhóm (Leader):</b> {selected.leaderId?.fullName ?? "-"}</p>
            <p><b>Quản lý (Manager):</b> {selected.managerId?.fullName ?? "-"}</p>
            <p><b>Trạng thái:</b> <Tag color={selected.isActive !== false ? "green" : "red"}>{selected.isActive !== false ? "Hoạt động" : "Không hoạt động"}</Tag></p>
            <p><b>Ngày tạo:</b> {selected.createdAt ?? "-"}</p>
          </Space>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="code" label="Mã Team" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên Team" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
            <Form.Item name="departmentCode" label="Phòng ban" rules={[{ required: true }]}>
              <Select options={departmentOptions} placeholder="Chọn phòng ban" />
            </Form.Item>
            <Form.Item name="areaCode" label="Khu vực">
              <Select options={areaOptions} allowClear placeholder="Chọn khu vực" />
            </Form.Item>
            <Form.Item name="leaderCode" label="Trưởng nhóm (Leader)">
              <Select options={leaderOptions} allowClear placeholder="Chọn leader" showSearch filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item name="managerCode" label="Quản lý (Manager)">
              <Select options={managerOptions} allowClear placeholder="Chọn manager" showSearch filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" loading={loading}>{mode === "create" ? "Tạo Team" : "Lưu thay đổi"}</Button></Form.Item>
          </Form>
        )}
      </Drawer>
    </PageContainer>
  );
}
