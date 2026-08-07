/**
 * Combo Page (Sprint 8.4.1)
 *
 * Page for managing Combos.
 */

"use client";

import { useState, useCallback } from "react";
import { Button, Select, Input } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
import { useComboList, useCreateCombo, useUpdateCombo, useDeleteCombo, type ComboListItem, type CreateComboInput, type UpdateComboInput } from "@/hooks/useCombos";
import { useProductVariantList } from "@/hooks/useVariants";
import ComboTable from "./ComboTable";
import ComboForm from "./ComboForm";

export default function ComboPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComboListItem | null>(null);

  // Filters
  const [filterProductId, setFilterProductId] = useState<string | undefined>();
  const [filterKeyword, setFilterKeyword] = useState<string | undefined>();

  // Data queries
  const { data, isLoading, refetch } = useComboList({
    productId: filterProductId,
    keyword: filterKeyword,
    limit: 1000,
  });
  const { data: variantsData } = useProductVariantList({ limit: 1000 });

  // Mutations
  const createMutation = useCreateCombo();
  const updateMutation = useUpdateCombo();
  const deleteMutation = useDeleteCombo();

  const combos = data?.items ?? [];
  const variants = variantsData?.items ?? [];

  // Extract unique products from variants for the filter dropdown
  const uniqueProductsMap = new Map<string, { _id: string; code: string; name: string }>();
  for (const variant of variants) {
    const productId = typeof variant.productId === "object" ? (variant.productId as { _id: string; code: string; name: string })._id : String(variant.productId);
    const productCode = typeof variant.productId === "object" ? (variant.productId as { code: string }).code : "";
    const productName = typeof variant.productId === "object" ? (variant.productId as { name: string }).name : "";
    if (productId && !uniqueProductsMap.has(productId)) {
      uniqueProductsMap.set(productId, { _id: productId, code: productCode, name: productName });
    }
  }
  const products = Array.from(uniqueProductsMap.values());

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: ComboListItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateComboInput | UpdateComboInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: values as UpdateComboInput },
          {
            onSuccess: () => {
              handleClose();
              void refetch();
            },
          }
        );
      } else {
        createMutation.mutate(values as CreateComboInput, {
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
    (item: ComboListItem) => {
      deleteMutation.mutate(item._id, {
        onSuccess: () => {
          void refetch();
        },
      });
    },
    [deleteMutation, refetch]
  );

  const handleToggleActive = useCallback(
    (item: ComboListItem) => {
      const getProductCode = (product: ComboListItem["product"]) => {
        if (typeof product === "object" && product !== null) {
          return (product as { code: string }).code;
        }
        return "";
      };

      const getCategoryCode = (category: ComboListItem["category"]) => {
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
            productCode: getProductCode(item.product),
            categoryCode: getCategoryCode(item.category),
            comboItems: [], // Required by schema but not used for toggle
            sellingPrice: item.sellingPrice,
            packageSize: item.packageSize,
            displayOrder: item.displayOrder,
            image: item.image,
            description: "",
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

  return (
    <PageContainer>
      <PageHeader
        title="Combo"
        subtitle="Quản lý combo sản phẩm"
      />

      <CardSection>
        <div style={{ marginBottom: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Select
            placeholder="Lọc theo sản phẩm"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 250 }}
            value={filterProductId}
            onChange={(v) => {
              setFilterProductId(v);
              void refetch();
            }}
            options={products.map((p) => ({
              label: `${p.code} - ${p.name}`,
              value: p._id,
            }))}
          />
          <Input.Search
            placeholder="Tìm kiếm combo..."
            style={{ width: 250 }}
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value || undefined)}
            onSearch={() => void refetch()}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm combo
          </Button>
        </div>

        <ComboTable
          data={combos}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </CardSection>

      <ComboForm
        open={drawerOpen}
        editingItem={editingItem}
        products={products}
        variants={variants}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
