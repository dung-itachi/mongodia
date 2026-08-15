/**
 * Variant Module Hooks (Sprint 8.4.1)
 *
 * Hooks for CRUD operations on Product Variants, Variant Options, and Variant Values.
 * Uses existing API routes - NO new API creation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAntApp } from "@/providers/AntdProvider";
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
  const { message } = useAntApp();

  return useMutation({
    mutationFn: createVariantOption,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-option-list"],
      });
      void message.success("Tạo thuộc tính biến thể thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateVariantOption() {
  const queryClient = useQueryClient();
  const { message } = useAntApp();

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
      void message.success("Cập nhật thuộc tính biến thể thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
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
  const { message } = useAntApp();

  return useMutation({
    mutationFn: createVariantValue,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void message.success("Tạo giá trị biến thể thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateVariantValue() {
  const queryClient = useQueryClient();
  const { message } = useAntApp();

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
      void message.success("Cập nhật giá trị biến thể thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useDeleteVariantValue() {
  const queryClient = useQueryClient();
  const { message } = useAntApp();

  return useMutation({
    mutationFn: deleteVariantValue,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["variant-value-list"],
      });
      void message.success("Xóa giá trị biến thể thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
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
  const { message } = useAntApp();

  return useMutation({
    mutationFn: createProductVariant,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-list"],
      });
      void message.success("Tạo biến thể sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();
  const { message } = useAntApp();

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
      void message.success("Cập nhật biến thể sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useDeleteProductVariant() {
  const queryClient = useQueryClient();
  const { message } = useAntApp();

  return useMutation({
    mutationFn: deleteProductVariant,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["product-variant-list"],
      });
      void message.success("Xóa biến thể sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}
