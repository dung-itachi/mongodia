/**
 * Product Page (Sprint 8.4.1)
 *
 * Page for managing Products with Combo info, Inventory stats, and Order stats.
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  const handleViewCombos = useCallback((item: ProductManagementItem) => {
    // TODO: Open combo list modal or navigate to combos page
    console.log("View combos for:", item.name, item.combos);
  }, []);

  const handleWarehouseChange = useCallback((warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Sản phẩm"
        subtitle="Quản lý sản phẩm"
      />

      <CardSection>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
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
          onViewCombos={handleViewCombos}
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
