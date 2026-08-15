"use client";

/**
 * ==================================================
 * WAREHOUSE PAGE
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Main page for warehouse task management.
 */

import {
  useState, useCallback, useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import DataTable from "@/components/common/table/DataTable";
import TableToolbar from "@/components/common/table/TableToolbar";
import FilterBar from "@/components/common/filters/FilterBar";
import StatusBadge from "@/components/common/display/StatusBadge";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import PermissionGate from "@/components/common/PermissionGate";

import {
  useWarehouseTasks,
} from "@/hooks/useWarehouseTasks";
import { useDebounce } from "@/hooks/useDebounce";
import { useWarehouses } from "@/hooks/useWarehouses";
import { WAREHOUSE_STATUS_LABELS } from "@/constants/warehouseStatus";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import type {
  WarehouseTaskListItem,
} from "@/hooks/useWarehouseTasks";

export default function WarehousesPage() {
  const router = useRouter();

  // Search and filter state
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { warehouses } = useWarehouses();

  // Build filter params
  const filterParams = useMemo(() => ({
    keyword: debouncedKeyword,
    status: status as string | undefined,
    warehouseId,
    page,
    limit: pageSize,
  }), [debouncedKeyword, status, warehouseId, page, pageSize]);

  // Fetch warehouse tasks
  const { tasks, total, loading, refetch } = useWarehouseTasks(filterParams);

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    if (values.status !== undefined) {
      setStatus(values.status === "" ? undefined : values.status as string);
    }
    setPage(1);
  }, []);

  // Table columns
  const columns = useMemo(() => [
    {
      key: "orderCode",
      title: "Mã đơn hàng",
      dataIndex: "orderCode",
      width: 180,
      render: (value: unknown, record: Record<string, unknown>) => {
        const task = record as unknown as WarehouseTaskListItem;
        const orderCode = (value as string | null) || task.orderId.slice(-8).toUpperCase();
        return (
          <a onClick={() => router.push(`/warehouses/${task._id}`)}>
            {orderCode}
          </a>
        );
      },
    },
    {
      key: "warehouse",
      title: "Kho xử lý",
      dataIndex: "warehouseName",
      width: 180,
      render: (_: unknown, record: Record<string, unknown>) => {
        const task = record as unknown as WarehouseTaskListItem;
        if (!task.warehouseName) {
          return <span style={{ color: "#8c8c8c" }}>Chưa gán</span>;
        }
        return (
          <span>
            {task.warehouseCode ? `${task.warehouseCode} • ` : ""}
            {task.warehouseName}
          </span>
        );
      },
    },
    {
      key: "warehouseStatus",
      title: "Trạng thái",
      dataIndex: "warehouseStatus",
      width: 160,
      render: (value: unknown) => (
        <StatusBadge status={String(value)} />
      ),
    },
    {
      key: "assignedEmployeeId",
      title: "Nhân viên",
      dataIndex: "assignedEmployeeId",
      width: 150,
      render: (value: unknown) => {
        if (!value) return <span style={{ color: "#8c8c8c" }}>Chưa giao</span>;
        return <span>{String(value).slice(-6).toUpperCase()}</span>;
      },
    },
    {
      key: "note",
      title: "Ghi chú",
      dataIndex: "note",
      width: 200,
      ellipsis: true,
      render: (value: unknown) => {
        if (!value) return <span>-</span>;
        return <span>{String(value)}</span>;
      },
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 120,
      render: (value: unknown) => {
        const date = new Date(String(value));
        return date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      key: "updatedAt",
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 120,
      render: (value: unknown) => {
        const date = new Date(String(value));
        return date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      key: "actions",
      title: "Thao tác",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const task = record as unknown as WarehouseTaskListItem;
        const menuItems: MenuProps["items"] = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "Xem chi tiết task",
            onClick: () => router.push(`/warehouses/${task._id}`),
          },
          {
            key: "view-order",
            icon: <EyeOutlined />,
            label: "Xem đơn hàng",
            onClick: () => router.push(`/orders/${task.orderId}`),
          },
        ];

        return (
          <Dropdown
            trigger={["click"]}
            menu={{ items: menuItems }}
            getPopupContainer={() => document.body}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </Dropdown>
        );
      },
    },
  ], [router]);

  // Pagination config
  const pagination = useMemo(() => ({
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (totalCount: number) => `Tổng: ${totalCount}`,
    onChange: (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
  }), [page, pageSize, total]);

  // Custom filter items for FilterBar
  const customFilterItems = useMemo(() => [
    {
      key: "status",
      type: "select" as const,
      label: "Trạng thái",
      options: [
        { value: "", label: "Tất cả trạng thái" },
        ...Object.entries(WAREHOUSE_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      ],
    },
  ], []);

  const filterValues = useMemo(() => ({
    status: status ?? "",
  }), [status]);

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý kho"
        subtitle={`${total} task`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho" },
        ]}
      />

      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          actions={
            <FilterBar
              items={customFilterItems}
              values={filterValues}
              onChange={handleFilterChange}
            />
          }
          onRefresh={refetch}
        />

        <WarehouseQuickPick
          value={warehouseId}
          onChange={(next) => {
            setWarehouseId(next);
            setPage(1);
          }}
          warehouses={warehouses}
        />

        {loading ? (
          <SkeletonTable columns={columns.length} />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Không có task"
            description="Chưa có warehouse task nào"
          />
        ) : (
          <DataTable
            columns={columns}
            data={tasks as unknown as Record<string, unknown>[]}
            pagination={pagination}
            rowKey="_id"
            scroll={{ x: 1000 }}
          />
        )}
      </div>
    </PageContainer>
  );
}
