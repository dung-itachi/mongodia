/**
 * Gift Hooks (Sprint 8.x - Gift Management)
 *
 * Hooks for CRUD operations on Gifts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import api from "@/lib/axios";

// ============================================================================
// Types
// ============================================================================

export interface GiftListItem {
  _id: string;
  name: string;
  stockQuantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GiftDetail extends GiftListItem {}

export interface CreateGiftInput {
  name: string;
  stockQuantity?: number;
  isActive?: boolean;
}

export interface UpdateGiftInput {
  name: string;
  stockQuantity: number;
  isActive: boolean;
}

interface GiftListResponse {
  items: GiftListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchGiftList(params?: {
  search?: string;
  isActive?: boolean | null;
}): Promise<GiftListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.isActive !== undefined && params?.isActive !== null) {
    query.set("isActive", String(params.isActive));
  }
  const qs = query.toString();

  const response = await api.get<{ success: boolean; data: GiftListResponse }>(
    `/api/gifts${qs ? `?${qs}` : ""}`
  );
  if (!response.data.success) {
    throw new Error("Failed to fetch gifts");
  }
  return response.data.data;
}

async function fetchGiftDetail(id: string): Promise<GiftDetail> {
  const response = await api.get<{ success: boolean; data: GiftDetail }>(
    `/api/gifts/${id}`
  );
  if (!response.data.success) {
    throw new Error("Failed to fetch gift");
  }
  return response.data.data;
}

async function createGift(input: CreateGiftInput): Promise<GiftDetail> {
  const response = await api.post<{
    success: boolean;
    data: GiftDetail;
    message?: string;
  }>("/api/gifts", input);
  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create gift");
  }
  return response.data.data;
}

async function updateGift(id: string, input: UpdateGiftInput): Promise<GiftDetail> {
  const response = await api.put<{
    success: boolean;
    data: GiftDetail;
    message?: string;
  }>(`/api/gifts/${id}`, input);
  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update gift");
  }
  return response.data.data;
}

async function deleteGift(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/gifts/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete gift");
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useGiftList(params?: { search?: string; isActive?: boolean | null }) {
  return useQuery({
    queryKey: ["gift-list", params?.search ?? "", params?.isActive ?? null],
    queryFn: () => fetchGiftList(params),
    staleTime: 0,
  });
}

export function useGiftDetail(id: string | null) {
  return useQuery({
    queryKey: ["gift-detail", id],
    queryFn: () => fetchGiftDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGift,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gift-list"] });
      void message.success("Tạo quà tặng thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGiftInput }) =>
      updateGift(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["gift-list"] });
      void queryClient.invalidateQueries({
        queryKey: ["gift-detail", variables.id],
      });
      void message.success("Cập nhật quà tặng thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useDeleteGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGift,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gift-list"] });
      void message.success("Xóa quà tặng thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}
