"use client";

import { useState, useCallback } from "react";
import { Button, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import TableToolbar from "@/components/common/table/TableToolbar";
import PermissionGate from "@/components/common/PermissionGate";
import { useWarehouseInventory, type WarehouseInventoryFilters } from "@/hooks/useWarehouseInventory";
import { useWarehouseInventorySelectors } from "@/hooks/useWarehouseInventory";
import WarehouseInventoryFiltersComponent from "@/components/warehouse/inventory/WarehouseInventoryFilters";
import WarehouseInventoryTable from "@/components/warehouse/inventory/WarehouseInventoryTable";

const { Text } = Typography;
const DEFAULT_PAGE_SIZE = 20;

export default function WarehouseInventoryPage() {
  const [filters, setFilters] = useState<WarehouseInventoryFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  const selectors = useWarehouseInventorySelectors();
  const { items, loading, fetching, total, refetch, response } = useWarehouseInventory({ filters });

  const handleFilterChange = useCallback((newFilters: WarehouseInventoryFilters) => {
    setFilters(newFilters);
  }, []);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      limit: pageSize,
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pageActions = (
    <Space direction="vertical" size={0} style={{ textAlign: "right" }}>
      <Text strong>Tổng: {(total ?? 0).toLocaleString("vi-VN")} dòng</Text>
      {filters.search && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Kết quả tìm kiếm: {items.length.toLocaleString("vi-VN")}
        </Text>
      )}
    </Space>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Tồn kho"
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: "Tồn kho" },
        ]}
        actions={pageActions}
      />

      <PermissionGate permission="inventory.view">
        <div className="card">
          <TableToolbar
            searchValue={filters.search}
            onSearchChange={(value) => handleFilterChange({ ...filters, search: value || undefined })}
            searchPlaceholder="Tìm kiếm sản phẩm, SKU, quà tặng..."
            onRefresh={handleRefresh}
            loading={fetching}
            actions={
              <Button icon={<ReloadOutlined spin={fetching} />} onClick={handleRefresh}>
                Làm mới
              </Button>
            }
          />

          <WarehouseInventoryFiltersComponent
            filters={filters}
            onChange={handleFilterChange}
            products={selectors.products.map((p) => ({ _id: p._id, code: p.code, name: p.name }))}
            gifts={selectors.gifts}
            warehouses={selectors.warehouses.map((w) => ({ _id: w._id, code: w.code, name: w.name }))}
            variants={selectors.variants}
            loading={selectors.loading}
          />

          <WarehouseInventoryTable
            data={items}
            loading={loading}
            pagination={{
              current: filters.page ?? 1,
              pageSize: filters.limit ?? DEFAULT_PAGE_SIZE,
              total: response?.total ?? total,
              onChange: handlePageChange,
            }}
          />
        </div>
      </PermissionGate>
    </PageContainer>
  );
}
