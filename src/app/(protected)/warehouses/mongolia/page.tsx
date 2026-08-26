"use client";

/**
 * /warehouses/mongolia — Quản lý kho Mông Cổ (kho chính)
 *
 * Kho chính — track đầy đủ:
 *  - Tồn kho, đang giao, đang hoàn về, đã giao TC, đã hoàn kho, tổng nhập
 *
 * Tương tự /warehouses nhưng filter areaCountryCode="MN".
 */

import { useState, useMemo } from "react";
import { Button } from "antd";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import styles from "../warehouses.module.css";
import WarehouseStatsGrid from "../WarehouseStatsGrid";
import WarehouseOverviewCard from "../WarehouseOverviewCard";
import WarehouseOverviewFilters, {
  type WarehouseOverviewStockFilter,
} from "../WarehouseOverviewFilters";
import QuickCreateProductDrawer from "../QuickCreateProductDrawer";
import { useDebounce } from "@/hooks/useDebounce";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseInventoryOverview } from "@/hooks/useWarehouseInventoryOverview";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function WarehousesMongoliaPage() {
  const lang = useLanguageStore((s) => s.language);
  const { warehouses } = useWarehouses();

  const [overviewSearch, setOverviewSearch] = useState("");
  const debouncedOverviewSearch = useDebounce(overviewSearch, 300);
  const [overviewWarehouseId, setOverviewWarehouseId] = useState<
    string | undefined
  >(undefined);
  const [overviewStock, setOverviewStock] =
    useState<WarehouseOverviewStockFilter>("all");

  const {
    data: overview,
    loading: overviewLoading,
    refetch: refetchOverview,
  } = useWarehouseInventoryOverview({
    areaCountryCode: "MN",
    warehouseId: overviewWarehouseId,
  });

  const mongoliaWarehouses = useMemo(
    () =>
      warehouses.filter((w: { code?: string; name?: string }) => {
        const code = String(w.code ?? "").toUpperCase();
        const name = String(w.name ?? "").toLowerCase();
        return (
          code.startsWith("MN") ||
          name.includes("mông cổ") ||
          name.includes("mongolia")
        );
      }),
    [warehouses]
  );

  const filteredOverviewItems = useMemo(() => {
    const items = overview?.items ?? [];
    const keyword = debouncedOverviewSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (
        keyword &&
        !item.productCode.toLowerCase().includes(keyword) &&
        !item.productName.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      if (overviewStock === "in_stock" && item.stock <= 0) return false;
      if (overviewStock === "out_of_stock" && item.stock !== 0) return false;
      if (overviewStock === "low_stock" && (item.stock <= 0 || item.stock > 10))
        return false;
      return true;
    });
  }, [overview?.items, debouncedOverviewSearch, overviewStock]);

  const [addProductOpen, setAddProductOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        title={t("Quản lý kho Mông Cổ", lang)}
        subtitle={t("Kho chính · Bán hàng & xử lý đơn", lang)}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Kho", lang) },
          { label: t("Kho Mông Cổ", lang) },
        ]}
      />

      <WarehouseStatsGrid
        totals={overview?.totals ?? defaultFullTotals}
        loading={overviewLoading}
        variant="full"
      />

      <div className="card">
        <div className={styles["wh-section-head"]} style={{ padding: "12px 16px 0" }}>
          <h2>📦 {t("Sản phẩm tại kho Mông Cổ", lang)}</h2>
          <Button type="primary" onClick={() => setAddProductOpen(true)}>
            + {t("Tạo SP nhanh", lang)}
          </Button>
        </div>
        <div style={{ padding: "8px 16px 16px" }}>
          <WarehouseOverviewFilters
            value={{
              search: overviewSearch,
              warehouseId: overviewWarehouseId,
              stock: overviewStock,
            }}
            onChange={(next) => {
              setOverviewSearch(next.search);
              setOverviewWarehouseId(next.warehouseId);
              setOverviewStock(next.stock);
            }}
            onRefresh={refetchOverview}
            refreshing={overviewLoading}
            warehouses={mongoliaWarehouses}
          />
          <WarehouseOverviewCard
            items={filteredOverviewItems}
            loading={overviewLoading}
            activeWarehouseId={overviewWarehouseId}
            variant="full"
          />
        </div>
      </div>

      <QuickCreateProductDrawer
        open={addProductOpen}
        warehouseId={overviewWarehouseId}
        onClose={() => setAddProductOpen(false)}
        onSuccess={() => {
          refetchOverview();
        }}
      />
    </PageContainer>
  );
}

const defaultFullTotals = {
  productCount: 0,
  stock: 0,
  shipping: 0,
  returning: 0,
  delivered: 0,
  returned: 0,
  imported: 0,
  transferredOut: 0,
};