/**
 * WarehouseOverviewCard Component
 *
 * Card hiển thị chi tiết từng SẢN PHẨM trong trang `/warehouses`,
 * thiết kế theo `mongolia-crm (7).html`:
 *
 *   ┌──────────────────────────┐
 *   │ Eyelash mascara  [Chi tiết]│
 *   │ 150                      │  ← tồn kho (tổng các variant)
 *   │ TỒN KHO                  │
 *   │ 📦 Tồn kho · 🚚 Đang giao │
 *   │ ↩ Đang hoàn · ✅ Giao TC  │
 *   │ 📥 Hoàn kho · Tổng nhập   │
 *   │ [Nhập] [Chi tiết]         │
 *   │  • Variant-A   [120]      │  ← breakdown variant (embed từ overview)
 *   │  • Variant-B   [ 30]      │
 *   └──────────────────────────┘
 */

import { memo, useState } from "react";
import { Button, Empty, Skeleton, Tag } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  InboxOutlined,
  TruckOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ImportOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import type { WarehouseOverviewItem } from "@/hooks/useWarehouseInventoryOverview";
import ImportStockModal from "./ImportStockModal";
import WarehouseProductDetailDrawer from "./WarehouseProductDetailDrawer";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./warehouses.module.css";

export type WarehouseOverviewCardProps = {
  items: WarehouseOverviewItem[];
  loading?: boolean;
  activeWarehouseId?: string;
  /** Mã kho hard-coded (KHO1 / KHO2). Dùng để label. */
  warehouseCode?: string;
  variant?: "full" | "source";
};

const TONE: Record<string, string> = {
  blue: "var(--ant-color-primary, #1890ff)",
  amber: "#fa8c16",
  orange: "#fa8c16",
  green: "#52c41a",
  purple: "#722ed1",
  muted: "#8c8c8c",
};

function stockVariantClass(stock: number): string {
  if (stock === 0) return `${styles["wh-item-variant-stock"]} ${styles["wh-item-variant-stock--zero"]}`;
  if (stock <= 10) return `${styles["wh-item-variant-stock"]} ${styles["wh-item-variant-stock--low"]}`;
  return styles["wh-item-variant-stock"];
}

function WarehouseOverviewCardInner({
  items,
  loading = false,
  activeWarehouseId,
  warehouseCode,
  variant = "full",
}: WarehouseOverviewCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const [importTarget, setImportTarget] = useState<WarehouseOverviewItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<WarehouseOverviewItem | null>(null);

  /**
   * Variants breakdown giờ được embed sẵn trong mỗi `WarehouseOverviewItem`
   * từ response `/api/warehouses/inventory-overview?includeVariants=true`.
   * Điều này loại bỏ N+1 request — trước đây mỗi card tự fetch
   * /api/warehouses/inventory-overview/{productId}/variants theo vòng
   * `for await` tuần tự (với 1000 SP sẽ tốn ~5 phút).
   *
   * Drawer "Chi tiết" vẫn gọi /variants riêng để có full breakdown
   * (shipping/returning/delivered/returned) chỉ cho 1 sản phẩm user
   * click vào — đây là request do user-trigger, không phải N+1.
   */

  // Badge tồn kho: giúp user nhìn nhanh SP nào hết hàng / tồn thấp
  const renderStockBadge = (stock: number) => {
    if (stock === 0) return <Tag color="red">{t("Hết hàng", lang)}</Tag>;
    if (stock <= 10) return <Tag color="orange">{t("Tồn thấp", lang)}</Tag>;
    return <Tag color="green">{t("Ổn", lang)}</Tag>;
  };

  if (loading) {
    return (
      <div className={styles["wh-grid"]}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles["wh-item"]}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles["wh-empty-wrap"]}>
        <Empty description={t("Chưa có sản phẩm nào trong kho", lang)} />
      </div>
    );
  }

  return (
    <>
      <div className={styles["wh-grid"]}>
        {items.map((item) => {
          // variants được server group sẵn theo productId
          const variants = item.variants;
          return (
            <div key={item.productId} className={styles["wh-item"]}>
              <h4 className={styles["wh-item-title"]}>
                <span className={styles["wh-item-code"]}>{item.productCode}</span>{" "}
                {item.productName}
                <span style={{ marginLeft: 8 }}>
                  {renderStockBadge(item.stock)}
                </span>
              </h4>
              <div className={styles["wh-item-stock"]}>{item.stock}</div>
              <div className={styles["wh-item-stock-label"]}>
                {t("TỒN KHO", lang)}
                {activeWarehouseId
                  ? ` (${t("KHO NÀY", lang)})`
                  : warehouseCode
                    ? ` (${t("KHO " + warehouseCode, lang)})`
                    : ` (${t("TẤT CẢ KHO", lang)})`}
              </div>

              <div className={styles["wh-item-stats"]}>
                <span style={{ color: TONE.blue }}>
                  <InboxOutlined /> {t("Tồn kho:", lang)} <b>{item.stock}</b>
                </span>
                {variant === "source" ? (
                  <>
                    <span style={{ color: TONE.green }}>
                      <ImportOutlined /> {t("Tổng nhập:", lang)} <b>{item.imported}</b>
                    </span>
                    <span style={{ color: TONE.amber }}>
                      <ExportOutlined /> {t("Đã chuyển đi:", lang)} <b>{item.transferredOut}</b>
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: TONE.amber }}>
                      <TruckOutlined /> {t("Đang giao:", lang)} <b>{item.shipping}</b>
                    </span>
                    <span style={{ color: TONE.orange }}>
                      <RollbackOutlined /> {t("Đang hoàn về:", lang)} <b>{item.returning}</b>
                    </span>
                    <span style={{ color: TONE.green }}>
                      <CheckCircleOutlined /> {t("Đã giao TC:", lang)} <b>{item.delivered}</b>
                    </span>
                    <span style={{ color: TONE.purple }}>
                      <DownloadOutlined /> {t("Đã hoàn kho:", lang)} <b>{item.returned}</b>
                    </span>
                    <span style={{ color: TONE.muted }}>
                      {t("Tổng nhập:", lang)} <b>{item.imported}</b>
                    </span>
                  </>
                )}
              </div>

              {/* Per-variant breakdown — đã có sẵn từ overview response, không cần fetch thêm */}
              {variants && variants.length > 0 && (
                <div className={styles["wh-item-variants"]}>
                  {variants.map((v) => (
                    <div key={v.productVariantId} className={styles["wh-item-variant"]}>
                      <span className={styles["wh-item-variant-sku"]}>• {v.sku}</span>
                      <span className={stockVariantClass(v.stock)}>{v.stock}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles["wh-item-actions"]}>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setImportTarget(item)}
                >
                  {t("Nhập", lang)}
                </Button>
                <Button
                  type="default"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setDetailTarget(item)}
                >
                  {t("Chi tiết", lang)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ImportStockModal
        open={!!importTarget}
        product={importTarget}
        warehouseId={activeWarehouseId}
        onClose={() => setImportTarget(null)}
        onSuccess={() => setImportTarget(null)}
      />

      <WarehouseProductDetailDrawer
        open={!!detailTarget}
        product={detailTarget}
        activeWarehouseId={activeWarehouseId}
        warehouseCode={warehouseCode}
        onClose={() => setDetailTarget(null)}
      />
    </>
  );
}

const WarehouseOverviewCard = memo(WarehouseOverviewCardInner);
export default WarehouseOverviewCard;
