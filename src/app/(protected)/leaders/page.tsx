"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Space, Table, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import type { Employee } from "@/hooks/useEmployees";

export default function LeadersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useEmployees({ pageSize: 200 });

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
    { title: "STT", render: (_: unknown, __: Employee, index: number) => index + 1, width: 60 },
    {
      title: "Avatar",
      render: (_: unknown, item: Employee) => (
        <Avatar src={item.avatar || undefined}>{item.fullName?.charAt(0)}</Avatar>
      ),
      width: 70,
    },
    { title: "Mã NV", dataIndex: "employeeCode", width: 110 },
    { title: "Họ tên", dataIndex: "fullName" },
    { title: "Username", dataIndex: "username" },
    { title: "Email", render: (_: unknown, item: Employee) => item.email || "-" },
    { title: "Phone", render: (_: unknown, item: Employee) => item.phone || "-" },
    {
      title: "Team",
      render: (_: unknown, item: Employee) => {
        const code = typeof item.teamId === "object" ? (item.teamId as { code?: string })?.code : null;
        return code ?? "-";
      },
    },
    {
      title: "Trạng thái",
      render: (_: unknown, item: Employee) => (
        <Tag color={item.isActive ? "green" : "red"}>{item.isActive ? "Hoạt động" : "Đã khóa"}</Tag>
      ),
      width: 110,
    },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>Quản lý Leaders</Typography.Title>
          <Space>
            <Button
              placeholder="Tìm kiếm leader"
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250 }}
            >
              {search || "Tất cả leaders"}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>Làm mới</Button>
          </Space>
        </Space>
        {error && <Typography.Text type="danger">Lỗi tải dữ liệu: {(error as Error).message}</Typography.Text>}
        <div style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
          <Table
            rowKey="_id"
            loading={isLoading}
            dataSource={filteredData}
            columns={columns}
            pagination={{ total: filteredData.length, pageSize: 50, showTotal: (total) => `Tổng ${total} leader` }}
            scroll={{ x: 900 }}
          />
        </div>
      </Space>
    </div>
  );
}
