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

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button, App } from "antd";
import { PlusOutlined, GiftOutlined, AppstoreOutlined, InboxOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  PageContainer,
  PageHeader,
  CardSection,
  StatGrid,
  StatCard,
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
import type { CategoryListItem } from "@/hooks/useCategories";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./products.module.css";

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
  const lang = useLanguageStore((s) => s.language);
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductManagementItem | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  const debouncedKeyword = useDebounce(filters.keyword, 400);

  const { data, isLoading, refetch } = useProductManagement({
    warehouseId: filters.warehouseId || undefined,
    keyword: debouncedKeyword || undefined,
    categoryCode: filters.categoryCode || undefined,
    dateFrom: filters.dateRange?.[0],
    dateTo: filters.dateRange?.[1],
  });
  const { data: categoryData } = useCategoryList();

  // Sync categories from API
  useEffect(() => {
    if (categoryData?.items) {
      setCategories(categoryData.items);
    }
  }, [categoryData]);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const products = useMemo(() => data?.items ?? [], [data?.items]);
  const warehouses = useMemo(() => data?.warehouses ?? [], [data?.warehouses]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive !== false).length;
    const inactiveProducts = totalProducts - activeProducts;
    const totalCategories = categories.length;

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalCategories,
    };
  }, [products, categories]);

  // Build filter items for the FilterBar
  const filterItems = useMemo<FilterItem[]>(
    () => [
      {
        type: "input",
        key: "keyword",
        label: t("Tên sản phẩm", lang),
        placeholder: t("Tìm kiếm theo tên sản phẩm", lang),
      },
      {
        type: "select",
        key: "categoryCode",
        label: t("Danh mục", lang),
        placeholder: t("Tất cả danh mục", lang),
        options: [
          { value: "", label: t("Tất cả danh mục", lang) },
          ...categories.map((c) => ({
            value: c.code,
            label: c.name,
          })),
        ],
      },
      {
        type: "select",
        key: "warehouseId",
        label: t("Kho", lang),
        placeholder: t("Tất cả kho", lang),
        options: [
          { value: "", label: t("Tất cả kho", lang) },
          ...warehouses.map((w) => ({
            value: w._id,
            label: `${w.code} - ${w.name}`,
          })),
        ],
      },
      {
        type: "dateRange",
        key: "dateRange",
        label: t("Ngày nhập", lang),
      },
    ],
    [categories, warehouses, lang]
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

  const handleCategoriesChange = useCallback((newCategories: CategoryListItem[]) => {
    setCategories(newCategories);
  }, []);

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
      <PageHeader
        title={t("Sản phẩm", lang)}
        subtitle={t("Quản lý và theo dõi sản phẩm trong hệ thống", lang)}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            {t("Thêm sản phẩm", lang)}
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div style={{ padding: "16px 24px" }}><CardSection>
        <StatGrid columns={4} gap={16} minItemWidth={160}>
          <StatCard
            title={t("Tổng sản phẩm", lang)}
            value={stats.totalProducts}
            icon={<AppstoreOutlined />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t("Đang hoạt động", lang)}
            value={stats.activeProducts}
            icon={<ThunderboltOutlined />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title={t("Đã vô hiệu", lang)}
            value={stats.inactiveProducts}
            icon={<InboxOutlined />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title={t("Danh mục", lang)}
            value={stats.totalCategories}
            icon={<GiftOutlined />}
            color="purple"
            loading={isLoading}
          />
        </StatGrid>
      </CardSection></div>

      {/* Filter Section */}
      <CardSection>
        <div className={styles.toolbar}>
          <div className={styles.filterArea}>
            <FilterBar
              items={filterItems}
              values={filterValues}
              onChange={handleFilterChange}
              loading={isLoading}
            />
          </div>
          <div className={styles.actions}>
            {hasActiveFilters && (
              <Button onClick={handleResetFilters}>{t("Đặt lại", lang)}</Button>
            )}
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
        onCategoriesChange={handleCategoriesChange}
      />
    </PageContainer>
  );
}
