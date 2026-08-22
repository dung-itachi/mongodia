/**
 * Category Page (Sprint 8.x - UI Polish)
 *
 * Page for managing Categories.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "antd";
import { PlusOutlined, AppstoreOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  StatGrid,
  StatCard,
} from "@/components/common";
import {
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryListItem,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/hooks/useCategories";
import CategoryTable from "./CategoryTable";
import CategoryForm from "./CategoryForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./categories.module.css";

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export default function CategoryPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryListItem | null>(null);

  const { data, isLoading, refetch } = useCategoryList();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categories = data?.items ?? [];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter((c) => c.isActive !== false).length;
    const inactiveCategories = totalCategories - activeCategories;

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
    };
  }, [categories]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: CategoryListItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateCategoryInput | UpdateCategoryInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: values as UpdateCategoryInput },
          {
            onSuccess: () => {
              handleClose();
              void refetch();
            },
          }
        );
      } else {
        createMutation.mutate(values as CreateCategoryInput, {
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
    (item: CategoryListItem) => {
      deleteMutation.mutate(item._id, {
        onSuccess: () => {
          void refetch();
        },
      });
    },
    [deleteMutation, refetch]
  );

  const handleToggleActive = useCallback(
    (item: CategoryListItem) => {
      updateMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            description: item.description,
            sortOrder: item.sortOrder,
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
        title={getTranslated("Danh mục sản phẩm")}
        subtitle={getTranslated("Quản lý danh mục sản phẩm")}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            {getTranslated("Thêm danh mục")}
          </Button>
        }
      />

      {/* Statistics Cards */}
      <CardSection style={{ padding: "16px 24px" }}>
        <StatGrid columns={3} gap={16} minItemWidth={160}>
          <StatCard
            title="Tổng danh mục"
            value={stats.totalCategories}
            icon={<AppstoreOutlined />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Đang hoạt động"
            value={stats.activeCategories}
            icon={<CheckCircleOutlined />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Đã vô hiệu"
            value={stats.inactiveCategories}
            icon={<StopOutlined />}
            color="orange"
            loading={isLoading}
          />
        </StatGrid>
      </CardSection>

      <CardSection>
        <CategoryTable
          data={categories}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </CardSection>

      <CategoryForm
        open={drawerOpen}
        editingItem={editingItem}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
