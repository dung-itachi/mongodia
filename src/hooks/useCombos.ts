/**
 * Combo Module Hooks (Sprint 8.4.1)
 *
 * Hooks for CRUD operations on Combos.
 * Uses existing API routes - NO new API creation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import api from "@/lib/axios";

// ============================================================================
// Types
// ============================================================================

export interface ComboProductRef {
  _id: string;
  code: string;
  name: string;
}

export interface ComboCategoryRef {
  _id: string;
  code: string;
  name: string;
}

export interface ComboItemDetail {
  _id?: string;
  productVariant: string | {
    _id: string;
    sku: string;
    price: number;
    productId?: {
      _id: string;
      code: string;
      name: string;
      categoryId?: { _id: string; code: string; name: string };
    };
  };
  quantity: number;
  isGift: boolean;
}

export interface ComboListItem {
  _id: string;
  code: string;
  name: string;
  product: string | ComboProductRef;
  category: string | ComboCategoryRef;
  sellingPrice: number;
  packageSize: number;
  displayOrder?: number;
  image?: string;
  isActive?: boolean;
  itemCount?: number;
}

export interface ComboDetail extends ComboListItem {
  comboItems: ComboItemDetail[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComboItemInput {
  productVariantId: string;
  quantity: number;
  isGift?: boolean;
}

export interface CreateComboInput {
  code: string;
  name: string;
  productCode: string;
  categoryCode: string;
  comboItems: ComboItemInput[];
  sellingPrice: number;
  packageSize: number;
  displayOrder?: number;
  image?: string;
  description?: string;
}

export interface UpdateComboInput extends CreateComboInput {
  isActive: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchComboList(params?: {
  page?: number;
  limit?: number;
  categoryId?: string;
  productId?: string;
  keyword?: string;
  isActive?: boolean;
}): Promise<{
  items: ComboListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.productId) searchParams.set("productId", params.productId);
  if (params?.keyword) searchParams.set("keyword", params.keyword);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));

  const response = await api.get<{
    success: boolean;
    data: {
      items: ComboListItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>(`/api/combos?${searchParams.toString()}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch combos");
  }

  return response.data.data;
}

async function fetchComboDetail(id: string): Promise<ComboDetail> {
  const response = await api.get<{
    success: boolean;
    data: ComboDetail;
  }>(`/api/combos/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch combo");
  }

  return response.data.data;
}

async function createCombo(input: CreateComboInput): Promise<ComboDetail> {
  const response = await api.post<{
    success: boolean;
    data: ComboDetail;
    message?: string;
  }>("/api/combos", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create combo");
  }

  return response.data.data;
}

async function updateCombo(
  id: string,
  input: UpdateComboInput
): Promise<ComboDetail> {
  const response = await api.put<{
    success: boolean;
    data: ComboDetail;
    message?: string;
  }>(`/api/combos/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update combo");
  }

  return response.data.data;
}

async function deleteCombo(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/combos/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete combo");
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useComboList(params?: {
  page?: number;
  limit?: number;
  categoryId?: string;
  productId?: string;
  keyword?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ["combo-list", params],
    queryFn: () => fetchComboList(params),
    staleTime: 0,
  });
}

export function useComboDetail(id: string | null) {
  return useQuery({
    queryKey: ["combo-detail", id],
    queryFn: () => fetchComboDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCombo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["combo-list"] });
      void message.success("Tạo combo thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateComboInput }) =>
      updateCombo(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["combo-list"] });
      void queryClient.invalidateQueries({
        queryKey: ["combo-detail", variables.id],
      });
      void message.success("Cập nhật combo thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useDeleteCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCombo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["combo-list"] });
      void message.success("Xóa combo thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}
