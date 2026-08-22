/**
 * Variant Page
 *
 * Refactored: Attribute + Value merged into a single Tree module.
 * Variant remains a separate management section.
 *
 * Layout:
 *   Tab 1: Thuộc tính & Giá trị (Tree)
 *   Tab 2: Biến thể (ProductVariantsList)
 *
 * Optional product context (from URL ?productId=...): pre-selects a product so
 * newly created attributes are auto-assigned to it.
 */

"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, message } from "antd";
import { AppstoreOutlined, ControlOutlined, UnorderedListOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  StatGrid,
  StatCard,
} from "@/components/common";
import {
  useProductsVariantTree,
  useProductVariantList,
  useCreateVariantOption,
  useUpdateVariantOption,
  useCreateVariantValue,
  useUpdateVariantValue,
  useDeleteVariantValue,
  useDeleteVariantOption,
  useCreateProductVariant,
  useUpdateProductVariant,
  useDeleteProductVariant,
  useProductVariantOptions,
  useAssignProductVariantOptions,
  type VariantOptionItem,
  type VariantValueItem,
  type ProductVariantListItem,
  type CreateVariantOptionInput,
  type UpdateVariantOptionInput,
  type CreateVariantValueInput,
  type UpdateVariantValueInput,
  type CreateProductVariantInput,
  type UpdateProductVariantInput,
} from "@/hooks/useVariants";
import { useProductList } from "@/hooks/useProductCrud";
import VariantOptionForm from "./VariantOptionForm";
import VariantValueForm from "./VariantValueForm";
import ProductVariantsTree from "./ProductVariantsTree";
import ProductVariantsList from "./ProductVariantsList";
import ProductVariantForm from "./ProductVariantForm";

