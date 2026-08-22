/**
 * Product Variants Tree Component
 *
 * Three-level nested tree:
 *
 *   ▼ Sản phẩm 1
 *      ├── ▼ Thuộc tính
 *      │     ├── Giá trị
 *      │     └── Giá trị
 *      └── ▼ Thuộc tính
 *            └── Giá trị
 *
 * - Product (level 1): view product (link), assign attribute (AssignToProduct)
 * - Attribute (level 2): expand/collapse, edit, delete, add value
 * - Value (level 3): edit, delete
 *
 * Search filters across all levels and auto-expands matching branches.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Input, Popconfirm, Space, Switch, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  SearchOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type {
  VariantOptionItem,
  VariantValueItem,
  ProductTreeNode,
} from "@/hooks/useVariants";
import styles from "./variants.module.css";

export interface ProductVariantsTreeProps {
  products: ProductTreeNode[];
  loading?: boolean;

  // Attribute handlers
  onEditOption?: (opt: VariantOptionItem) => void;
  onDeleteOption?: (opt: VariantOptionItem) => void;
  onToggleOptionActive?: (opt: VariantOptionItem) => void;

  // Value handlers
  onAddValue?: (opt: VariantOptionItem) => void;
  onEditValue?: (val: VariantValueItem) => void;
  onDeleteValue?: (val: VariantValueItem) => void;
  onToggleValueActive?: (val: VariantValueItem) => void;

  // Triggered when user clicks "Gán thuộc tính" on a product.
  onAssignOption?: (productId: string) => void;
}

export default function ProductVariantsTree({
  products,
  loading,
  onEditOption,
  onDeleteOption,
  onToggleOptionActive,
  onAddValue,
  onEditValue,
  onDeleteValue,
  onToggleValueActive,
  onAssignOption,
}: ProductVariantsTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Filter tree by search across product/option/value name and code
  const { filteredProducts, matchedIds } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return { filteredProducts: products, matchedIds: new Set<string>() };
    }

    const matched = new Set<string>();
    const result: ProductTreeNode[] = [];

    for (const p of products) {
      const matchProduct =
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

      const matchedOptions = p.variantOptions.filter((opt) => {
        const matchOpt =
          opt.name.toLowerCase().includes(q) ||
          opt.code.toLowerCase().includes(q);
        const hasMatchValue = opt.values.some(
          (v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
        );
        return matchOpt || hasMatchValue;
      });

      if (matchProduct || matchedOptions.length > 0) {
        matched.add(p._id);
        matchedOptions.forEach((o) => {
          matched.add(o._id);
          // also mark matched values
          o.values.forEach((v) => {
            if (
              v.name.toLowerCase().includes(q) ||
              v.code.toLowerCase().includes(q)
            ) {
              matched.add(v._id);
            }
          });
        });
        result.push({
          ...p,
          variantOptions: matchedOptions,
        });
      }
    }

    return { filteredProducts: result, matchedIds: matched };
  }, [products, search]);

  // Effective expansion: when searching, force-expand all matched branches
  const effectiveExpanded = useMemo(() => {
    const q = search.trim();
    if (!q) return expanded;
    return { ...expanded, ...Object.fromEntries(Array.from(matchedIds).map((id) => [id, true])) };
  }, [search, matchedIds, expanded]);

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    products.forEach((p) => {
      next[p._id] = true;
      p.variantOptions.forEach((o) => {
        next[o._id] = true;
      });
    });
    setExpanded(next);
  }, [products]);

  const collapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  const highlight = useCallback((text: string): React.ReactNode => {
    const q = search.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className={styles.searchHighlight}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }, [search]);

  return (
    <div className={styles.treeWrapper}>
      <div className={styles.treeToolbar}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm sản phẩm, thuộc tính hoặc giá trị..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 360 }}
        />
        <Space>
          <Button size="small" onClick={expandAll}>
            Mở rộng tất cả
          </Button>
          <Button size="small" onClick={collapseAll}>
            Thu gọn tất cả
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className={styles.treeEmpty}>Đang tải...</div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.treeEmpty}>
          {search.trim()
            ? "Không tìm thấy kết quả phù hợp"
            : "Chưa có sản phẩm nào được gán thuộc tính biến thể"}
        </div>
      ) : (
        <div className={styles.treeList}>
          {filteredProducts.map((product) => {
            const isProductExpanded = !!effectiveExpanded[product._id];
            return (
              <div key={product._id} className={styles.treeNode}>
                {/* Level 1: Product */}
                <div className={styles.treeNodeHeaderLv1}>
                  <span
                    className={styles.treeToggle}
                    onClick={() => toggleExpand(product._id)}
                    role="button"
                    aria-label={isProductExpanded ? "Thu gọn" : "Mở rộng"}
                  >
                    {isProductExpanded ? (
                      <CaretDownOutlined />
                    ) : (
                      <CaretRightOutlined />
                    )}
                  </span>
                  <span className={styles.treeNodeIconLv1} aria-hidden>
                    <span className={styles.treeNodeIconBadge}>P</span>
                  </span>
                  <span className={styles.treeNodeTitle}>
                    <Tag color="blue" className={styles.treeLevelTag}>
                      Sản phẩm
                    </Tag>
                    <strong>{highlight(product.name)}</strong>
                    <span className={styles.treeNodeCode}>
                      ({highlight(product.code)})
                    </span>
                    <span className={styles.treeNodeCount}>
                      {product.variantOptions.length} thuộc tính
                    </span>
                  </span>
                  <span className={styles.treeNodeActions}>
                    {onAssignOption && (
                      <Button
                        type="link"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => onAssignOption(product._id)}
                      >
                        Gán thuộc tính
                      </Button>
                    )}
                    <Button
                      type="text"
                      size="small"
                      onClick={() =>
                        window.open(
                          `/products/${product._id}/edit`,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Xem SP
                    </Button>
                  </span>
                </div>

                {/* Level 2 & 3: Options + Values */}
                {isProductExpanded && (
                  <div className={styles.treeChildren}>
                    {product.variantOptions.length === 0 ? (
                      <div className={styles.treeEmptyValue}>
                        Sản phẩm chưa có thuộc tính nào
                      </div>
                    ) : (
                      product.variantOptions.map((opt) => {
                        const isOptExpanded = !!effectiveExpanded[opt._id];
                        return (
                          <div key={opt._id} className={styles.treeNode}>
                            {/* Level 2: Attribute */}
                            <div className={styles.treeNodeHeaderLv2}>
                              <span
                                className={styles.treeToggle}
                                onClick={() => toggleExpand(opt._id)}
                                role="button"
                                aria-label={
                                  isOptExpanded ? "Thu gọn" : "Mở rộng"
                                }
                              >
                                {isOptExpanded ? (
                                  <CaretDownOutlined />
                                ) : (
                                  <CaretRightOutlined />
                                )}
                              </span>
                              <span className={styles.treeNodeIcon} aria-hidden>
                                <span className={styles.treeNodeIconBadge}>
                                  A
                                </span>
                              </span>
                              <span className={styles.treeNodeTitle}>
                                <Tag color="purple" className={styles.treeLevelTag}>
                                  Thuộc tính
                                </Tag>
                                <strong>{highlight(opt.name)}</strong>
                                <span className={styles.treeNodeCode}>
                                  ({highlight(opt.code)})
                                </span>
                                <span className={styles.treeNodeCount}>
                                  {opt.values.length} giá trị
                                </span>
                              </span>
                              <span className={styles.treeNodeActions}>
                                {onToggleOptionActive && (
                                  <Switch
                                    size="small"
                                    checked={opt.isActive}
                                    onChange={() =>
                                      onToggleOptionActive({
                                        _id: opt._id,
                                        code: opt.code,
                                        name: opt.name,
                                        sortOrder: opt.sortOrder,
                                        isActive: opt.isActive,
                                      })
                                    }
                                  />
                                )}
                                {onAddValue && (
                                  <Button
                                    type="link"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() =>
                                      onAddValue({
                                        _id: opt._id,
                                        code: opt.code,
                                        name: opt.name,
                                        sortOrder: opt.sortOrder,
                                        isActive: opt.isActive,
                                      })
                                    }
                                  >
                                    Thêm giá trị
                                  </Button>
                                )}
                                {onEditOption && (
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() =>
                                      onEditOption({
                                        _id: opt._id,
                                        code: opt.code,
                                        name: opt.name,
                                        sortOrder: opt.sortOrder,
                                        isActive: opt.isActive,
                                      })
                                    }
                                  />
                                )}
                                {onDeleteOption && (
                                  <Popconfirm
                                    title="Xóa thuộc tính?"
                                    description={
                                      <>
                                        Thuộc tính sẽ bị xóa.{" "}
                                        {opt.values.length > 0
                                          ? `Tất cả ${opt.values.length} giá trị cũng sẽ bị xóa.`
                                          : ""}
                                      </>
                                    }
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() =>
                                      onDeleteOption({
                                        _id: opt._id,
                                        code: opt.code,
                                        name: opt.name,
                                        sortOrder: opt.sortOrder,
                                        isActive: opt.isActive,
                                      })
                                    }
                                  >
                                    <Button
                                      type="text"
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                    />
                                  </Popconfirm>
                                )}
                              </span>
                            </div>

                            {/* Level 3: Values */}
                            {isOptExpanded && (
                              <div className={styles.treeChildrenLv3}>
                                {opt.values.length === 0 ? (
                                  <div className={styles.treeEmptyValue}>
                                    Chưa có giá trị nào
                                  </div>
                                ) : (
                                  opt.values.map((v) => (
                                    <div
                                      key={v._id}
                                      className={styles.treeNodeChildLv3}
                                    >
                                      <span
                                        className={styles.treeNodeIcon}
                                        aria-hidden
                                      >
                                        <span
                                          className={
                                            styles.treeNodeIconBadgeSmall
                                          }
                                        >
                                          V
                                        </span>
                                      </span>
                                      <span className={styles.treeNodeTitle}>
                                        <Tag color="orange" className={styles.treeLevelTag}>
                                          Giá trị
                                        </Tag>
                                        {highlight(v.name)}
                                        <span className={styles.treeNodeCode}>
                                          ({highlight(v.code)})
                                        </span>
                                      </span>
                                      <span className={styles.treeNodeActions}>
                                        {onToggleValueActive && (
                                          <Switch
                                            size="small"
                                            checked={v.isActive}
                                            onChange={() =>
                                              onToggleValueActive({
                                                _id: v._id,
                                                code: v.code,
                                                name: v.name,
                                                variantOptionId: opt._id,
                                                sortOrder: v.sortOrder,
                                                isActive: v.isActive,
                                              })
                                            }
                                          />
                                        )}
                                        {onEditValue && (
                                          <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() =>
                                              onEditValue({
                                                _id: v._id,
                                                code: v.code,
                                                name: v.name,
                                                variantOptionId: opt._id,
                                                sortOrder: v.sortOrder,
                                                isActive: v.isActive,
                                              })
                                            }
                                          />
                                        )}
                                        {onDeleteValue && (
                                          <Popconfirm
                                            title="Xóa giá trị?"
                                            description="Giá trị biến thể sẽ bị xóa."
                                            okText="Xóa"
                                            cancelText="Hủy"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() =>
                                              onDeleteValue({
                                                _id: v._id,
                                                code: v.code,
                                                name: v.name,
                                                variantOptionId: opt._id,
                                                sortOrder: v.sortOrder,
                                                isActive: v.isActive,
                                              })
                                            }
                                          >
                                            <Button
                                              type="text"
                                              size="small"
                                              danger
                                              icon={<DeleteOutlined />}
                                            />
                                          </Popconfirm>
                                        )}
                                      </span>
                                    </div>
                                  ))
                                )}
                                {onAddValue && search.trim() === "" && (
                                  <div className={styles.treeAddRow}>
                                    <Button
                                      type="dashed"
                                      size="small"
                                      icon={<PlusOutlined />}
                                      onClick={() =>
                                        onAddValue({
                                          _id: opt._id,
                                          code: opt.code,
                                          name: opt.name,
                                          sortOrder: opt.sortOrder,
                                          isActive: opt.isActive,
                                        })
                                      }
                                    >
                                      Thêm giá trị
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}