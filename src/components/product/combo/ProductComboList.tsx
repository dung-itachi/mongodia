/**
 * Product Combo List Component
 *
 * Hiển thị danh sách combo theo sản phẩm với layout bảng phân nhóm.
 * - Khi ít sản phẩm: hiển thị card để dễ nhìn
 * - Khi nhiều sản phẩm: hiển thị bảng có phân nhóm theo danh mục
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Switch, Image, Tag, Empty, Space, Typography, Badge, Card, Collapse, Tooltip, Segmented } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  PlusOutlined,
  DownOutlined,
  UpOutlined,
  RightOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { ComboListItem } from "@/hooks/useCombos";
import type { ProductListItem } from "@/hooks/useProductCrud";
import { formatMNT } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { Text } = Typography;

const COMBO_PREVIEW_COUNT = 4;

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

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  products: {
    product: ProductListItem;
    combos: ComboListItem[];
  }[];
}

type ViewMode = "table" | "cards";

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
  const lang = useLanguageStore((s) => s.language);
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showAllCombos, setShowAllCombos] = useState<Set<string>>(new Set());

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

  const groupedData = useMemo((): CategoryGroup[] => {
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

    // Group products by category
    const categoryMap = new Map<string, CategoryGroup>();

    filteredProducts.forEach((product) => {
      const category = product.category;
      const categoryId = getProductCategoryId(product);
      const categoryName = getProductName(category);
      const categoryCode = getProductCode(category);

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName: categoryName || t("Không phân loại", lang),
          categoryCode: categoryCode || "UNCAT",
          products: [],
        });
      }

      const combosForProduct = combos.filter((combo) => {
        const comboProductId =
          typeof combo.product === "object" && combo.product !== null
            ? (combo.product as { _id: string })._id
            : String(combo.product);
        return comboProductId === product._id;
      });

      categoryMap.get(categoryId)!.products.push({
        product,
        combos: combosForProduct,
      });
    });

    return Array.from(categoryMap.values());
  }, [products, combos, filterCategoryId, filterKeyword]);

  const comboColumns = [
    {
      key: "image",
      width: 50,
      render: (_: unknown, record: ComboListItem) => {
        if (record.image) {
          return (
            <Image
              src={record.image}
              alt={record.name}
              width={32}
              height={32}
              style={{ objectFit: "cover", borderRadius: 6 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
              preview={{ mask: <EyeOutlined /> }}
            />
          );
        }
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GiftOutlined style={{ color: "#fff", fontSize: 14 }} />
          </div>
        );
      },
    },
    {
      key: "code",
      title: t("Mã", lang),
      dataIndex: "code",
      width: 100,
      render: (code: string) => (
        <Text style={{ fontFamily: "monospace", fontSize: 12 }} copyable={{ text: code }}>
          {code}
        </Text>
      ),
    },
    {
      key: "name",
      title: t("Tên combo", lang),
      dataIndex: "name",
      render: (name: string, record: ComboListItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      key: "packageQuantity",
      title: t("SL SP", lang),
      dataIndex: "packageQuantity",
      width: 60,
      align: "center" as const,
    },
    {
      key: "giftQuantity",
      title: t("SL quà", lang),
      dataIndex: "giftQuantity",
      width: 70,
      align: "center" as const,
      render: (value: number) =>
        value > 0 ? (
          <Tag color="purple" style={{ margin: 0 }}>{value}</Tag>
        ) : (
          <span style={{ color: "#d9d9d9" }}>—</span>
        ),
    },
    {
      key: "sellingPrice",
      title: t("Giá bán", lang),
      dataIndex: "sellingPrice",
      width: 110,
      align: "right" as const,
      render: (value: number) => (
        <Text style={{ color: "#52c41a", fontWeight: 600 }}>
          {formatMNT(value)}
        </Text>
      ),
    },
    {
      key: "isActive",
      title: t("TT", lang),
      dataIndex: "isActive",
      width: 70,
      align: "center" as const,
      render: (_: unknown, record: ComboListItem) => {
        const active = record.isActive !== false;
        return (
          <Tooltip title={active ? t("Đang hoạt động", lang) : t("Vô hiệu", lang)}>
            <Switch
              checked={active}
              onChange={(checked) => onToggleActive?.(record, checked)}
              size="small"
            />
          </Tooltip>
        );
      },
    },
    {
      key: "actions",
      title: "",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: ComboListItem) => (
        <Space size={2}>
          <Tooltip title={t("Sửa", lang)}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEditCombo(record)} />
          </Tooltip>
          <Tooltip title={t("Xóa", lang)}>
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => onDeleteCombo(record)} danger />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Render card view for small number of products
  const renderCardView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {groupedData.flatMap(({ categoryName, categoryCode, products: categoryProducts }) =>
        categoryProducts.map(({ product, combos: productCombos }) => {
          const productId = product._id;
          const isExpanded = expandedProducts.has(productId);
          const activeComboCount = productCombos.filter(c => c.isActive !== false).length;

          return (
            <Card
              key={productId}
              size="small"
              styles={{ body: { padding: 0 } }}
              className="product-card"
            >
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  borderBottom: isExpanded ? "1px solid #f0f0f0" : "none",
                }}
                onClick={() => {
                  const newSet = new Set(expandedProducts);
                  if (newSet.has(productId)) {
                    newSet.delete(productId);
                  } else {
                    newSet.add(productId);
                  }
                  setExpandedProducts(newSet);
                }}
              >
                <Space size={12}>
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={40}
                      height={40}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <GiftOutlined style={{ color: "#fff", fontSize: 18 }} />
                    </div>
                  )}
                  <div>
                    <Space>
                      <Text strong>{product.name}</Text>
                      {product.isActive === false && <Tag color="default" style={{ margin: 0 }}>Inactive</Tag>}
                    </Space>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      {product.code} • {categoryName}
                    </div>
                  </div>
                </Space>
                  <Space size={16}>
                  <Badge count={activeComboCount} style={{ backgroundColor: "#1890ff" }} showZero>
                    <Text type="secondary" style={{ fontSize: 12 }}>{t("combo", lang)}</Text>
                  </Badge>
                  {isExpanded ? <DownOutlined /> : <RightOutlined />}
                </Space>
              </div>

              {isExpanded && (
                <div style={{ padding: 12 }}>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => onAddCombo(productId)}>
                      {t("Thêm combo", lang)}
                    </Button>
                  </div>
                  {productCombos.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("Chưa có combo nào", lang)} />
                  ) : (
                    <Table
                      columns={comboColumns}
                      dataSource={productCombos}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      loading={loading}
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );

  // Render table view for large number of products
  const renderTableView = () => (
    <Collapse
      ghost
      activeKey={Array.from(expandedCategories)}
      onChange={(keys) => setExpandedCategories(new Set(keys as string[]))}
      expandIcon={({ isActive }) =>
        isActive ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />
      }
      items={groupedData.map(({ categoryId, categoryName, categoryCode, products: categoryProducts }) => {
        const totalCombos = categoryProducts.reduce((sum, p) => sum + p.combos.length, 0);
        const activeCombos = categoryProducts.reduce(
          (sum, p) => sum + p.combos.filter(c => c.isActive !== false).length,
          0
        );

        return {
          key: categoryId,
          label: (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 8 }}>
              <Space>
                <Tag color="blue">{categoryCode}</Tag>
                <Text strong>{categoryName}</Text>
              </Space>
              <Space size={16}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {activeCombos}/{totalCombos} {t("combo active", lang)}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {categoryProducts.length} {t("sản phẩm", lang)}
                </Text>
              </Space>
            </div>
          ),
          children: (
            <div style={{ marginLeft: 24 }}>
              {categoryProducts.map(({ product, combos: productCombos }) => {
                const productId = product._id;

                return (
                  <div
                    key={productId}
                    style={{
                      marginBottom: 16,
                      border: "1px solid #f0f0f0",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "#fafbfc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <Space size={12}>
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={32}
                            height={32}
                            style={{ objectFit: "cover", borderRadius: 6 }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
                          />
                        ) : (
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <GiftOutlined style={{ color: "#fff", fontSize: 14 }} />
                          </div>
                        )}
                        <div>
                          <Space>
                            <Text strong style={{ fontSize: 14 }}>{product.name}</Text>
                            {product.isActive === false && (
                              <Tag color="default" style={{ margin: 0 }}>Inactive</Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{product.code}</Text>
                        </div>
                      </Space>
                      <Space>
                        <Badge count={productCombos.length} style={{ backgroundColor: "#1890ff" }} showZero>
                          <Text type="secondary" style={{ fontSize: 12 }}>{t("combo", lang)}</Text>
                        </Badge>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddCombo(productId);
                          }}
                        >
                          {t("Thêm", lang)}
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/products/${productId}/combos`);
                          }}
                        >
                          {t("Chi tiết", lang)}
                        </Button>
                      </Space>
                    </div>
                    {productCombos.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center" }}>
                        <Text type="secondary">{t("Chưa có combo nào", lang)}</Text>
                      </div>
                    ) : (
                      <>
                        <Table
                          columns={comboColumns}
                          dataSource={showAllCombos.has(productId) ? productCombos : productCombos.slice(0, COMBO_PREVIEW_COUNT)}
                          rowKey="_id"
                          pagination={false}
                          size="small"
                          loading={loading}
                          scroll={{ x: 650 }}
                        />
                        {productCombos.length > COMBO_PREVIEW_COUNT && (
                          <div style={{ padding: "8px 16px", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
                            <Button
                              type="link"
                              size="small"
                              icon={showAllCombos.has(productId) ? <UpOutlined /> : <DownOutlined />}
                              onClick={() => {
                                const newSet = new Set(showAllCombos);
                                if (newSet.has(productId)) {
                                  newSet.delete(productId);
                                } else {
                                  newSet.add(productId);
                                }
                                setShowAllCombos(newSet);
                              }}
                            >
                              {showAllCombos.has(productId)
                                ? t("Thu gọn", lang)
                                : `${t("Xem thêm", lang)} ${productCombos.length - COMBO_PREVIEW_COUNT} ${t("combo", lang)}`}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        };
      })}
    />
  );

  return (
    <div className="product-combo-list">
      {/* View Mode Toggle */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as ViewMode)}
          options={[
            {
              label: (
                <Space size={4}>
                  <UnorderedListOutlined />
                  <span>{t("Bảng", lang)}</span>
                </Space>
              ),
              value: "table",
            },
            {
              label: (
                <Space size={4}>
                  <AppstoreOutlined />
                  <span>{t("Card", lang)}</span>
                </Space>
              ),
              value: "cards",
            },
          ]}
        />
      </div>

      {groupedData.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("Không tìm thấy sản phẩm nào", lang)}
          style={{ padding: "60px 0" }}
        />
      ) : viewMode === "cards" ? (
        renderCardView()
      ) : (
        renderTableView()
      )}
    </div>
  );
}
