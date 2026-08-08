"use client";

import { useCallback, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { PageContainer, PageHeader, CardSection } from "@/components/common";
import SearchInput from "@/components/common/inputs/SearchInput";
import {
  useChangeGiftInventory,
  useCreateGift,
  useDeleteGift,
  useGiftInventoryHistory,
  useGiftList,
  useUpdateGift,
  type CreateGiftInput,
  type GiftListItem,
  type UpdateGiftInput,
} from "@/hooks/useGifts";
import GiftForm from "./GiftForm";
import GiftInventoryDrawer from "./GiftInventoryDrawer";
import GiftTable from "./GiftTable";

type InventoryDrawerMode = "IMPORT" | "ADJUSTMENT" | "HISTORY" | null;

export default function GiftPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GiftListItem | null>(null);
  const [inventoryGift, setInventoryGift] = useState<GiftListItem | null>(null);
  const [inventoryMode, setInventoryMode] = useState<InventoryDrawerMode>(null);

  const { data, isLoading, refetch } = useGiftList({ search });
  const { data: historyData, isLoading: historyLoading } = useGiftInventoryHistory(
    inventoryMode === "HISTORY" ? inventoryGift?._id ?? null : null
  );
  const createMutation = useCreateGift();
  const updateMutation = useUpdateGift();
  const deleteMutation = useDeleteGift();
  const inventoryMutation = useChangeGiftInventory();
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
          { onSuccess: handleClose }
        );
      } else {
        createMutation.mutate(values as CreateGiftInput, { onSuccess: handleClose });
      }
    },
    [createMutation, editingItem, handleClose, updateMutation]
  );

  const handleDelete = useCallback(
    (item: GiftListItem) => deleteMutation.mutate(item._id),
    [deleteMutation]
  );

  const handleToggleActive = useCallback(
    (item: GiftListItem) => {
      updateMutation.mutate({
        id: item._id,
        input: { name: item.name, isActive: !item.isActive },
      });
    },
    [updateMutation]
  );

  const openInventory = useCallback((item: GiftListItem, mode: Exclude<InventoryDrawerMode, null>) => {
    setInventoryGift(item);
    setInventoryMode(mode);
  }, []);

  const closeInventory = useCallback(() => {
    setInventoryMode(null);
    setInventoryGift(null);
  }, []);

  const handleInventorySubmit = useCallback(
    (values: { quantity: number; note: string; direction?: "INCREASE" | "DECREASE" }) => {
      if (!inventoryGift || !inventoryMode || inventoryMode === "HISTORY") return;
      inventoryMutation.mutate(
        {
          id: inventoryGift._id,
          input:
            inventoryMode === "IMPORT"
              ? { operation: "IMPORT", quantity: values.quantity, note: values.note }
              : {
                  operation: "ADJUSTMENT",
                  direction: values.direction ?? "INCREASE",
                  quantity: values.quantity,
                  note: values.note,
                },
        },
        {
          onSuccess: () => {
            closeInventory();
            void refetch();
          },
        }
      );
    },
    [closeInventory, inventoryGift, inventoryMode, inventoryMutation, refetch]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý quà tặng"
        subtitle="Theo dõi tồn kho quà tặng, tách riêng khỏi Product và Order"
      />
      <CardSection>
        <div style={{ marginBottom: 16, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm quà..." />
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>Thêm quà</Button>
        </div>

        <GiftTable
          data={gifts}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onImport={(item) => openInventory(item, "IMPORT")}
          onAdjust={(item) => openInventory(item, "ADJUSTMENT")}
          onHistory={(item) => openInventory(item, "HISTORY")}
        />
      </CardSection>

      <GiftForm
        open={drawerOpen}
        editingItem={editingItem}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />

      <GiftInventoryDrawer
        mode={inventoryMode ?? "HISTORY"}
        gift={inventoryGift}
        open={inventoryMode !== null}
        loading={inventoryMutation.isPending}
        history={historyData?.items ?? []}
        historyLoading={historyLoading}
        onClose={closeInventory}
        onSubmit={handleInventorySubmit}
      />
    </PageContainer>
  );
}
