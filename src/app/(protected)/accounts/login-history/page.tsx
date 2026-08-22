"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import {
  useLoginHistory,
  type LoginHistoryItem,
} from "@/hooks/useLoginHistory";
import { PageContainer, PageHeader } from "@/components/common";
import SuspiciousLoginConfirmModal from "@/components/notifications/SuspiciousLoginConfirmModal";

dayjs.extend(relativeTime);

type Option = { value: string; label: string };

export default function LoginHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    user?.role?.code === "ADMIN" || user?.permissions.includes("*");
  const canViewAll =
    isAdmin || (user?.permissions.includes("login-history.viewAll") ?? false);

  const [search, setSearch] = useState("");
  const [filterSuccess, setFilterSuccess] = useState<boolean | null>(null);
  const [filterDate, setFilterDate] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    item: LoginHistoryItem | null;
  }>({ visible: false, item: null });

  // Non-admin users only see their own history
  const employeeId = canViewAll ? filterEmployee || undefined : user?.employeeId;

  const { data, isLoading, error, refetch } = useLoginHistory({
    search: search || undefined,
    success: filterSuccess ?? undefined,
    startDate: filterDate ? filterDate[0].toISOString() : undefined,
    endDate: filterDate ? filterDate[1].toISOString() : undefined,
    areaId: filterArea || undefined,
    teamId: filterTeam || undefined,
    employeeId,
    pageSize: 100,
  });

  // Fetch areas for filter
  const { data: areasData } = useQuery({
    queryKey: ["areas-list"],
    queryFn: async () => {
      const res = await api.get("/api/areas");
      return res.data.data.items as Option[];
    },
    enabled: canViewAll,
  });

  // Fetch teams for filter
  const { data: teamsData } = useQuery({
    queryKey: ["teams-list", filterArea],
    queryFn: async () => {
      const res = await api.get("/api/teams");
      const items = res.data.data.items as any[];
      // Filter by area if selected
      const filtered = filterArea
        ? items.filter((t: any) => t.areaId?._id === filterArea || t.area?._id === filterArea)
        : items;
      return filtered.map((t: any) => ({ value: t._id, label: `${t.code} - ${t.name}` }));
    },
    enabled: canViewAll,
  });

  // Fetch employees for filter
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list", filterArea, filterTeam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterArea) params.set("areaId", filterArea);
      if (filterTeam) params.set("teamId", filterTeam);
      const res = await api.get(`/api/employees?${params.toString()}`);
      const items = res.data.data.items as any[];
      return items.map((e: any) => ({ value: e._id, label: `${e.employeeCode} - ${e.fullName}` }));
    },
    enabled: canViewAll,
  });

  const queryClient = useQueryClient();

  // Mutation to confirm login as trusted
  const confirmMutation = useMutation({
    mutationFn: async ({ id, isTrusted }: { id: string; isTrusted: boolean }) => {
      const res = await api.put(`/api/login-history/${id}?id=${id}`, { isTrusted });
      return res.data;
    },
    onSuccess: () => {
      message.success("Đã xác nhận đăng nhập tin cậy");
      setConfirmModal({ visible: false, item: null });
      void queryClient.invalidateQueries({ queryKey: ["login-history"] });
    },
    onError: () => {
      message.error("Không thể xác nhận");
    },
  });

  const items = data?.items ?? [];

  // Determine status for each item
  const getItemStatus = (item: LoginHistoryItem) => {
    if (!item.success) return "failed";
    if (item.isTrusted) return "trusted";
    if (item.anomalyReason) return "warning";
    return "normal";
  };

  const columns = useMemo(
    () => [
      {
        title: "STT",
        render: (_: unknown, __: LoginHistoryItem, index: number) =>
          index + 1,
        width: 60,
      },
      {
        title: "Trạng thái",
        render: (_: unknown, item: LoginHistoryItem) => {
          const status = getItemStatus(item);
          switch (status) {
            case "warning":
              return (
                <Tag
                  color="orange"
                  icon={<WarningOutlined />}
                  style={{ cursor: "pointer" }}
                  onClick={() => setConfirmModal({ visible: true, item })}
                >
                  Cảnh báo
                </Tag>
              );
            case "trusted":
              return (
                <Tag color="cyan" icon={<CheckCircleOutlined />}>
                  Tin cậy
                </Tag>
              );
            case "failed":
              return <Tag color="red">Thất bại</Tag>;
            default:
              return <Tag color="green">Bình thường</Tag>;
          }
        },
        width: 110,
      },
      {
        title: "Người dùng",
        render: (_: unknown, item: LoginHistoryItem) => (
          <Space>
            <Avatar src={item.avatar || undefined} size="small">
              {item.fullName?.charAt(0) ?? "?"}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{item.fullName || "-"}</div>
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                {item.username}
              </div>
            </div>
          </Space>
        ),
        width: 180,
      },
      ...(canViewAll
        ? [
            {
              title: "Khu vực",
              render: (_: unknown, item: LoginHistoryItem) =>
                item.area?.name || "-",
              width: 120,
            },
            {
              title: "Team",
              render: (_: unknown, item: LoginHistoryItem) =>
                item.team?.name || "-",
              width: 120,
            },
          ]
        : []),
      {
        title: "Mã NV",
        render: (_: unknown, item: LoginHistoryItem) => item.employeeCode || "-",
        width: 100,
      },
      ...(canViewAll
        ? [
            {
              title: "Vai trò",
              render: (_: unknown, item: LoginHistoryItem) =>
                item.role ? (
                  <Tag color="blue">{item.role.code}</Tag>
                ) : (
                  "-"
                ),
              width: 100,
            },
          ]
        : []),
      {
        title: "Địa chỉ IP",
        render: (_: unknown, item: LoginHistoryItem) => (
          <Space>
            {item.ip || "-"}
            {item.isUnusualIp && (
              <WarningOutlined style={{ color: "#faad14" }} />
            )}
          </Space>
        ),
        width: 150,
      },
      {
        title: "Thiết bị",
        render: (_: unknown, item: LoginHistoryItem) => {
          if (!item.userAgent) return "-";
          const browser = parseUserAgent(item.userAgent);
          return (
            <Typography.Text
              ellipsis={{ tooltip: item.userAgent }}
              style={{ maxWidth: 150 }}
            >
              {browser}
              {item.isUnusualDevice && (
                <WarningOutlined
                  style={{ color: "#faad14", marginLeft: 4 }}
                />
              )}
            </Typography.Text>
          );
        },
        width: 170,
      },
      {
        title: "Thời gian",
        render: (_: unknown, item: LoginHistoryItem) => {
          const date = dayjs(item.loginAt);
          return (
            <div>
              <div>{date.format("DD/MM/YYYY HH:mm:ss")}</div>
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                {date.fromNow()}
              </div>
            </div>
          );
        },
      },
    ],
    [canViewAll]
  );

  const successCount = items.filter((i) => i.success).length;
  const failedCount = items.filter((i) => !i.success).length;
  const warningCount = items.filter((i) => getItemStatus(i) === "warning").length;

  const handleAreaChange = (value: string | null) => {
    setFilterArea(value ?? null);
    setFilterTeam(null);
  };

  const handleResetFilters = () => {
    setFilterSuccess(null);
    setFilterDate(null);
    setFilterArea(null);
    setFilterTeam(null);
    setFilterEmployee(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Lịch sử đăng nhập"
        subtitle={
          <span style={{ fontSize: 13, color: "#595959" }}>
            <span style={{ fontWeight: 700, color: "#1890ff", fontSize: 16 }}>
              {data?.total ?? 0}
            </span>{" "}
            lượt đăng nhập
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#52c41a" }}>
              {successCount}
            </span>{" "}
            thành công
            <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
            <span style={{ fontWeight: 600, color: "#ff4d4f" }}>
              {failedCount}
            </span>{" "}
            thất bại
            {warningCount > 0 && (
              <>
                <span style={{ color: "#d9d9d9", margin: "0 8px" }}>|</span>
                <span style={{ fontWeight: 600, color: "#faad14" }}>
                  {warningCount}
                </span>{" "}
                cảnh báo
              </>
            )}
          </span>
        }
        actions={
          <Space>
            <Input.Search
              placeholder={
                canViewAll
                  ? "Tìm theo tên, username, mã NV"
                  : "Tìm kiếm"
              }
              allowClear
              onSearch={setSearch}
              style={{ width: canViewAll ? 240 : 200 }}
              disabled={!canViewAll}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters((v) => !v)}
              type={showFilters ? "primary" : "default"}
            >
              Lọc
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} />
          </Space>
        }
      />

      {error && (
        <Typography.Text
          type="danger"
          style={{ marginBottom: 16, display: "block" }}
        >
          Lỗi tải dữ liệu: {(error as Error).message}
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
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
              Kết quả
            </div>
            <Select
              allowClear
              placeholder="Tất cả"
              style={{ width: 140 }}
              value={filterSuccess}
              onChange={(v) => setFilterSuccess(v ?? null)}
              options={[
                { value: true, label: "Thành công" },
                { value: false, label: "Thất bại" },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
              Khoảng thời gian
            </div>
            <DatePicker.RangePicker
              value={filterDate}
              onChange={(dates) =>
                setFilterDate(
                  dates as [dayjs.Dayjs, dayjs.Dayjs] | null
                )
              }
              format="DD/MM/YYYY"
              style={{ width: 260 }}
            />
          </div>
          {canViewAll && (
            <>
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  Khu vực
                </div>
                <Select
                  allowClear
                  placeholder="Chọn khu vực"
                  style={{ width: 160 }}
                  value={filterArea}
                  onChange={handleAreaChange}
                  options={areasData}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  Team
                </div>
                <Select
                  allowClear
                  placeholder="Chọn team"
                  style={{ width: 160 }}
                  value={filterTeam}
                  onChange={(v) => setFilterTeam(v ?? null)}
                  options={teamsData}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  disabled={!filterArea && (!teamsData || teamsData.length === 0)}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  Nhân viên
                </div>
                <Select
                  allowClear
                  placeholder="Chọn nhân viên"
                  style={{ width: 200 }}
                  value={filterEmployee}
                  onChange={(v) => setFilterEmployee(v ?? null)}
                  options={employeesData}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </div>
            </>
          )}
          <Button onClick={handleResetFilters}>Đặt lại</Button>
        </div>
      )}

      {!canViewAll && (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, marginBottom: 8, display: "block" }}
        >
          Bạn chỉ có thể xem lịch sử đăng nhập của bản thân.
        </Typography.Text>
      )}

      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #f0f0f0",
        }}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          {isLoading ? (
            <Typography.Text type="secondary">Đang tải...</Typography.Text>
          ) : items.length === 0 ? (
            <Typography.Text type="secondary">
              Không có lịch sử đăng nhập nào.
            </Typography.Text>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {columns.map((col: any, idx: number) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        fontWeight: 600,
                        fontSize: 13,
                        width: col.width,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: LoginHistoryItem) => (
                  <tr
                    key={item._id}
                    style={{
                      background:
                        getItemStatus(item) === "warning"
                          ? "#fff7e6"
                          : !item.success
                          ? "#fff2f0"
                          : undefined,
                    }}
                  >
                    {columns.map((col: any, idx: number) => (
                      <td
                        key={idx}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        {typeof col.render === "function"
                          ? col.render(null, item, 0)
                          : (item as any)[col.dataIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Space>
      </div>

      {data && data.totalPages > 1 && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <Typography.Text type="secondary">
            Trang {data.page} / {data.totalPages} — Tổng {data.total} bản ghi
          </Typography.Text>
        </div>
      )}

      {/* Confirm Suspicious Login Modal */}
      <SuspiciousLoginConfirmModal
        visible={confirmModal.visible}
        item={confirmModal.item}
        onClose={() => setConfirmModal({ visible: false, item: null })}
        onConfirm={(item) => {
          confirmMutation.mutate({ id: item._id, isTrusted: true });
        }}
      />
    </PageContainer>
  );
}

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "-";

  // Simple browser detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg"))
    return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    return "Safari";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("MSIE") || userAgent.includes("Trident"))
    return "IE";

  // Mobile browsers
  if (userAgent.includes("Mobile") || userAgent.includes("Android"))
    return "Mobile Browser";

  // Try to extract something meaningful
  const match = userAgent.match(/Mozilla\/[\d.]+\s+\(([^)]+)\)/);
  if (match) {
    const info = match[1];
    if (info.includes("Windows")) return "Windows";
    if (info.includes("Mac")) return "macOS";
    if (info.includes("Linux")) return "Linux";
  }

  return userAgent.slice(0, 30) + "...";
}
