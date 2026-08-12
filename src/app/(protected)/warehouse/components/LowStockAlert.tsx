/**
 * LowStockAlert Component
 *
 * Displays low stock warnings for products that are running out of inventory.
 * Shows items with availableQuantity below their threshold.
 */

import { memo } from "react";
import { WarningOutlined } from "@ant-design/icons";
import CardSection from "@/components/common/cards/CardSection";
import type { LowStockItem } from "../page";
import { LOW_STOCK_THRESHOLD } from "../warehouse.constants";
import styles from "../warehouse-dashboard.module.css";

export type LowStockAlertProps = {
  items: LowStockItem[];
  loading?: boolean;
  threshold?: number;
};

function LowStockAlertInner({ items, threshold }: LowStockAlertProps) {
  const displayThreshold = threshold ?? LOW_STOCK_THRESHOLD;
  return (
    <CardSection title="Cảnh báo sắp hết hàng" noPadding>
      {items.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: "#8c8c8c", fontSize: 13 }}>
          Không có sản phẩm sắp hết hàng
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {items.map((item) => {
            const displayName = item.name || "Không xác định";
            const metaInfo = [item.warehouseName, item.sku].filter(Boolean).join(" • ");

            return (
              <div key={item.key} className={styles["low-stock-item"]}>
                <div className={styles["low-stock-info"]}>
                  <span className={styles["low-stock-name"]} title={displayName}>
                    {displayName}
                  </span>
                  {metaInfo && <span className={styles["low-stock-meta"]}>{metaInfo}</span>}
                </div>
                <div>
                  <WarningOutlined style={{ color: "#ff4d4f", marginRight: 4 }} />
                  <span className={styles["low-stock-quantity"]}>{item.availableQuantity}</span>
                  <span className={styles["low-stock-threshold"]}>/{displayThreshold}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardSection>
  );
}

const LowStockAlert = memo(LowStockAlertInner);
export default LowStockAlert;
