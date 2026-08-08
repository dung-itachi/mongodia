/**
 * Gift Page (Sprint 8.x - Gift Management)
 *
 * Trang quản lý quà tặng.
 * Quà tặng KHÔNG phải Product.
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
import SearchInput from "@/components/common/inputs/SearchInput";
import {
  useGiftList,
  useCreateGift,
  useUpdateGift,
  useDeleteGift,
  type GiftListItem,
  type CreateGiftInput,
  type UpdateGiftInput,
} from "@/hooks/useGifts";
import GiftTable from "./GiftTable";
import GiftForm from "./GiftForm";

export default function GiftPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GiftListItem | null>(null);

  const { data, isLoading, refetch } = useGiftList({ search });
  const createMutation = useCreateGift();
  const updateMutation = useUpdateGift();
  const deleteMutation = useDeleteGift();

  const gifts = data?.items ?? [];

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: GiftListItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateGiftInput | UpdateGiftInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: values as UpdateGiftInput },
          {
            onSuccess: () => {
              handleClose();
              void refetch();
            },
          }
        );
      } else {
        createMutation.mutate(values as CreateGiftInput, {
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
    (item: GiftListItem) => {
      deleteMutation.mutate(item._id, {
        onSuccess: () => {
          void refetch();
        },
      });
    },
    [deleteMutation, refetch]
  );

  const handleToggleActive = useCallback(
    (item: GiftListItem) => {
      updateMutation.mutate(
        {
          id: item._id,
          input: {
            name: item.name,
            stockQuantity: item.stockQuantity,
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
        title="Quản lý quà tặng"
        subtitle="Quà tặng tách riêng khỏi Product - không bán, không có giá"
      />

      <CardSection>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, maxWidth: 320 }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm quà..."
            />
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Thêm quà
          </Button>
        </div>

        <GiftTable
          data={gifts}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </CardSection>

      <GiftForm
        open={drawerOpen}
        editingItem={editingItem}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
