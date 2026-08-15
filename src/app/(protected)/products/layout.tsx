/**
 * Products Layout (Sprint 8.4.1)
 *
 * Layout with tab navigation for Product Module.
 * Routes:
 *   /products          -> Product list
 *   /products/categories -> Category management
 *   /products/variants  -> Variant management
 *   /products/combos    -> Combo management
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "antd";
import {
  ShopOutlined,
  AppstoreOutlined,
  MergeOutlined,
  GiftOutlined,
} from "@ant-design/icons";

const TABS = [
  {
    key: "/products/categories",
    label: (
      <span>
        <ShopOutlined />
        Danh mục
      </span>
    ),
  },
  {
    key: "/products",
    label: (
      <span>
        <AppstoreOutlined />
        Sản phẩm
      </span>
    ),
  },
  {
    key: "/products/variants",
    label: (
      <span>
        <MergeOutlined />
        Biến thể
      </span>
    ),
  },
  {
    key: "/products/combos",
    label: (
      <span>
        <GiftOutlined />
        Combo
      </span>
    ),
  },
];

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Tìm tab khớp ưu tiên key dài nhất trước (vd `/products/combos`
  // phải thắng `/products` khi cả 2 đều khớp `startsWith`).
  const activeTab =
    [...TABS]
      .sort((a, b) => b.key.length - a.key.length)
      .find((t) => pathname.startsWith(t.key))?.key ?? "/products";

  const handleTabChange = (key: string) => {
    router.push(key);
  };

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={TABS}
        style={{ marginBottom: 16 }}
      />
      {children}
    </>
  );
}
