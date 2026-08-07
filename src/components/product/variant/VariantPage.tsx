/**
 * Variant Page (Sprint 8.4.1)
 *
 * Page for managing Variants (Options, Values, and Product Variants).
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Tabs, Card, Empty, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
import {
  useVariantOptionList,
  useVariantValueList,
  useProductVariantList,
  useCreateVariantOption,
  useUpdateVariantOption,
  useCreateVariantValue,
  useUpdateVariantValue,
  useDeleteVariantValue,
  useCreateProductVariant,
  useUpdateProductVariant,
  useDeleteProductVariant,
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
import VariantOptionTable from "./VariantOptionTable";
import VariantOptionForm from "./VariantOptionForm";
import VariantValueTable from "./VariantValueTable";
import VariantValueForm from "./VariantValueForm";
import ProductVariantTable from "./ProductVariantTable";
import ProductVariantForm from "./ProductVariantForm";

export default function VariantPage() {
  // State for active tab
  const [activeTab, setActiveTab] = useState("options");

  // State for Option drawer
  const [optionDrawerOpen, setOptionDrawerOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<VariantOptionItem | null>(null);

  // State for Value drawer
  const [valueDrawerOpen, setValueDrawerOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<VariantValueItem | null>(null);

  // State for Product Variant drawer
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantListItem | null>(null);

  // State for filtering
  const [variantFilterProductId, setVariantFilterProductId] = useState<string | undefined>();

  // Data queries
  const { data: optionsData, isLoading: optionsLoading, refetch: refetchOptions } = useVariantOptionList();
  const { data: valuesData, isLoading: valuesLoading, refetch: refetchValues } = useVariantValueList();
  const { data: variantsData, isLoading: variantsLoading, refetch: refetchVariants } = useProductVariantList({
    productId: variantFilterProductId,
  });
  const { data: productsData } = useProductList();
  const { data: allVariantValues } = useVariantValueList({ limit: 1000 });

  // Mutations
  const createOptionMutation = useCreateVariantOption();
  const updateOptionMutation = useUpdateVariantOption();
  const createValueMutation = useCreateVariantValue();
  const updateValueMutation = useUpdateVariantValue();
  const deleteValueMutation = useDeleteVariantValue();
  const createVariantMutation = useCreateProductVariant();
  const updateVariantMutation = useUpdateProductVariant();
  const deleteVariantMutation = useDeleteProductVariant();

  const options = optionsData?.items ?? [];
  const values = valuesData?.items ?? [];
  const variants = variantsData?.items ?? [];
  const products = productsData?.items ?? [];
  const variantValues = allVariantValues?.items ?? [];

  // Handlers - Options
  const handleOpenOptionCreate = useCallback(() => {
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
    (values: CreateVariantOptionInput | UpdateVariantOptionInput) => {
      if (editingOption) {
        updateOptionMutation.mutate(
          { id: editingOption._id, input: values as UpdateVariantOptionInput },
          {
            onSuccess: () => {
              handleCloseOption();
              void refetchOptions();
            },
          }
        );
      } else {
        createOptionMutation.mutate(values as CreateVariantOptionInput, {
          onSuccess: () => {
            handleCloseOption();
            void refetchOptions();
          },
        });
      }
    },
    [editingOption, createOptionMutation, updateOptionMutation, handleCloseOption, refetchOptions]
  );

  // Handlers - Values
  const handleOpenValueCreate = useCallback(() => {
    setEditingValue(null);
    setValueDrawerOpen(true);
  }, []);

  const handleEditValue = useCallback((item: VariantValueItem) => {
    setEditingValue(item);
    setValueDrawerOpen(true);
  }, []);

  const handleCloseValue = useCallback(() => {
    setValueDrawerOpen(false);
    setEditingValue(null);
  }, []);

  const handleSubmitValue = useCallback(
    (values: CreateVariantValueInput | UpdateVariantValueInput) => {
      if (editingValue) {
        updateValueMutation.mutate(
          { id: editingValue._id, input: values as UpdateVariantValueInput },
          {
            onSuccess: () => {
              handleCloseValue();
              void refetchValues();
            },
          }
        );
      } else {
        createValueMutation.mutate(values as CreateVariantValueInput, {
          onSuccess: () => {
            handleCloseValue();
            void refetchValues();
          },
        });
      }
    },
    [editingValue, createValueMutation, updateValueMutation, handleCloseValue, refetchValues]
  );

  const handleDeleteValue = useCallback(
    (item: VariantValueItem) => {
      deleteValueMutation.mutate(item._id, {
        onSuccess: () => {
          void refetchValues();
        },
      });
    },
    [deleteValueMutation, refetchValues]
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
          onSuccess: () => {
            void refetchValues();
          },
        }
      );
    },
    [updateValueMutation, refetchValues]
  );

  // Handlers - Product Variants
  const handleOpenVariantCreate = useCallback(() => {
    setEditingVariant(null);
    setVariantDrawerOpen(true);
  }, []);

  const handleEditVariant = useCallback((item: ProductVariantListItem) => {
    setEditingVariant(item);
    setVariantDrawerOpen(true);
  }, []);

  const handleCloseVariant = useCallback(() => {
    setVariantDrawerOpen(false);
    setEditingVariant(null);
  }, []);

  const handleSubmitVariant = useCallback(
    (values: CreateProductVariantInput | UpdateProductVariantInput) => {
      if (editingVariant) {
        updateVariantMutation.mutate(
          { id: editingVariant._id, input: values as UpdateProductVariantInput },
          {
            onSuccess: () => {
              handleCloseVariant();
              void refetchVariants();
            },
          }
        );
      } else {
        createVariantMutation.mutate(values as CreateProductVariantInput, {
          onSuccess: () => {
            handleCloseVariant();
            void refetchVariants();
          },
        });
      }
    },
    [editingVariant, createVariantMutation, updateVariantMutation, handleCloseVariant, refetchVariants]
  );

  const handleDeleteVariant = useCallback(
    (item: ProductVariantListItem) => {
      deleteVariantMutation.mutate(item._id, {
        onSuccess: () => {
          void refetchVariants();
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

      const getVariantValueIds = (variantValues: ProductVariantListItem["variantValues"]) => {
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
            price: item.price,
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

  const tabItems = useMemo(() => [
    {
      key: "options",
      label: "Thuộc tính",
      children: (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenOptionCreate}>
              Thêm thuộc tính
            </Button>
          </div>
          <VariantOptionTable
            data={options}
            loading={optionsLoading}
            onEdit={handleEditOption}
            onDelete={() => {}}
          />
        </div>
      ),
    },
    {
      key: "values",
      label: "Giá trị",
      children: (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenValueCreate}>
              Thêm giá trị
            </Button>
          </div>
          <VariantValueTable
            data={values}
            loading={valuesLoading}
            onEdit={handleEditValue}
            onDelete={handleDeleteValue}
            onToggleActive={handleToggleValueActive}
          />
        </div>
      ),
    },
    {
      key: "variants",
      label: "Biến thể",
      children: (
        <div>
          <div style={{ marginBottom: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Select
              placeholder="Lọc theo sản phẩm"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 250 }}
              value={variantFilterProductId}
              onChange={(v) => {
                setVariantFilterProductId(v);
                void refetchVariants();
              }}
              options={products.map((p) => ({
                label: `${p.code} - ${p.name}`,
                value: p._id,
              }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenVariantCreate}>
              Thêm biến thể
            </Button>
          </div>
          <ProductVariantTable
            data={variants}
            loading={variantsLoading}
            onEdit={handleEditVariant}
            onDelete={handleDeleteVariant}
            onToggleActive={handleToggleVariantActive}
          />
        </div>
      ),
    },
  ], [
    options, optionsLoading, handleOpenOptionCreate, handleEditOption,
    values, valuesLoading, handleOpenValueCreate, handleEditValue, handleDeleteValue, handleToggleValueActive,
    variants, variantsLoading, variantFilterProductId, products, handleOpenVariantCreate, handleEditVariant, handleDeleteVariant, handleToggleVariantActive,
    refetchVariants,
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Biến thể"
        subtitle="Quản lý thuộc tính và giá trị biến thể"
      />

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
        loading={createOptionMutation.isPending || updateOptionMutation.isPending}
        onClose={handleCloseOption}
        onSubmit={handleSubmitOption}
      />

      {/* Value Drawer */}
      <VariantValueForm
        open={valueDrawerOpen}
        editingItem={editingValue}
        variantOptions={options}
        loading={createValueMutation.isPending || updateValueMutation.isPending}
        onClose={handleCloseValue}
        onSubmit={handleSubmitValue}
      />

      {/* Product Variant Drawer */}
      <ProductVariantForm
        open={variantDrawerOpen}
        editingItem={editingVariant}
        products={products}
        variantValues={variantValues}
        loading={createVariantMutation.isPending || updateVariantMutation.isPending}
        onClose={handleCloseVariant}
        onSubmit={handleSubmitVariant}
      />
    </PageContainer>
  );
}
