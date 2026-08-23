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
 *   │ [Nhập]                  │
 *   └──────────────────────────┘
 *
 * - "Nhập"   → m� modal nhập theo VARIANT cụ thể
 * - "Chi tiết" → mở drawer xem breakdown từng variant
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
};

const TONE: Record<string, string> = {
  blue: "var(--ant-color-primary, #1890ff)",
  amber: "#fa8c16",
  orange: "#fa8c16",
  green: "#52c41a",
  purple: "#722ed1",
  muted: "#8c8c8c",
};

function WarehouseOverviewCardInner({
  items,
  loading = false,
  activeWarehouseId,
}: WarehouseOverviewCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const [importTarget, setImportTarget] = useState<WarehouseOverviewItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<WarehouseOverviewItem | null>(null);

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
        {items.map((item) => (
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
              {activeWarehouseId ? ` (${t("KHO NÀY", lang)})` : ` (${t("TẤT CẢ KHO", lang)})`}
            </div>

            <div className={styles["wh-item-stats"]}>
              <span style={{ color: TONE.blue }}>
                <InboxOutlined /> {t("Tồn kho:", lang)} <b>{item.stock}</b>
              </span>
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
            </div>

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
        ))}
      </div>

      <ImportStockModal
        open={!!importTarget}
        product={importTarget}
        onClose={() => setImportTarget(null)}
        onSuccess={() => setImportTarget(null)}
      />

      <WarehouseProductDetailDrawer
        open={!!detailTarget}
        product={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </>
  );
}

const WarehouseOverviewCard = memo(WarehouseOverviewCardInner);
export default WarehouseOverviewCard;