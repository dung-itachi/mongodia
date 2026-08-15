/**
 * Combo Module Hooks (Sprint 8.x)
 *
 * Combo theo Product:
 * - productId (ObjectId hoặc string code ở input)
 * - packageQuantity (số SP / combo)
 * - sellingPrice
 * - giftQuantity (số quà / combo)
 *
 * Combo KHÔNG lưu variant / quà cụ thể.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "@/components/common/feedback/Toast";

// ============================================================================
// Types
// ============================================================================

export interface ComboProductRef {
  _id: string;
  code: string;
  name: string;
}

export interface ComboItemDetail {
  // Không còn variant item; giữ field rỗng để tương thích ngược nếu cần.
  _id?: string;
}

export interface ComboListItem {
  _id: string;
  code: string;
  name: string;
  product: string | ComboProductRef;
  productId: string;
  packageQuantity: number;
  sellingPrice: number;
  giftQuantity: number;
  displayOrder?: number;
  image?: string;
  isActive?: boolean;
  itemCount?: number;
}

export interface ComboDetail extends ComboListItem {
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateComboInput {
  code: string;
  name: string;
  /** ObjectId hoặc code của Product. */
  productId?: string;
  productCode?: string;
  packageQuantity: number;
  sellingPrice: number;
  giftQuantity?: number;
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

async function deleteCombo(id: string): Promise<{ affectedOrdersCount: number; message: string }> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
    data?: { affectedOrdersCount: number } | null;
  }>(`/api/combos/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete combo");
  }

  return {
    affectedOrdersCount: response.data.data?.affectedOrdersCount ?? 0,
    message: response.data.message ?? "Xóa combo thành công",
  };
}

// ============================================================================
// Hooks
// ============================================================================

export function useComboList(params?: {
  page?: number;
  limit?: number;
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
      void queryClient.invalidateQueries({ queryKey: ["combos-by-product"] });
      void queryClient.invalidateQueries({ queryKey: ["all-combos"] });
      void queryClient.invalidateQueries({ queryKey: ["product-list"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      toast.success("Cập nhật combo thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCombo,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["combo-list"] });
      void queryClient.invalidateQueries({ queryKey: ["combos-by-product"] });
      void queryClient.invalidateQueries({ queryKey: ["all-combos"] });
      // Dùng message từ server (đã chứa cảnh báo affectedOrdersCount)
      toast.success(result.message ?? "Xóa combo thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}