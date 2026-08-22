/**
 * Variant Module Hooks (Sprint 8.4.1)
 *
 * Hooks for CRUD operations on Product Variants, Variant Options, and Variant Values.
 * Uses existing API routes - NO new API creation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import api from "@/lib/axios";

// ============================================================================
// Types
// ============================================================================

// Variant Option (e.g., "Size", "Color")
export interface VariantOptionItem {
  _id: string;
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateVariantOptionInput {
  code: string;
  name: string;
  sortOrder?: number;
  productId?: string;
}

export interface UpdateVariantOptionInput extends CreateVariantOptionInput {
  isActive: boolean;
}

// Variant Value (e.g., "500ml", "1kg", "Red")
export interface VariantValueItem {
  _id: string;
  code: string;
  name: string;
  variantOptionId: string | { _id: string; code: string; name: string };
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateVariantValueInput {
  code: string;
  name: string;
  variantOptionId: string;
  sortOrder?: number;
}

export interface UpdateVariantValueInput extends CreateVariantValueInput {
  isActive: boolean;
}

// Product Variant
export interface ProductVariantRef {
  _id: string;
  code: string;
  name: string;
}

export interface ProductVariantListItem {
  _id: string;
  productId: string | ProductVariantRef;
  sku: string;
  barcode?: string;
  image?: string;
  variantValues: VariantValueItem[];
  price: number;
  cost?: number;
  weight?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductVariantDetail extends ProductVariantListItem {
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductVariantInput {
  productId: string;
  sku: string;
  barcode?: string;
  image?: string;
  variantValues: string[];
  // Sprint 8.x: Variant KHÔNG có giá bán — giá nằm ở Combo.
  // Bỏ field khỏi input type; backend tự set price=0.
  cost?: number;
  weight?: number;
  sortOrder?: number;
}

export interface UpdateProductVariantInput extends CreateProductVariantInput {
  isActive: boolean;
}

// ============================================================================
// API Functions - Variant Options
// ============================================================================

async function fetchVariantOptionList(): Promise<{
  items: VariantOptionItem[];
  total: number;
}> {
  const response = await api.get<{
    success: boolean;
    data: { items: VariantOptionItem[]; total: number };
  }>("/api/variant-options");

  if (!response.data.success) {
    throw new Error("Failed to fetch variant options");
  }

  return response.data.data;
}

async function fetchVariantOptionDetail(
  id: string
): Promise<VariantOptionItem> {
  const response = await api.get<{
    success: boolean;
    data: VariantOptionItem;
  }>(`/api/variant-options/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch variant option");
  }

  return response.data.data;
}

async function createVariantOption(
  input: CreateVariantOptionInput
): Promise<VariantOptionItem> {
  const response = await api.post<{
    success: boolean;
    data: VariantOptionItem;
    message?: string;
  }>("/api/variant-options", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create variant option");
  }

  return response.data.data;
}

async function updateVariantOption(
  id: string,
  input: UpdateVariantOptionInput
): Promise<VariantOptionItem> {
  const response = await api.put<{
    success: boolean;
    data: VariantOptionItem;
    message?: string;
  }>(`/api/variant-options/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update variant option");
  }

  return response.data.data;
}

// ============================================================================
// API Functions - Variant Values
// ============================================================================

async function fetchVariantValueList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  variantOptionId?: string;
  isActive?: boolean;
}): Promise<{
  items: VariantValueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.variantOptionId)
    searchParams.set("variantOptionId", params.variantOptionId);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));

  const response = await api.get<{
    success: boolean;
    data: {
      items: VariantValueItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>(`/api/variant-values?${searchParams.toString()}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch variant values");
  }

  return response.data.data;
}

async function fetchVariantValueDetail(
  id: string
): Promise<VariantValueItem> {
  const response = await api.get<{
    success: boolean;
    data: VariantValueItem;
  }>(`/api/variant-values/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch variant value");
  }

  return response.data.data;
}

async function createVariantValue(
  input: CreateVariantValueInput
): Promise<VariantValueItem> {
  const response = await api.post<{
    success: boolean;
    data: VariantValueItem;
    message?: string;
  }>("/api/variant-values", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create variant value");
  }

  return response.data.data;
}

async function updateVariantValue(
  id: string,
  input: UpdateVariantValueInput
): Promise<VariantValueItem> {
  const response = await api.put<{
    success: boolean;
    data: VariantValueItem;
    message?: string;
  }>(`/api/variant-values/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update variant value");
  }

  return response.data.data;
}

async function deleteVariantValue(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/variant-values/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete variant value");
  }
}

async function deleteVariantOption(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/variant-options/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete variant option");
  }
}

// ============================================================================
// API Functions - Product Variants
// ============================================================================

async function fetchProductVariantList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  isActive?: boolean;
}): Promise<{
  items: ProductVariantListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.productId) searchParams.set("productId", params.productId);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));

  const response = await api.get<{
    success: boolean;
    data: {
      items: ProductVariantListItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>(`/api/product-variants?${searchParams.toString()}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch product variants");
  }

  return response.data.data;
}

async function fetchProductVariantDetail(
  id: string
): Promise<ProductVariantDetail> {
  const response = await api.get<{
    success: boolean;
    data: ProductVariantDetail;
  }>(`/api/product-variants/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch product variant");
  }

  return response.data.data;
}

async function createProductVariant(
  input: CreateProductVariantInput
): Promise<ProductVariantDetail> {
  const response = await api.post<{
    success: boolean;
    data: ProductVariantDetail;
    message?: string;
  }>("/api/product-variants", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create product variant");
  }

  return response.data.data;
}

async function updateProductVariant(
  id: string,
  input: UpdateProductVariantInput
): Promise<ProductVariantDetail> {
  const response = await api.put<{
    success: boolean;
    data: ProductVariantDetail;
    message?: string;
  }>(`/api/product-variants/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update product variant");
  }

  return response.data.data;
}

async function deleteProductVariant(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/product-variants/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete product variant");
  }
}

// ============================================================================
// Hooks - Variant Options
// ============================================================================

export function useVariantOptionList() {
  return useQuery({
    queryKey: ["variant-option-list"],
    queryFn: fetchVariantOptionList,
    staleTime: 0,
  });
}

export function useVariantOptionDetail(id: string | null) {
  return useQuery({
    queryKey: ["variant-option-detail", id],
    queryFn: () => fetchVariantOptionDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateVariantOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVariantOption,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-option-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

export function useUpdateVariantOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateVariantOptionInput;
    }) => updateVariantOption(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-option-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["variant-option-detail", variables.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

// ============================================================================
// Hooks - Variant Values
// ============================================================================

export function useVariantValueList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  variantOptionId?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ["variant-value-list", params],
    queryFn: () => fetchVariantValueList(params),
    staleTime: 0,
  });
}

export function useVariantValueDetail(id: string | null) {
  return useQuery({
    queryKey: ["variant-value-detail", id],
    queryFn: () => fetchVariantValueDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateVariantValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVariantValue,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

export function useUpdateVariantValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateVariantValueInput;
    }) => updateVariantValue(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-detail", variables.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

export function useDeleteVariantValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVariantValue,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-options"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

export function useDeleteVariantOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVariantOption,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-option-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-options"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

// ============================================================================
// Hooks - Product Variants
// ============================================================================

export function useProductVariantList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ["product-variant-list", params],
    queryFn: () => fetchProductVariantList(params),
    staleTime: 0,
  });
}

export function useProductVariantDetail(id: string | null) {
  return useQuery({
    queryKey: ["product-variant-detail", id],
    queryFn: () => fetchProductVariantDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductVariant,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-list"],
      });
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProductVariantInput;
    }) => updateProductVariant(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-detail", variables.id],
      });
    },
  });
}

export function useDeleteProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductVariant,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-list"],
      });
    },
  });
}

// ============================================================================
// Hooks - Product Variant Options (Sprint 8.4.1)
// ============================================================================

export interface ProductVariantOptionWithValues {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  values: VariantValueItem[];
}

export interface ProductVariantOptionsResponse {
  productId: string;
  productName: string;
  productCode: string;
  hasVariants: boolean;
  variantOptions: ProductVariantOptionWithValues[];
}

async function fetchProductVariantOptions(
  productId: string
): Promise<ProductVariantOptionsResponse> {
  const response = await api.get<{
    success: boolean;
    data: ProductVariantOptionsResponse;
  }>(`/api/products/${productId}/variant-options`);

  if (!response.data.success) {
    throw new Error("Failed to fetch product variant options");
  }

  return response.data.data;
}

export function useProductVariantOptions(productId: string | null) {
  return useQuery({
    queryKey: ["product-variant-options", productId],
    queryFn: () => fetchProductVariantOptions(productId!),
    enabled: !!productId,
    staleTime: 0,
  });
}

// Flatten version - returns options and values as separate arrays filtered by product
export interface ProductVariantOptionsFlat {
  options: VariantOptionItem[];
  values: VariantValueItem[];
}

export function useProductVariantOptionsFlat(productId: string | null) {
  const { data, isLoading, refetch } = useProductVariantOptions(productId);

  const flat = useMemo(() => {
    if (!data?.variantOptions) {
      return { options: [], values: [] };
    }

    const options: VariantOptionItem[] = [];
    const values: VariantValueItem[] = [];

    for (const opt of data.variantOptions) {
      options.push({
        _id: opt._id,
        code: opt.code,
        name: opt.name,
        sortOrder: opt.sortOrder,
        isActive: opt.isActive,
      });

      for (const val of opt.values) {
        values.push({
          _id: val._id,
          code: val.code,
          name: val.name,
          variantOptionId: val.variantOptionId,
          sortOrder: val.sortOrder,
          isActive: val.isActive,
        });
      }
    }

    return { options, values };
  }, [data]);

  return {
    data: flat,
    isLoading,
    refetch,
  };
}

// ============================================================================
// Product Variant Option Assignment (Assign options to a product)
// ============================================================================

interface AssignProductVariantOptionsInput {
  variantOptionIds: string[];
}

async function assignProductVariantOptions(
  productId: string,
  input: AssignProductVariantOptionsInput
) {
  const response = await api.put<{
    success: boolean;
    data: { productId: string; variantOptionIds: string[] };
    message?: string;
  }>(`/api/products/${productId}/variant-options`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to assign variant options");
  }

  return response.data.data;
}

export function useAssignProductVariantOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: AssignProductVariantOptionsInput;
    }) => assignProductVariantOptions(productId, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-options", variables.productId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-options"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["products-variant-tree"],
      });
    },
  });
}

// ============================================================================
// Products Variant Tree (Product -> Option -> Value)
// ============================================================================

export interface ProductTreeValue {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductTreeOption {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  values: ProductTreeValue[];
}

export interface ProductTreeNode {
  _id: string;
  code: string;
  name: string;
  variantOptions: ProductTreeOption[];
}

async function fetchProductsVariantTree(): Promise<ProductTreeNode[]> {
  const response = await api.get<{
    success: boolean;
    data: { products: ProductTreeNode[] };
    message?: string;
  }>("/api/products/variant-tree");

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to load products variant tree");
  }
  return response.data.data.products;
}

export function useProductsVariantTree() {
  return useQuery({
    queryKey: ["products-variant-tree"],
    queryFn: fetchProductsVariantTree,
    staleTime: 30_000,
  });
}
