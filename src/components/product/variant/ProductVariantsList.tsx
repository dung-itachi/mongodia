/**
 * Product Variants List Component (Sprint 8.4.1)
 *
 * Shows products list on the left and variants of selected product on the right.
 * Grouped view: Product → Variants
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Card, Empty, Tag, Badge, Space, Popconfirm, Switch, Tooltip, Input, Spin } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ShopOutlined, AppstoreOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type {
  ProductVariantListItem,
  ProductVariantOptionWithValues,
} from "@/hooks/useVariants";
import type { ProductListItem } from "@/hooks/useProductCrud";

interface VariantValueDisplay {
  _id: string;
  name: string;
  optionId: string;
  optionName: string;
}

interface ProductVariantsListProps {
  products: ProductListItem[];
  productsLoading: boolean;
  variants: ProductVariantListItem[];
  variantsLoading: boolean;
  variantOptions: ProductVariantOptionWithValues[];
  selectedProductId?: string | null;
  onEditVariant: (item: ProductVariantListItem) => void;
  onDeleteVariant: (item: ProductVariantListItem) => void;
  onToggleVariantActive: (item: ProductVariantListItem) => void;
  onAddVariant: (productId: string) => void;
  onRefresh: () => void;
  onProductSelect: (productId: string | null) => void;
}

export default function ProductVariantsList({
  products,
  productsLoading,
  variants,
  variantsLoading,
  variantOptions,
  selectedProductId: externalSelectedProductId,
  onEditVariant,
  onDeleteVariant,
  onToggleVariantActive,
  onAddVariant,
  onRefresh,
  onProductSelect,
}: ProductVariantsListProps) {
  const [internalSelectedProductId, setInternalSelectedProductId] = useState<string | null>(null);

  // Use external selected product ID if provided, otherwise use internal
  const selectedProductId = externalSelectedProductId ?? internalSelectedProductId;

  const [searchTerm, setSearchTerm] = useState("");

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Get variants for selected product
  const selectedProductVariants = useMemo(() => {
    if (!selectedProductId) return [];
    return variants.filter((v) => {
      const pid =
        typeof v.productId === "object"
          ? (v.productId as { _id: string })._id
          : String(v.productId);
      return pid === selectedProductId;
    });
  }, [variants, selectedProductId]);

  // Get selected product info
  const selectedProduct = useMemo(() => {
    return products.find((p) => p._id === selectedProductId);
  }, [products, selectedProductId]);

  // Get variant options for selected product
  const selectedProductOptions = useMemo(() => {
    return variantOptions;
  }, [variantOptions]);

  // Count variants per product
  const variantCountByProduct = useMemo(() => {
    const counts: Record<string, number> = {};
    variants.forEach((v) => {
      const pid =
        typeof v.productId === "object"
          ? (v.productId as { _id: string })._id
          : String(v.productId);
      counts[pid] = (counts[pid] || 0) + 1;
    });
    return counts;
  }, [variants]);

  // Parse variant values
  const parseVariantValues = useCallback(
    (variantValues: ProductVariantListItem["variantValues"]): VariantValueDisplay[] => {
      if (!Array.isArray(variantValues) || variantValues.length === 0) {
        return [];
      }
      return variantValues
        .map((v) => {
          if (typeof v === "object" && v !== null) {
            const obj = v as Record<string, unknown>;
            const variantOptionId = obj.variantOptionId;
            let optionId = "";
            let optionName = "";

            if (typeof variantOptionId === "object" && variantOptionId !== null) {
              const optionObj = variantOptionId as Record<string, unknown>;
              optionId = (optionObj._id as string) || "";
              optionName = (optionObj.name as string) || "";
            }

            return {
              _id: (obj._id as string) || "",
              name: (obj.name as string) || "",
              optionId,
              optionName,
            };
          }
          return null;
        })
        .filter((v): v is VariantValueDisplay => v !== null);
    },
    []
  );

  // Group variant values by option
  const groupVariantValuesByOption = useCallback(
    (variantValues: VariantValueDisplay[]) => {
      const groups: Record<string, { optionName: string; values: VariantValueDisplay[] }> = {};
      for (const vv of variantValues) {
        if (!groups[vv.optionId]) {
          groups[vv.optionId] = { optionName: vv.optionName || vv.optionId, values: [] };
        }
        groups[vv.optionId].values.push(vv);
      }
      return groups;
    },
    []
  );

  // Format variant display
  const formatVariantDisplay = useCallback(
    (variantValues: ProductVariantListItem["variantValues"]) => {
      const parsed = parseVariantValues(variantValues);
      if (parsed.length === 0) {
        return <span style={{ color: "#999" }}>Không có thuộc tính</span>;
      }

      const groups = groupVariantValuesByOption(parsed);

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(groups).map(([optionId, group]) => (
            <div key={optionId} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#666", fontSize: 12, minWidth: 70 }}>{group.optionName}:</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {group.values.map((vv) => (
                  <Tag key={vv._id} color="blue" style={{ margin: 0, fontSize: 11 }}>
                    {vv.name}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    },
    [parseVariantValues, groupVariantValuesByOption]
  );

  // Variant table columns
  const variantColumns: Column[] = useMemo(() => [
    {
      key: "sku",
      title: "SKU",
      dataIndex: "sku",
      width: 140,
      render: (value: unknown) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "barcode",
      title: "Barcode",
      dataIndex: "barcode",
      width: 120,
      render: (value: unknown) => (
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "variantValues",
      title: "Thuộc tính",
      width: 250,
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return formatVariantDisplay(item.variantValues);
      },
    },
    {
      key: "isActive",
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return (
          <Switch
            checked={item.isActive !== false}
            onChange={() => onToggleVariantActive(item)}
            size="small"
          />
        );
      },
    },
    {
      key: "actions",
      title: "Thao tác",
      width: 90,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return (
          <Space size={4}>
            <Tooltip title="Sửa">
              <EditOutlined
                style={{ color: "#1890ff", cursor: "pointer", fontSize: 14 }}
                onClick={() => onEditVariant(item)}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa biến thể?"
              description="Biến thể sẽ bị xóa."
              onConfirm={() => onDeleteVariant(item)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <DeleteOutlined
                  style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 14 }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ], [formatVariantDisplay, onEditVariant, onDeleteVariant, onToggleVariantActive]);

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 220px)" }}>
      {/* Left Panel - Products List */}
      <div
        style={{
          width: 320,
          minWidth: 280,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Input
              placeholder="Tìm sản phẩm..."
              prefix={<SearchOutlined style={{ color: "#999" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="small"
            />
          </div>
          <div style={{ fontWeight: 500, color: "#333", fontSize: 14 }}>
            <ShopOutlined style={{ marginRight: 6 }} />
            Danh sách sản phẩm ({filteredProducts.length})
          </div>
        </div>

        {/* Product List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {productsLoading ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <Spin />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có sản phẩm" />
            </div>
          ) : (
            <div>
              {filteredProducts.map((product) => {
                const count = variantCountByProduct[product._id] || 0;
                const isSelected = selectedProductId === product._id;

                return (
                  <div
                    key={product._id}
                    onClick={() => {
                      setInternalSelectedProductId(product._id);
                      onProductSelect(product._id);
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "10px 16px",
                      background: isSelected ? "#e6f7ff" : "transparent",
                      borderLeft: isSelected ? "3px solid #1890ff" : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Tooltip title={product.name}>
                            <div
                              style={{
                                fontWeight: 500,
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {product.name}
                            </div>
                          </Tooltip>
                          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                            {product.code}
                          </div>
                        </div>
                        <Badge
                          count={count}
                          style={{
                            backgroundColor: count > 0 ? "#1890ff" : "#d9d9d9",
                            fontSize: 10,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Variants of Selected Product */}
      <div
        style={{
          flex: 1,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {selectedProduct ? (
              <div>
                <div style={{ fontWeight: 500, color: "#333", fontSize: 14 }}>
                  <AppstoreOutlined style={{ marginRight: 6 }} />
                  Biến thể của: {selectedProduct.name}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {selectedProduct.code} • {selectedProductVariants.length} biến thể
                </div>
              </div>
            ) : (
              <div style={{ color: "#999", fontSize: 14 }}>
                Chọn một sản phẩm để xem biến thể
              </div>
            )}
          </div>

          {selectedProduct && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onAddVariant(selectedProduct._id)}
              size="small"
            >
              Thêm biến thể
            </Button>
          )}
        </div>

        {/* Product Variant Options Info */}
        {selectedProduct && selectedProductOptions.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              background: "#f6f8fa",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              Thuộc tính có sẵn:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedProductOptions.map((opt) => (
                <Tag key={opt._id} color="green">
                  {opt.name} ({opt.values.length})
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Variants Table */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {selectedProduct ? (
            selectedProductVariants.length > 0 ? (
              <DataTable
                columns={variantColumns}
                data={selectedProductVariants as unknown as Record<string, unknown>[]}
                loading={variantsLoading}
                rowKey="_id"
                pagination={false}
                emptyText="Chưa có biến thể nào"
                scroll={{ y: 400 }}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div style={{ marginBottom: 8 }}>Chưa có biến thể nào cho sản phẩm này</div>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => onAddVariant(selectedProduct._id)}
                    >
                      Thêm biến thể đầu tiên
                    </Button>
                  </div>
                }
              />
            )
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chọn một sản phẩm từ danh sách bên trái"
            />
          )}
        </div>
      </div>
    </div>
  );
}
