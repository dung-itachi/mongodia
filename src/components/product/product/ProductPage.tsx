/**
 * Product Page (Sprint 8.x)
 *
 * Quản lý sản phẩm.
 * Combo giờ quản lý theo Product ở trang riêng /products/[productId]/combos
 * (truy cập nhanh qua nút "Combo" ở mỗi row).
 *
 * Sprint 8.4.2 - Bộ lọc:
 * - Tìm kiếm theo tên sản phẩm
 * - Lọc theo danh mục
 * - Lọc theo kho
 * - Lọc theo khoảng ngày (theo ngày nhập gần nhất)
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Tooltip } from "antd";
import { PlusOutlined, GiftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
import FilterBar from "@/components/common/filters/FilterBar";
import type { FilterItem } from "@/components/common/types";
import {
  useProductManagement,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type ProductManagementItem,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/hooks/useProductCrud";
import { useCategoryList } from "@/hooks/useCategories";
import { useDebounce } from "@/hooks/useDebounce";
import ProductManagementTable from "./ProductManagementTable";
import ProductForm from "./ProductForm";

type ProductFilters = {
  keyword: string;
  categoryCode: string;
  warehouseId: string;
  dateRange: [string, string] | undefined;
};

const DEFAULT_FILTERS: ProductFilters = {
  keyword: "",
  categoryCode: "",
  warehouseId: "",
  dateRange: undefined,
};

export default function ProductPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductManagementItem | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

  const debouncedKeyword = useDebounce(filters.keyword, 400);

  const { data, isLoading, refetch } = useProductManagement({
    warehouseId: filters.warehouseId || undefined,
    keyword: debouncedKeyword || undefined,
    categoryCode: filters.categoryCode || undefined,
    dateFrom: filters.dateRange?.[0],
    dateTo: filters.dateRange?.[1],
  });
  const { data: categoryData } = useCategoryList();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const products = useMemo(() => data?.items ?? [], [data?.items]);
  const warehouses = useMemo(() => data?.warehouses ?? [], [data?.warehouses]);
  const categories = useMemo(
    () => categoryData?.items ?? [],
    [categoryData?.items]
  );

  // Build filter items for the FilterBar
  const filterItems = useMemo<FilterItem[]>(
    () => [
      {
        type: "input",
        key: "keyword",
        label: "Tên sản phẩm",
        placeholder: "Tìm kiếm theo tên sản phẩm",
      },
      {
        type: "select",
        key: "categoryCode",
        label: "Danh mục",
        placeholder: "Tất cả danh mục",
        options: [
          { value: "", label: "Tất cả danh mục" },
          ...categories.map((c) => ({
            value: c.code,
            label: c.name,
          })),
        ],
      },
      {
        type: "select",
        key: "warehouseId",
        label: "Kho",
        placeholder: "Tất cả kho",
        options: [
          { value: "", label: "Tất cả kho" },
          ...warehouses.map((w) => ({
            value: w._id,
            label: `${w.code} - ${w.name}`,
          })),
        ],
      },
      {
        type: "dateRange",
        key: "dateRange",
        label: "Ngày nhập",
      },
    ],
    [categories, warehouses]
  );

  const filterValues = useMemo(
    () => ({
      keyword: filters.keyword,
      categoryCode: filters.categoryCode,
      warehouseId: filters.warehouseId,
      dateRange: filters.dateRange,
    }),
    [filters]
  );

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => {
      const next: ProductFilters = { ...prev };
      if ("keyword" in values) {
        next.keyword = (values.keyword as string | undefined) ?? "";
      }
      if ("categoryCode" in values) {
        next.categoryCode = (values.categoryCode as string | undefined) ?? "";
      }
      if ("warehouseId" in values) {
        next.warehouseId = (values.warehouseId as string | undefined) ?? "";
      }
      if ("dateRange" in values) {
        next.dateRange = values.dateRange as [string, string] | undefined;
      }
      return next;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: ProductManagementItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateProductInput | UpdateProductInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: values as UpdateProductInput },
          {
            onSuccess: () => {
              handleClose();
              void refetch();
            },
          }
        );
      } else {
        createMutation.mutate(values as CreateProductInput, {
          onSuccess: () => {
            handleClose();
            void refetch();
          },
        });
      }
    },
    [editingItem, createMutation, updateMutation, handleClose, refetch]
  );

  const handleDelete = useCallback(
    (item: ProductManagementItem) => {
      deleteMutation.mutate(item._id, {
        onSuccess: () => {
          void refetch();
        },
      });
    },
    [deleteMutation, refetch]
  );

  const handleToggleActive = useCallback(
    (item: ProductManagementItem) => {
      const getCategoryCode = (category: ProductManagementItem["category"]) => {
        if (typeof category === "object" && category !== null) {
          return (category as { code: string }).code;
        }
        return "";
      };

      updateMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            categoryCode: getCategoryCode(item.category),
            image: item.image,
            description: item.description,
            isActive: !item.isActive,
          },
        },
        {
          onSuccess: () => {
            void refetch();
          },
        }
      );
    },
    [updateMutation, refetch]
  );

  const handleOpenCombos = useCallback(
    (item: ProductManagementItem) => {
      router.push(`/products/${item._id}/combos`);
    },
    [router]
  );

  const hasActiveFilters =
    !!filters.keyword ||
    !!filters.categoryCode ||
    !!filters.warehouseId ||
    !!filters.dateRange;

  return (
    <PageContainer>
      <PageHeader title="Sản phẩm" subtitle="Quản lý sản phẩm" />

      <CardSection>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <FilterBar
              items={filterItems}
              values={filterValues}
              onChange={handleFilterChange}
              loading={isLoading}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {hasActiveFilters && (
              <Button onClick={handleResetFilters}>Đặt lại</Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              Thêm sản phẩm
            </Button>
          </div>
        </div>

        <ProductManagementTable
          data={products}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onOpenCombos={handleOpenCombos}
          selectedWarehouseId={filters.warehouseId}
        />
      </CardSection>

      <ProductForm
        open={drawerOpen}
        editingItem={editingItem}
        categories={categories}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}

// Re-export dùng cho table tương thích
export type { ProductManagementItem };

// Suppress unused warning for tooltip import (dùng trong table cell)
void Tooltip;
void GiftOutlined;
