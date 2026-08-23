"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Space, Typography, Row, Col, Statistic, Card, Alert } from "antd";
import { ReloadOutlined, InboxOutlined, GiftOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import TableToolbar from "@/components/common/table/TableToolbar";
import PermissionGate from "@/components/common/PermissionGate";
import { useWarehouseInventory, type WarehouseInventoryFilters } from "@/hooks/useWarehouseInventory";
import { useWarehouseInventorySelectors } from "@/hooks/useWarehouseInventory";
import WarehouseInventoryFiltersComponent from "@/components/warehouse/inventory/WarehouseInventoryFilters";
import WarehouseInventoryTable from "@/components/warehouse/inventory/WarehouseInventoryTable";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import type { NormalizedInventoryItem } from "@/hooks/useWarehouseInventory";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


const { Text } = Typography;
const DEFAULT_PAGE_SIZE = 20;

interface SummaryStats {
  totalItems: number;
  totalQuantity: number;
  outOfStock: number;
  lowStock: number;
  gifts: number;
}

function computeStats(items: NormalizedInventoryItem[]): SummaryStats {
  const outOfStock = items.filter((i) => (i.quantity ?? 0) === 0).length;
  const lowStock = items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) < 10).length;
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  const gifts = items.filter((i) => i.itemType === "GIFT").length;
  return { totalItems: items.length, totalQuantity, outOfStock, lowStock, gifts };
}

export default function WarehouseInventoryPage() {
  const lang = useLanguageStore((s) => s.language);
  const [filters, setFilters] = useState<WarehouseInventoryFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  const selectors = useWarehouseInventorySelectors();
  const { items, loading, fetching, total, refetch, response } = useWarehouseInventory({ filters });

  const stats = useMemo(() => computeStats(items), [items]);

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

  const handleResetFilters = useCallback(() => {
    setFilters({ page: 1, limit: DEFAULT_PAGE_SIZE });
  }, []);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.warehouseId ||
    filters.itemType ||
    filters.productId ||
    filters.variantId ||
    filters.giftId
  );

  return (
    <PageContainer>
      <PageHeader title={t("Tồn kho", lang)}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Kho", lang), href: "/warehouses" },
          { label: t("Tồn kho", lang) },
        ]}
      />

      <PermissionGate permission="inventory.view">
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{t("Tổng mặt hàng", lang)}</Text>}
                value={stats.totalItems}
                styles={{ content: { color: "#1890ff", fontSize: 22, fontWeight: 600 } }}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>{t("dòng", lang)}</Text>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{t("Tổng tồn kho", lang)}</Text>}
                value={stats.totalQuantity}
                styles={{ content: { color: "#52c41a", fontSize: 22, fontWeight: 600 } }}
                formatter={(value) => Number(value).toLocaleString("vi-VN")}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{t("Hết hàng", lang)}</Text>}
                value={stats.outOfStock}
                styles={{ content: {
                  color: stats.outOfStock > 0 ? "#ff4d4f" : "#52c41a",
                  fontSize: 22,
                  fontWeight: 600,
                }}}
                prefix={stats.outOfStock > 0 ? <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} /> : null}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{t("Sắp hết", lang)}</Text>}
                value={stats.lowStock}
                styles={{ content: {
                  color: stats.lowStock > 0 ? "#faad14" : "#52c41a",
                  fontSize: 22,
                  fontWeight: 600,
                }}}
              />
            </Card>
          </Col>
        </Row>

        {/* Low stock / out of stock alerts */}
        {stats.outOfStock > 0 && (
          <Alert
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
                <Text>
                  {t("Có", lang)} <strong>{stats.outOfStock}</strong> {t("mặt hàng", lang)} <strong>{t("hết hàng", lang)}</strong> {t("cần được bổ sung", lang)}
                </Text>
              </Space>
            }
            type="error"
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
          />
        )}
        {stats.lowStock > 0 && stats.outOfStock === 0 && (
          <Alert
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: "#faad14" }} />
                <Text>
                  {t("Có", lang)} <strong>{stats.lowStock}</strong> {t("mặt hàng", lang)} <strong>{t("sắp hết hàng", lang)}</strong> (dưới 10 {t("cái", lang)})
                </Text>
              </Space>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
          />
        )}

        <Card
          size="small"
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: "16px 16px 8px" } }}
        >
          <TableToolbar
            searchValue={filters.search}
            onSearchChange={(value) => handleFilterChange({ ...filters, search: value || undefined })}
            searchPlaceholder={t("Tìm kiếm sản phẩm, SKU, quà tặng...", lang)}
            onRefresh={handleRefresh}
            loading={fetching}
            actions={
              <Space>
                {hasActiveFilters && (
                  <Button onClick={handleResetFilters}>{t("Xóa lọc", lang)}</Button>
                )}
                <Button icon={<ReloadOutlined spin={fetching} />} onClick={handleRefresh}>
                  {t("Làm mới", lang)}
                </Button>
              </Space>
            }
          />

          <div style={{ marginBottom: 12 }}>
            <WarehouseQuickPick
              value={filters.warehouseId}
              onChange={(warehouseId) =>
                handleFilterChange({ ...filters, warehouseId, page: 1 })
              }
              warehouses={selectors.warehouses}
            />
          </div>

          <WarehouseInventoryFiltersComponent
            filters={filters}
            onChange={handleFilterChange}
            products={selectors.products.map((p) => ({ _id: p._id, code: p.code, name: p.name }))}
            gifts={selectors.gifts}
            warehouses={selectors.warehouses.map((w) => ({ _id: w._id, code: w.code, name: w.name }))}
            variants={selectors.variants}
            loading={selectors.loading}
          />
        </Card>

        {/* Item type summary */}
        {!loading && items.length > 0 && (
          <div style={{ marginBottom: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Space size={4}>
              <InboxOutlined style={{ color: "#1890ff" }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                <strong>{items.filter((i) => i.itemType === "PRODUCT").length}</strong> {t("sản phẩm", lang)}
              </Text>
            </Space>
            <Space size={4}>
              <GiftOutlined style={{ color: "#722ed1" }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                <strong>{stats.gifts}</strong> {t("quà tặng", lang)}
              </Text>
            </Space>
            {hasActiveFilters && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                · {t("Lọc", lang)}: <strong>{items.length.toLocaleString("vi-VN")}</strong> / {total?.toLocaleString("vi-VN") ?? 0} {t("kết quả", lang)}
              </Text>
            )}
          </div>
        )}

        <WarehouseInventoryTable
          data={items}
          loading={loading}
          onAdjusted={handleRefresh}
          pagination={{
            current: filters.page ?? 1,
            pageSize: filters.limit ?? DEFAULT_PAGE_SIZE,
            total: response?.total ?? total,
            onChange: handlePageChange,
          }}
        />
      </PermissionGate>
    </PageContainer>
  );
}
