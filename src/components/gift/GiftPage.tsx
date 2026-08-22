"use client";

import { useCallback, useState, useMemo } from "react";
import { Button } from "antd";
import { PlusOutlined, GiftOutlined, AppstoreOutlined, InboxOutlined, SwapOutlined } from "@ant-design/icons";
import { PageContainer, PageHeader, CardSection, StatGrid, StatCard } from "@/components/common";
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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./gifts.module.css";

type InventoryDrawerMode = "IMPORT" | "ADJUSTMENT" | "HISTORY" | null;

export default function GiftPage() {
  const lang = useLanguageStore((s) => s.language);
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalGifts = gifts.length;
    const activeGifts = gifts.filter((g) => g.isActive !== false).length;
    const inactiveGifts = totalGifts - activeGifts;
    const totalInventory = gifts.reduce((sum, g) => sum + (g.inventory ?? 0), 0);

    return {
      totalGifts,
      activeGifts,
      inactiveGifts,
      totalInventory,
    };
  }, [gifts]);

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
        title={t("Quản lý quà tặng", lang)}
        subtitle={t("Theo dõi tồn kho quà tặng, tách riêng khỏi Product và Order", lang)}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            {t("Thêm quà tặng", lang)}
          </Button>
        }
      />

      {/* Statistics Cards */}
      <CardSection style={{ padding: "16px 24px" }}>
        <StatGrid columns={4} gap={16} minItemWidth={160}>
          <StatCard
            title={t("Tổng quà tặng", lang)}
            value={stats.totalGifts}
            icon={<GiftOutlined />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t("Đang hoạt động", lang)}
            value={stats.activeGifts}
            icon={<AppstoreOutlined />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title={t("Đã vô hiệu", lang)}
            value={stats.inactiveGifts}
            icon={<InboxOutlined />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title={t("Tổng tồn kho", lang)}
            value={stats.totalInventory}
            icon={<SwapOutlined />}
            color="purple"
            loading={isLoading}
          />
        </StatGrid>
      </CardSection>

      <CardSection>
        <div className={styles.toolbar}>
          <div className={styles.searchArea}>
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Tìm kiếm quà tặng...", lang)}
            />
          </div>
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