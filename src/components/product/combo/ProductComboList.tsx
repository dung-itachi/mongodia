/**
 * Product Combo List Component
 *
 * Hiển thị danh sách theo cấu trúc:
 * - Sản phẩm (collapsible header)
 *   - Các combo thuộc sản phẩm đó
 *
 * Cho phép thêm/sửa/xóa combo trực tiếp theo sản phẩm.
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Switch, Image, Tag, Collapse, Empty, Space, Typography } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  PlusOutlined,
  RightOutlined,
  DownOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ComboListItem } from "@/hooks/useCombos";
import type { ProductListItem } from "@/hooks/useProductCrud";
import { formatMNT } from "@/lib/format";

const { Text } = Typography;

interface ProductComboListProps {
  products: ProductListItem[];
  combos: ComboListItem[];
  loading?: boolean;
  filterCategoryId?: string;
  filterKeyword?: string;
  onAddCombo: (productId: string) => void;
  onEditCombo: (combo: ComboListItem) => void;
  onDeleteCombo: (combo: ComboListItem) => void;
  onToggleActive?: (combo: ComboListItem, checked: boolean) => void;
}

interface ProductWithCombos {
  product: ProductListItem;
  combos: ComboListItem[];
}

export default function ProductComboList({
  products,
  combos,
  loading,
  filterCategoryId,
  filterKeyword,
  onAddCombo,
  onEditCombo,
  onDeleteCombo,
  onToggleActive,
}: ProductComboListProps) {
  const router = useRouter();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const getProductName = (product: ProductListItem["category"]) => {
    if (typeof product === "object" && product !== null) {
      return (product as { name: string }).name;
    }
    return "-";
  };

  const getProductCode = (product: ProductListItem["category"]) => {
    if (typeof product === "object" && product !== null) {
      return (product as { code: string }).code;
    }
    return "";
  };

  const getProductCategoryId = (product: ProductListItem) => {
    const category = product.category;
    if (typeof category === "object" && category !== null) {
      return (category as { _id: string })._id;
    }
    return "";
  };

  const groupedData = useMemo((): ProductWithCombos[] => {
    let filteredProducts = products;

    if (filterCategoryId) {
      filteredProducts = filteredProducts.filter(
        (p) => getProductCategoryId(p) === filterCategoryId
      );
    }

    if (filterKeyword) {
      const keyword = filterKeyword.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.code.toLowerCase().includes(keyword)
      );
    }

    return filteredProducts.map((product) => ({
      product,
      combos: combos.filter((combo) => {
        const comboProductId =
          typeof combo.product === "object" && combo.product !== null
            ? (combo.product as { _id: string })._id
            : String(combo.product);
        return comboProductId === product._id;
      }),
    }));
  }, [products, combos, filterCategoryId, filterKeyword]);

  const getComboProductId = (combo: ComboListItem) => {
    if (typeof combo.product === "object" && combo.product !== null) {
      return (combo.product as { _id: string })._id;
    }
    return String(combo.product);
  };

  const comboColumns = (productId: string) => [
    {
      key: "image",
      title: "Ảnh",
      width: 60,
      align: "center" as const,
      render: (_: unknown, record: ComboListItem) => {
        if (record.image) {
          return (
            <Image
              src={record.image}
              alt={record.name}
              width={36}
              height={36}
              style={{ objectFit: "cover", borderRadius: 4 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
            />
          );
        }
        return <GiftOutlined style={{ color: "#999", fontSize: 18 }} />;
      },
    },
    {
      key: "code",
      title: "Mã combo",
      dataIndex: "code",
      width: 120,
    },
    {
      key: "name",
      title: "Tên combo",
      dataIndex: "name",
    },
    {
      key: "packageQuantity",
      title: "SL SP",
      dataIndex: "packageQuantity",
      width: 70,
      align: "center" as const,
    },
    {
      key: "giftQuantity",
      title: "SL quà",
      dataIndex: "giftQuantity",
      width: 70,
      align: "center" as const,
      render: (value: number) => {
        if (value > 0) {
          return <Tag color="purple">{value}</Tag>;
        }
        return <span style={{ color: "#999" }}>0</span>;
      },
    },
    {
      key: "sellingPrice",
      title: "Giá bán",
      dataIndex: "sellingPrice",
      width: 120,
      align: "right" as const,
      render: (value: number) => (
        <Text style={{ color: "#52c41a", fontWeight: 500 }}>{formatMNT(value)}</Text>
      ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: ComboListItem) => {
        const active = record.isActive !== false;
        return (
          <Switch
            checked={active}
            onChange={(checked) => onToggleActive?.(record, checked)}
            checkedChildren="Active"
            unCheckedChildren="Off"
            size="small"
          />
        );
      },
    },
    {
      key: "actions",
      title: "Thao tác",
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: ComboListItem) => (
        <Space size={8}>
          <EditOutlined
            style={{ color: "#1890ff", cursor: "pointer", fontSize: 15 }}
            onClick={() => onEditCombo(record)}
          />
          <DeleteOutlined
            style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 15 }}
            onClick={() => onDeleteCombo(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="product-combo-list">
      {groupedData.length === 0 ? (
        <Empty
          description="Chưa có sản phẩm nào"
          style={{ padding: "60px 0" }}
        />
      ) : (
        <Collapse
          ghost
          activeKey={Array.from(expandedProducts)}
          onChange={(keys) => setExpandedProducts(new Set(keys as string[]))}
          expandIcon={({ isActive }) =>
            isActive ? <DownOutlined /> : <RightOutlined />
          }
          items={groupedData.map(({ product, combos: productCombos }) => {
            const productId = product._id;
            const category = product.category;
            const categoryName = getProductName(category);
            const categoryCode = getProductCode(category);
            const isActive = product.isActive !== false;

            return {
              key: productId,
              label: (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    paddingRight: 8,
                  }}
                >
                  <Space>
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={32}
                        height={32}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: "#f0f0f0",
                          borderRadius: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <GiftOutlined style={{ color: "#999" }} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        <Text strong>{product.name}</Text>
                        {!isActive && (
                          <Tag color="default" style={{ marginLeft: 8 }}>
                            Không hoạt động
                          </Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#999" }}>
                        {product.code}
                        {categoryCode && ` • ${categoryName}`}
                      </div>
                    </div>
                  </Space>
                  <Space>
                    <Tag color={productCombos.length > 0 ? "blue" : "default"}>
                      {productCombos.length} combo
                    </Tag>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/products/${productId}/combos`);
                      }}
                      style={{ padding: "0 4px" }}
                    >
                      Chi tiết
                    </Button>
                  </Space>
                </div>
              ),
              children: (
                <div style={{ paddingLeft: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 12,
                    }}
                  >
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={() => onAddCombo(productId)}
                    >
                      Thêm combo
                    </Button>
                  </div>
                  {productCombos.length === 0 ? (
                    <Empty
                      description="Sản phẩm này chưa có combo nào"
                      style={{ padding: "40px 0" }}
                    >
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => onAddCombo(productId)}
                      >
                        Tạo combo đầu tiên
                      </Button>
                    </Empty>
                  ) : (
                    <Table
                      columns={comboColumns(productId)}
                      dataSource={productCombos}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      scroll={{ y: 300 }}
                      loading={loading}
                    />
                  )}
                </div>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
