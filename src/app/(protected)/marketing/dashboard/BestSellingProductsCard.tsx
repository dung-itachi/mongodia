/**
 * BestSellingProductsCard Component
 *
 * 🏆 Top sản phẩm bán chạy (thiết kế theo `mongolia-crm (7).html`)
 *
 * Hiển thị top sản phẩm theo số lượng đơn đã chốt.
 * Mỗi dòng: tên sản phẩm (flex 1) + số lượng.
 *
 * Props truyền vào `bestProducts: { name: string; count: number }[]`
 * (đã sort desc và slice top N ở component cha).
 */

import { memo } from "react";
import { Card, Skeleton } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import styles from "./marketing.module.css";

export type BestSellingProduct = {
  name: string;
  count: number;
};

export type BestSellingProductsCardProps = {
  bestProducts: BestSellingProduct[];
  loading?: boolean;
  /** Giới hạn số sản phẩm hiển thị (mặc định 8). */
  limit?: number;
};

function BestSellingProductsCardInner({
  bestProducts,
  loading = false,
  limit = 8,
}: BestSellingProductsCardProps) {
  const items = bestProducts.slice(0, limit);

  return (
    <Card
      size="small"
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 6 }} />
          🏆 Top sản phẩm bán chạy
        </span>
      }
      extra={
        <small style={{ color: "#8c8c8c" }}>{items.length}</small>
      }
      className={styles["mk-best-product-card"]}
      styles={{ body: { padding: "12px 16px" } }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : items.length === 0 ? (
        <p
          style={{
            color: "#8c8c8c",
            fontSize: 12,
            textAlign: "center",
            margin: 0,
          }}
        >
          Chưa có dữ liệu
        </p>
      ) : (
        <ul className={styles["mk-best-product-list"]}>
          {items.map((p, idx) => (
            <li
              key={`${p.name}-${idx}`}
              className={styles["mk-best-product-item"]}
            >
              <span className={styles["mk-best-product-rank"]}>{idx + 1}</span>
              <span className={styles["mk-best-product-name"]}>{p.name}</span>
              <b className={styles["mk-best-product-count"]}>{p.count}</b>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const BestSellingProductsCard = memo(BestSellingProductsCardInner);
export default BestSellingProductsCard;
