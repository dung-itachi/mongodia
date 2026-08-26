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
import { Input, App, Select, Button, Space, Typography } from "antd";
import { ExclamationCircleOutlined, PlusOutlined, GiftOutlined, ThunderboltOutlined, DollarOutlined, AppstoreOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  StatGrid,
  StatCard,
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
import ProductComboList from "./ProductComboList";
import ComboForm, { type ComboFormProductOption } from "./ComboForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./combos.module.css";

const { Text } = Typography;

interface CategoryOption {
  _id: string;
  code: string;
  name: string;
}

export default function ComboPage() {
  const lang = useLanguageStore((s) => s.language);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComboListItem | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const { modal } = App.useApp();

  const [filterKeyword, setFilterKeyword] = useState<string | undefined>();
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>();

  const { data, isLoading, refetch } = useComboList({
    keyword: filterKeyword,
    limit: 1000,
  });
  const { data: productsData } = useProductList();

  const combos = data?.items ?? [];
  const products: ProductListItem[] = productsData?.items ?? [];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCombos = combos.length;
    const activeCombos = combos.filter((c) => c.isActive !== false).length;
    const inactiveCombos = totalCombos - activeCombos;
    const totalGiftQuantity = combos.reduce((sum, c) => sum + (c.giftQuantity ?? 0), 0);
    const productsWithCombos = new Set(
      combos.map((c) =>
        typeof c.product === "object" && c.product !== null
          ? (c.product as { _id: string })._id
          : c.product
      )
    ).size;

    return {
      totalCombos,
      activeCombos,
      inactiveCombos,
      totalGiftQuantity,
      productsWithCombos,
    };
  }, [combos]);

  // Get existing combo codes for the selected product
  const existingComboCodes = useMemo(() => {
    if (!pendingProductId) return [];
    return combos
      .filter((c) => {
        const productId =
          typeof c.product === "object" && c.product !== null
            ? (c.product as { _id: string })._id
            : c.productId;
        return productId === pendingProductId;
      })
      .map((c) => c.code);
  }, [combos, pendingProductId]);

  const categoryOptions: CategoryOption[] = useMemo(() => {
    const categoryMap = new Map<string, CategoryOption>();
    products.forEach((p) => {
      const category = p.category;
      if (typeof category === "object" && category !== null) {
        const cat = category as { _id: string; code: string; name: string };
        if (!categoryMap.has(cat._id)) {
          categoryMap.set(cat._id, cat);
        }
      }
    });
    return Array.from(categoryMap.values());
  }, [products]);

  const categorySelectOptions = useMemo(
    () =>
      categoryOptions.map((c) => ({
        label: `${c.code} - ${c.name}`,
        value: c._id,
      })),
    [categoryOptions]
  );

  const createMutation = useCreateCombo();
  const updateMutation = useUpdateCombo();
  const deleteMutation = useDeleteCombo();

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

  const handleOpenCreate = useCallback(
    (productId?: string) => {
      if (productId) {
        setPendingProductId(productId);
        setEditingItem(null);
        setDrawerOpen(true);
      }
    },
    []
  );

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
        title: t("Xóa combo?", lang),
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              {t("Combo", lang)} <strong>"{item.name}"</strong>{" "}
              {t("sẽ bị", lang)} <strong>{t("vô hiệu hóa", lang)}</strong>{" "}
              {t("(xóa mềm).", lang)}
            </p>
            <p style={{ marginBottom: 4 }}>
              • {t("Combo sẽ không còn hiển thị trong dropdown tạo đơn / thêm lead mới.", lang)}
            </p>
            <p style={{ marginBottom: 4 }}>
              • {t("Các đơn hàng", lang)} <strong>{t("đã tạo trước đó", lang)}</strong>{" "}
              {t("với combo này vẫn giữ nguyên tên combo và không bị ảnh hưởng.", lang)}
            </p>
            <p style={{ marginBottom: 0, color: "#8c8c8c", fontSize: 12 }}>
              {t("Số đơn đang tham chiếu combo này sẽ được thống kê sau khi xóa.", lang)}
            </p>
          </div>
        ),
        okText: t("Xóa combo", lang),
        cancelText: t("Hủy", lang),
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
    [deleteMutation, refetch, modal, lang]
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

  const handleQuickAdd = () => {
    if (products.length > 0) {
      setPendingProductId(products[0]._id);
      setEditingItem(null);
      setDrawerOpen(true);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("Combo", lang)}
        subtitle={t("Quản lý combo theo sản phẩm", lang)}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleQuickAdd}
          >
            {t("Thêm combo nhanh", lang)}
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div style={{ padding: "16px 24px" }}><CardSection>
        <StatGrid columns={5} gap={16} minItemWidth={160}>
          <StatCard
            title={t("Tổng số combo", lang)}
            value={stats.totalCombos}
            icon={<GiftOutlined />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title={t("Combo đang hoạt động", lang)}
            value={stats.activeCombos}
            icon={<ThunderboltOutlined />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title={t("Combo bị vô hiệu", lang)}
            value={stats.inactiveCombos}
            icon={<GiftOutlined />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title={t("Tổng quà tặng", lang)}
            value={stats.totalGiftQuantity}
            icon={<DollarOutlined />}
            color="purple"
            loading={isLoading}
          />
          <StatCard
            title={t("Sản phẩm có combo", lang)}
            value={`${stats.productsWithCombos}/${products.length}`}
            icon={<AppstoreOutlined />}
            color="default"
            loading={isLoading}
          />
        </StatGrid>
      </CardSection></div>

      {/* Filter Section */}
      <CardSection>
        <div className={styles.filterSection}>
          <Space size={12} className={styles.filterLeft}>
            <Select
              placeholder={t("Lọc theo danh mục", lang)}
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 200 }}
              value={filterCategoryId}
              onChange={(v) => setFilterCategoryId(v)}
              options={categorySelectOptions}
            />
            <Input.Search
              placeholder={t("Tìm kiếm sản phẩm...", lang)}
              style={{ width: 280 }}
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value || undefined)}
              onSearch={() => {}}
              allowClear
            />
          </Space>
          <Text type="secondary" className={styles.filterRight}>
            {t("Hiển thị", lang)} {stats.totalCombos} {t("combo", lang)}
          </Text>
        </div>
      </CardSection>

      <ProductComboList
        products={products}
        combos={combos}
        loading={isLoading}
        filterCategoryId={filterCategoryId}
        filterKeyword={filterKeyword}
        onAddCombo={handleOpenCreate}
        onEditCombo={handleEdit}
        onDeleteCombo={handleDelete}
        onToggleActive={handleToggleActive}
      />

      <ComboForm
        open={drawerOpen}
        editingItem={editingItem}
        products={productOptions}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialProductId={pendingProductId ?? undefined}
        lockProductSelection={!!pendingProductId}
        existingCodes={existingComboCodes}
      />
    </PageContainer>
  );
}
