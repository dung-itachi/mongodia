"use client";

import { useCallback, useState } from "react";
import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { PageContainer, PageHeader, CardSection } from "@/components/common";
import {
  useAdminNotificationList,
  useCreateNotification,
  useDeleteNotification,
  useTogglePin,
  useUpdateNotification,
} from "@/hooks/useNotificationsAdmin";
import type {
  CreateNotificationInput,
  NotificationAdminItem,
  UpdateNotificationInput,
} from "@/types/notification";
import NotificationFormDrawer from "./NotificationFormDrawer";
import NotificationTable from "./NotificationTable";

export default function NotificationManagementPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [pinnedOnly, setPinnedOnly] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NotificationAdminItem | null>(
    null
  );

  const { data, isLoading, refetch } = useAdminNotificationList({
    search,
    category,
    type,
    isPinned: pinnedOnly,
    page,
    pageSize,
  });
  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();
  const pinMutation = useTogglePin();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: NotificationAdminItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateNotificationInput | UpdateNotificationInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem.id, input: values as UpdateNotificationInput },
          {
            onSuccess: handleClose,
          }
        );
      } else {
        createMutation.mutate(values as CreateNotificationInput, {
          onSuccess: () => {
            handleClose();
            setPage(1);
          },
        });
      }
    },
    [createMutation, editingItem, handleClose, updateMutation]
  );

  const handleDelete = useCallback(
    (item: NotificationAdminItem) => {
      deleteMutation.mutate(item.id);
    },
    [deleteMutation]
  );

  const handleTogglePin = useCallback(
    (item: NotificationAdminItem) => {
      pinMutation.mutate({ id: item.id, isPinned: !item.isPinned });
    },
    [pinMutation]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý thông báo"
        subtitle="Tạo, chỉnh sửa, ghim và xóa thông báo hệ thống"
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Cài đặt hệ thống", href: "/settings" },
          { label: "Quản lý thông báo" },
        ]}
        actions={
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={handleOpenCreate}>
              Tạo thông báo
            </Button>
          </Space>
        }
      />

      <CardSection>
        <NotificationTable
          items={items}
          isLoading={isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          category={category}
          type={type}
          pinnedOnly={pinnedOnly}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onCategoryChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          onTypeChange={(v) => {
            setType(v);
            setPage(1);
          }}
          onPinnedOnlyChange={(v) => {
            setPinnedOnly(v);
            setPage(1);
          }}
          onPageChange={setPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePin={handleTogglePin}
          onRefresh={() => void refetch()}
        />
      </CardSection>

      <NotificationFormDrawer
        open={drawerOpen}
        onClose={handleClose}
        initial={editingItem}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