function VariantPageInner() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const productIdFromQuery = searchParams.get("productId");

  // Helper: derive an ASCII code from a Vietnamese value name with a random suffix.
  const makeValueCodeFromName = (name: string): string => {
    const normalized = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const asciiCode = normalized
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 20);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return asciiCode.length >= 4
      ? asciiCode + suffix
      : `${asciiCode}${suffix}`;
  };

  const [activeTab, setActiveTab] = useState("attributes");

  // Option drawer state
  const [optionDrawerOpen, setOptionDrawerOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<VariantOptionItem | null>(null);

  // Value drawer state
  const [valueDrawerOpen, setValueDrawerOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<VariantValueItem | null>(null);
  const [prefilledValueOption, setPrefilledValueOption] = useState<
    VariantOptionItem | null
  >(null);

  // Variant drawer state
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantListItem | null>(null);
  const [selectedProductIdForVariant, setSelectedProductIdForVariant] = useState<
    string | null
  >(null);

  // Context product (for auto-assign when creating attributes)
  const [selectedProductIdForOptions, setSelectedProductIdForOptions] = useState<
    string | null
  >(productIdFromQuery);

  // Variant options for selected product (used when creating variants)
  const {
    data: productVariantOptionsData,
    refetch: refetchProductVariantOptions,
  } = useProductVariantOptions(selectedProductIdForVariant);

  // Data queries
  const { data: variantsData, isLoading: variantsLoading, refetch: refetchVariants } =
    useProductVariantList();
  const { data: productsData, isLoading: productsLoading } = useProductList();
  const { data: treeData, isLoading: treeLoading } = useProductsVariantTree();

  // Mutations
  const createOptionMutation = useCreateVariantOption();
  const updateOptionMutation = useUpdateVariantOption();
  const deleteOptionMutation = useDeleteVariantOption();
  const createValueMutation = useCreateVariantValue();
  const updateValueMutation = useUpdateVariantValue();
  const deleteValueMutation = useDeleteVariantValue();
  const createVariantMutation = useCreateProductVariant();
  const updateVariantMutation = useUpdateProductVariant();
  const deleteVariantMutation = useDeleteProductVariant();
  const assignVariantOptionsMutation = useAssignProductVariantOptions();

  const variants = useMemo(() => variantsData?.items ?? [], [variantsData]);
  const products = useMemo(() => productsData?.items ?? [], [productsData]);
  const treeProducts = useMemo(() => treeData ?? [], [treeData]);
  const productVariantOptions = useMemo(
    () => productVariantOptionsData?.variantOptions ?? [],
    [productVariantOptionsData]
  );

  // Aggregate counts from tree for stats
  const totalOptions = useMemo(
    () => treeProducts.reduce((sum, p) => sum + p.variantOptions.length, 0),
    [treeProducts]
  );
  const totalValues = useMemo(
    () =>
      treeProducts.reduce(
        (sum, p) =>
          sum +
          p.variantOptions.reduce((s, o) => s + o.values.length, 0),
        0
      ),
    [treeProducts]
  );

  // Aggregate unique options across all products (used for variant value form's option picker)
  const allOptionsForValueForm = useMemo<VariantOptionItem[]>(() => {
    const map = new Map<string, VariantOptionItem>();
    for (const p of treeProducts) {
      for (const o of p.variantOptions) {
        if (!map.has(o._id)) {
          map.set(o._id, {
            _id: o._id,
            code: o.code,
            name: o.name,
            sortOrder: o.sortOrder,
            isActive: o.isActive,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [treeProducts]);

  // Listen for refetch events from child components
  useEffect(() => {
    const handleRefetch = () => {
      void refetchProductVariantOptions();
    };
    window.addEventListener("refetch-product-variant-options", handleRefetch);
    return () => {
      window.removeEventListener("refetch-product-variant-options", handleRefetch);
    };
  }, [refetchProductVariantOptions]);

  // Stats
  const stats = useMemo(() => {
    return {
      totalProducts: products.length,
      totalVariants: variants.length,
      totalOptions,
      totalValues,
    };
  }, [products, variants, totalOptions, totalValues]);

  // ====== Attribute handlers ======
  // Allow opening Option creation drawer without a product context (global create).
  // Useful when there are no products yet but admin still wants to seed attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenOptionCreate = useCallback(() => {
    setSelectedProductIdForOptions(null);
    setEditingOption(null);
    setOptionDrawerOpen(true);
  }, []);

  const handleEditOption = useCallback((item: VariantOptionItem) => {
    setEditingOption(item);
    setOptionDrawerOpen(true);
  }, []);

  const handleCloseOption = useCallback(() => {
    setOptionDrawerOpen(false);
    setEditingOption(null);
  }, []);

  const handleSubmitOption = useCallback(
    async (
      values: CreateVariantOptionInput,
      options?: { quickValues?: string[]; createdOption?: VariantOptionItem }
    ) => {
      const targetProductId = selectedProductIdForOptions;
      try {
        if (editingOption) {
          await updateOptionMutation.mutateAsync({
            id: editingOption._id,
            input: values as UpdateVariantOptionInput,
          });
          handleCloseOption();
          return;
        }

        // 1) Create the option first
        const created = await createOptionMutation.mutateAsync(values);

        // 2) If quick values were provided, create them now (sequentially to keep order)
        const quickValues = options?.quickValues ?? [];
        let valueCreatedCount = 0;
        for (const name of quickValues) {
          try {
            const code = makeValueCodeFromName(name);
            await createValueMutation.mutateAsync({
              code,
              name,
              variantOptionId: created._id,
              sortOrder: 0,
            });
            valueCreatedCount += 1;
          } catch (err) {
            // Continue creating remaining values even if one fails
            console.error("Quick value create failed:", err);
          }
        }

        // 3) Auto-assign to selected product if any
        if (targetProductId) {
          try {
            await assignVariantOptionsMutation.mutateAsync({
              productId: targetProductId,
              input: { variantOptionIds: [created._id] },
            });
            void queryClient.invalidateQueries({
              queryKey: ["product-variant-options", targetProductId],
            });
          } catch (assignError) {
            console.error("Assignment error:", assignError);
            void queryClient.invalidateQueries({
              queryKey: ["product-variant-options", targetProductId],
            });
          }
        }

        // 4) Refresh trees so the new option/values appear immediately
        void queryClient.invalidateQueries({ queryKey: ["products-variant-tree"] });
        void queryClient.invalidateQueries({ queryKey: ["variant-value-list"] });
        void queryClient.invalidateQueries({ queryKey: ["product-variant-options"] });

        handleCloseOption();

        if (valueCreatedCount > 0) {
          void message.success(
            `Đã tạo thuộc tính "${created.name}" với ${valueCreatedCount} giá trị`
          );
        } else {
          void message.success("Đã tạo thuộc tính thành công");
        }
      } catch (error) {
        const err = error as Error;
        void message.error(err.message || "Không thể lưu thuộc tính");
      }
    },
    [
      editingOption,
      createOptionMutation,
      createValueMutation,
      updateOptionMutation,
      handleCloseOption,
      selectedProductIdForOptions,
      assignVariantOptionsMutation,
      queryClient,
    ]
  );

  const handleDeleteOption = useCallback(
    (item: VariantOptionItem) => {
      deleteOptionMutation.mutate(item._id, {
        onSuccess: () => {
          void message.success("Xóa thuộc tính thành công");
        },
        onError: (error: Error) => {
          void message.error(error.message || "Không thể xóa thuộc tính");
        },
      });
    },
    [deleteOptionMutation]
  );

  const handleToggleOptionActive = useCallback(
    (item: VariantOptionItem) => {
      updateOptionMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            sortOrder: item.sortOrder,
            isActive: !item.isActive,
          },
        },
        {
          onError: (error: Error) => {
            void message.error(error.message || "Không thể cập nhật thuộc tính");
          },
        }
      );
    },
    [updateOptionMutation]
  );

  // When user clicks "Gán thuộc tính" on a product in the tree,
  // we set that product as context and open the option creation drawer.
  const handleAssignOption = useCallback((productId: string) => {
    setSelectedProductIdForOptions(productId);
    setEditingOption(null);
    setOptionDrawerOpen(true);
  }, []);

  // ====== Value handlers ======
  const handleAddValue = useCallback((opt: VariantOptionItem) => {
    setEditingValue(null);
    setPrefilledValueOption(opt);
    setValueDrawerOpen(true);
  }, []);

  const handleEditValue = useCallback((item: VariantValueItem) => {
    setEditingValue(item);
    setPrefilledValueOption(null);
    setValueDrawerOpen(true);
  }, []);

  const handleCloseValue = useCallback(() => {
    setValueDrawerOpen(false);
    setEditingValue(null);
    setPrefilledValueOption(null);
  }, []);

  const handleSubmitValue = useCallback(
    async (input: CreateVariantValueInput | UpdateVariantValueInput) => {
      try {
        if (editingValue) {
          await updateValueMutation.mutateAsync({
            id: editingValue._id,
            input: input as UpdateVariantValueInput,
          });
          handleCloseValue();
        } else {
          await createValueMutation.mutateAsync(input as CreateVariantValueInput);
          handleCloseValue();
        }
      } catch (error) {
        const err = error as Error;
        void message.error(err.message || "Không thể lưu giá trị");
      }
    },
    [
      editingValue,
      createValueMutation,
      updateValueMutation,
      handleCloseValue,
    ]
  );

  const handleDeleteValue = useCallback(
    (item: VariantValueItem) => {
      deleteValueMutation.mutate(item._id, {
        onSuccess: () => {
          void message.success("Xóa giá trị thành công");
        },
        onError: (error: Error) => {
          void message.error(error.message || "Không thể xóa giá trị");
        },
      });
    },
    [deleteValueMutation]
  );

  const handleToggleValueActive = useCallback(
    (item: VariantValueItem) => {
      const getOptionId = (variantOptionId: VariantValueItem["variantOptionId"]) => {
        if (typeof variantOptionId === "object" && variantOptionId !== null) {
          return (variantOptionId as { _id: string })._id;
        }
        return "";
      };

      updateValueMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            variantOptionId: getOptionId(item.variantOptionId),
            sortOrder: item.sortOrder,
            isActive: !item.isActive,
          },
        },
        {
          onError: (error: Error) => {
            void message.error(error.message || "Không thể cập nhật giá trị");
          },
        }
      );
    },
    [updateValueMutation]
  );

  // ====== Variant handlers ======
  const handleAddVariant = useCallback(
    (productId: string) => {
      setEditingVariant(null);
      setSelectedProductIdForVariant(productId);
      void refetchProductVariantOptions();
      setVariantDrawerOpen(true);
    },
    [refetchProductVariantOptions]
  );

  const handleEditVariant = useCallback(
    (item: ProductVariantListItem) => {
      setEditingVariant(item);
      const productId =
        typeof item.productId === "object"
          ? (item.productId as { _id: string })._id
          : String(item.productId);
      setSelectedProductIdForVariant(productId);
      void refetchProductVariantOptions();
      setVariantDrawerOpen(true);
    },
    [refetchProductVariantOptions]
  );

  const handleCloseVariant = useCallback(() => {
    setVariantDrawerOpen(false);
    setEditingVariant(null);
    setSelectedProductIdForVariant(null);
  }, []);

  const handleSubmitVariant = useCallback(
    async (input: CreateProductVariantInput | UpdateProductVariantInput) => {
      try {
        if (editingVariant) {
          await updateVariantMutation.mutateAsync({
            id: editingVariant._id,
            input: input as UpdateProductVariantInput,
          });
          void refetchVariants();
          handleCloseVariant();
          void message.success("Cập nhật biến thể thành công");
        } else {
          await createVariantMutation.mutateAsync(input as CreateProductVariantInput);
          void refetchVariants();
          handleCloseVariant();
          void message.success("Tạo biến thể thành công");
        }
      } catch (error) {
        const err = error as Error;
        void message.error(err.message || "Không thể lưu biến thể");
      }
    },
    [
      editingVariant,
      createVariantMutation,
      updateVariantMutation,
      handleCloseVariant,
      refetchVariants,
    ]
  );

  const handleDeleteVariant = useCallback(
    (item: ProductVariantListItem) => {
      deleteVariantMutation.mutate(item._id, {
        onSuccess: () => {
          void refetchVariants();
          void message.success("Xóa biến thể thành công");
        },
        onError: (error: Error) => {
          void message.error(error.message || "Không thể xóa biến thể");
        },
      });
    },
    [deleteVariantMutation, refetchVariants]
  );

  const handleToggleVariantActive = useCallback(
    (item: ProductVariantListItem) => {
      const getProductId = (productId: ProductVariantListItem["productId"]) => {
        if (typeof productId === "object" && productId !== null) {
          return (productId as { _id: string })._id;
        }
        return "";
      };

      const getVariantValueIds = (
        variantValues: ProductVariantListItem["variantValues"]
      ) => {
        if (!Array.isArray(variantValues)) return [];
        return variantValues.map((vv) => {
          if (typeof vv === "object" && vv !== null) {
            return (vv as { _id: string })._id;
          }
          return String(vv);
        });
      };

      updateVariantMutation.mutate(
        {
          id: item._id,
          input: {
            productId: getProductId(item.productId),
            sku: item.sku,
            barcode: item.barcode,
            variantValues: getVariantValueIds(item.variantValues),
            cost: item.cost,
            weight: item.weight,
            sortOrder: item.sortOrder,
            isActive: !item.isActive,
          },
        },
        {
          onSuccess: () => {
            void refetchVariants();
          },
        }
      );
    },
    [updateVariantMutation, refetchVariants]
  );

  const handleRefresh = useCallback(() => {
    void refetchVariants();
  }, [refetchVariants]);

  const handleProductSelect = useCallback(
    (productId: string | null) => {
      setSelectedProductIdForVariant(productId);
      if (productId) {
        void refetchProductVariantOptions();
      }
    },
    [refetchProductVariantOptions]
  );

  // Quick-add handlers (used inside ProductVariantForm)
  const handleQuickAddOption = useCallback(
    async (name: string): Promise<VariantOptionItem> => {
      const normalized = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const asciiCode = normalized
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 20);
      const code =
        asciiCode.length >= 4
          ? asciiCode
          : `${asciiCode}${Date.now().toString(36).toUpperCase().slice(-4)}`;

      try {
        const result = await createOptionMutation.mutateAsync({
          code,
          name,
          sortOrder: 0,
        });
        if (selectedProductIdForVariant) {
          await assignVariantOptionsMutation.mutateAsync({
            productId: selectedProductIdForVariant,
            input: { variantOptionIds: [result._id] },
          });
        }
        await refetchProductVariantOptions();
        return result;
      } catch (error) {
        const err = error as Error;
        throw new Error(err.message || "Không thể thêm thuộc tính");
      }
    },
    [
      createOptionMutation,
      selectedProductIdForVariant,
      assignVariantOptionsMutation,
      refetchProductVariantOptions,
    ]
  );

  const handleQuickAddValue = useCallback(
    async (optionId: string, name: string): Promise<VariantValueItem> => {
      const normalized = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const asciiCode = normalized
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 20);
      const code =
        asciiCode.length >= 4
          ? asciiCode
          : `${asciiCode}${Date.now().toString(36).toUpperCase().slice(-4)}`;

      try {
        const result = await createValueMutation.mutateAsync({
          code,
          name,
          variantOptionId: optionId,
          sortOrder: 0,
        });
        await refetchProductVariantOptions();
        return result;
      } catch (error) {
        const err = error as Error;
        throw new Error(err.message || "Không thể thêm giá trị");
      }
    },
    [createValueMutation, refetchProductVariantOptions]
  );

  const tabItems = useMemo(
    () => [
      {
        key: "attributes",
        label: "Thuộc tính & Giá trị",
        children: (
          <ProductVariantsTree
            products={treeProducts}
            loading={treeLoading}
            onEditOption={handleEditOption}
            onDeleteOption={handleDeleteOption}
            onToggleOptionActive={handleToggleOptionActive}
            onAddValue={handleAddValue}
            onEditValue={handleEditValue}
            onDeleteValue={handleDeleteValue}
            onToggleValueActive={handleToggleValueActive}
            onAssignOption={handleAssignOption}
          />
        ),
      },
      {
        key: "variants",
        label: "Biến thể",
        children: (
          <ProductVariantsList
            products={products}
            productsLoading={productsLoading}
            variants={variants}
            variantsLoading={variantsLoading}
            variantOptions={productVariantOptions}
            onEditVariant={handleEditVariant}
            onDeleteVariant={handleDeleteVariant}
            onToggleVariantActive={handleToggleVariantActive}
            onAddVariant={handleAddVariant}
            onRefresh={handleRefresh}
            onProductSelect={handleProductSelect}
          />
        ),
      },
    ],
    [
      treeProducts,
      treeLoading,
      handleAssignOption,
      handleEditOption,
      handleDeleteOption,
      handleToggleOptionActive,
      handleAddValue,
      handleEditValue,
      handleDeleteValue,
      handleToggleValueActive,
      products,
      productsLoading,
      variants,
      variantsLoading,
      productVariantOptions,
      handleEditVariant,
      handleDeleteVariant,
      handleToggleVariantActive,
      handleAddVariant,
      handleRefresh,
      handleProductSelect,
    ]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Biến thể"
        subtitle="Quản lý thuộc tính, giá trị và biến thể sản phẩm"
      />

      <div style={{ padding: "16px 24px" }}>
        <StatGrid columns={4} gap={16} minItemWidth={160}>
          <StatCard
            title="Tổng sản phẩm"
            value={stats.totalProducts}
            icon={<AppstoreOutlined />}
            color="blue"
            loading={productsLoading}
          />
          <StatCard
            title="Biến thể"
            value={stats.totalVariants}
            icon={<UnorderedListOutlined />}
            color="green"
            loading={variantsLoading}
          />
          <StatCard
            title="Thuộc tính"
            value={stats.totalOptions}
            icon={<ControlOutlined />}
            color="purple"
            loading={treeLoading}
          />
          <StatCard
            title="Giá trị"
            value={stats.totalValues}
            icon={<ControlOutlined />}
            color="orange"
            loading={treeLoading}
          />
        </StatGrid>
      </div>

      <CardSection>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </CardSection>

      {/* Option Drawer */}
      <VariantOptionForm
        open={optionDrawerOpen}
        editingItem={editingOption}
        selectedProductId={selectedProductIdForOptions}
        products={products}
        loading={createOptionMutation.isPending || updateOptionMutation.isPending}
        onClose={handleCloseOption}
        onSubmit={handleSubmitOption}
      />

      {/* Value Drawer */}
      <VariantValueForm
        open={valueDrawerOpen}
        editingItem={editingValue}
        prefilledOption={prefilledValueOption}
        variantOptions={allOptionsForValueForm}
        loading={createValueMutation.isPending || updateValueMutation.isPending}
        onClose={handleCloseValue}
        onSubmit={handleSubmitValue}
      />

      {/* Product Variant Drawer */}
      <ProductVariantForm
        open={variantDrawerOpen}
        editingItem={editingVariant}
        products={products}
        productVariantOptions={productVariantOptions}
        selectedProductId={selectedProductIdForVariant}
        loading={createVariantMutation.isPending || updateVariantMutation.isPending}
        onClose={handleCloseVariant}
        onSubmit={handleSubmitVariant}
        onAddOption={handleQuickAddOption}
        onAddValue={handleQuickAddValue}
        allOptions={allOptionsForValueForm}
        onRefetchProductOptions={refetchProductVariantOptions}
      />
    </PageContainer>
  );
}

export default function VariantPage() {
  return (
    <Suspense fallback={null}>
      <VariantPageInner />
    </Suspense>
  );
}
