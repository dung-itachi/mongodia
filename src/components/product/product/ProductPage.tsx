/**
 * Product Page (Sprint 8.x)
 *
 * Quản lý sản phẩm.
 * Combo giờ quản lý theo Product ở trang riêng /products/[productId]/combos
 * (truy cập nhanh qua nút "Combo" ở mỗi row).
 */

"use client";

import { useState, useCallback } from "react";
import { Button, Tooltip } from "antd";
import { PlusOutlined, GiftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
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
import ProductManagementTable from "./ProductManagementTable";
import ProductForm from "./ProductForm";

export default function ProductPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductManagementItem | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  const { data, isLoading, refetch } = useProductManagement({
    warehouseId: selectedWarehouseId || undefined,
  });
  const { data: categoryData } = useCategoryList();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const products = data?.items ?? [];
  const warehouses = data?.warehouses ?? [];
  const categories = categoryData?.items ?? [];

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

  const handleWarehouseChange = useCallback((warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
  }, []);

  return (
    <PageContainer>
      <PageHeader title="Sản phẩm" subtitle="Quản lý sản phẩm" />

      <CardSection>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm sản phẩm
          </Button>
        </div>

        <ProductManagementTable
          data={products}
          warehouses={warehouses}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onOpenCombos={handleOpenCombos}
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={handleWarehouseChange}
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