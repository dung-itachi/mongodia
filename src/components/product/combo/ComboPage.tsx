/**
 * Combo Page (Sprint 8.x)
 *
 * Trang tổng hợp combo: hiển thị tất cả combo trên hệ thống với filter theo Product.
 * - "Thêm combo" yêu cầu chọn Product trước (modal/drawer sẽ chọn trong form).
 * - Có link sang trang /products/[productId]/combos để quản lý combo theo product.
 *
 * Lưu ý: Combo KHÔNG chọn variant; variant là trách nhiệm của Sale trong Order.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Select, Input, Modal, App } from "antd";
import { PlusOutlined, AppstoreOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
import {
  useComboList,
  useCreateCombo,
  useUpdateCombo,
  useDeleteCombo,
  type ComboListItem,
  type CreateComboInput,
  type UpdateComboInput,
} from "@/hooks/useCombos";
import { useProductList, type ProductListItem } from "@/hooks/useProductCrud";
import ComboTable from "./ComboTable";
import ComboForm, { type ComboFormProductOption } from "./ComboForm";

export default function ComboPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComboListItem | null>(null);
  const [pickProductOpen, setPickProductOpen] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const { modal } = App.useApp();

  const [filterProductId, setFilterProductId] = useState<string | undefined>();
  const [filterKeyword, setFilterKeyword] = useState<string | undefined>();

  const { data, isLoading, refetch } = useComboList({
    productId: filterProductId,
    keyword: filterKeyword,
    limit: 1000,
  });
  const { data: productsData } = useProductList();

  const createMutation = useCreateCombo();
  const updateMutation = useUpdateCombo();
  const deleteMutation = useDeleteCombo();

  const combos = data?.items ?? [];
  const products: ProductListItem[] = productsData?.items ?? [];

  const productOptions: ComboFormProductOption[] = useMemo(
    () =>
      products.map((p) => {
        const category =
          typeof p.category === "object" && p.category !== null ? p.category : null;
        return {
          _id: p._id,
          code: p.code,
          name: p.name,
          categoryCode: category?.code,
          categoryName: category?.name,
          isActive: p.isActive,
        };
      }),
    [products]
  );

  const filterProductOptions = useMemo(
    () =>
      products.map((p) => {
        const category =
          typeof p.category === "object" && p.category !== null ? p.category : null;
        return {
          label: `${p.code} - ${p.name}${category ? ` [${category.code}]` : ""}`,
          value: p._id,
        };
      }),
    [products]
  );

  const handleOpenCreate = useCallback(() => {
    if (products.length === 0) return;
    if (products.length === 1) {
      setPendingProductId(products[0]._id);
      setEditingItem(null);
      setDrawerOpen(true);
      return;
    }
    setPickProductOpen(true);
  }, [products]);

  const handlePickProduct = useCallback((productId: string) => {
    setPendingProductId(productId);
    setPickProductOpen(false);
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
    setPendingProductId(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateComboInput | UpdateComboInput) => {
      const onSuccess = () => {
        handleClose();
        void refetch();
      };
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: values as UpdateComboInput },
          { onSuccess }
        );
        return;
      }
      createMutation.mutate(values as CreateComboInput, { onSuccess });
    },
    [editingItem, createMutation, updateMutation, handleClose, refetch]
  );

  const handleDelete = useCallback(
    (item: ComboListItem) => {
      modal.confirm({
        title: "Xóa combo?",
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              Combo <strong>"{item.name}"</strong> sẽ bị <strong>vô hiệu hóa</strong> (xóa mềm).
            </p>
            <p style={{ marginBottom: 4 }}>
              • Combo sẽ không còn hiển thị trong dropdown tạo đơn / thêm lead mới.
            </p>
            <p style={{ marginBottom: 4 }}>
              • Các đơn hàng <strong>đã tạo trước đó</strong> với combo này vẫn giữ nguyên tên combo và không bị ảnh hưởng.
            </p>
            <p style={{ marginBottom: 0, color: "#8c8c8c", fontSize: 12 }}>
              Số đơn đang tham chiếu combo này sẽ được thống kê sau khi xóa.
            </p>
          </div>
        ),
        okText: "Xóa combo",
        cancelText: "Hủy",
        okButtonProps: { danger: true },
        onOk: () =>
          new Promise<void>((resolve, reject) => {
            deleteMutation.mutate(item._id, {
              onSuccess: () => {
                void refetch();
                resolve();
              },
              onError: (err) => {
                reject(err);
              },
            });
          }),
      });
    },
    [deleteMutation, refetch, modal]
  );

  const handleToggleActive = useCallback(
    (item: ComboListItem, checked: boolean) => {
      const productId =
        typeof item.product === "object" && item.product !== null
          ? (item.product as { _id: string })._id
          : String(item.product);
      updateMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            productId,
            productCode: typeof item.product === "object" ? (item.product as { code: string }).code : "",
            packageQuantity: item.packageQuantity,
            sellingPrice: item.sellingPrice,
            giftQuantity: item.giftQuantity ?? 0,
            displayOrder: item.displayOrder ?? 0,
            image: item.image,
            description: "",
            isActive: checked,
          } as UpdateComboInput,
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
      <PageHeader title="Combo" subtitle="Quản lý combo theo sản phẩm" />

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
            options={filterProductOptions}
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
        products={productOptions}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialProductId={pendingProductId ?? undefined}
        lockProductSelection={!!pendingProductId}
      />

      <Modal
        title={
          <>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            Chọn sản phẩm để tạo combo
          </>
        }
        open={pickProductOpen}
        onCancel={() => setPickProductOpen(false)}
        footer={null}
        width={520}
      >
        <p style={{ color: "#8c8c8c" }}>
          Combo phải gắn với một sản phẩm. Chọn sản phẩm bên dưới để tiếp tục.
        </p>
        <Select
          placeholder="Chọn sản phẩm"
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          value={pendingProductId ?? undefined}
          onChange={(value) => handlePickProduct(value)}
          options={productOptions
            .filter((p) => p.isActive !== false)
            .map((p) => ({
              label: `${p.code} - ${p.name}${p.categoryCode ? ` [${p.categoryCode}]` : ""}`,
              value: p._id,
            }))}
        />
      </Modal>
    </PageContainer>
  );
}