/**
 * Category Module Hooks (Sprint 8.4.1)
 *
 * Hooks for CRUD operations on Categories.
 * Uses existing API routes - NO new API creation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "@/components/common/feedback/Toast";

// ============================================================================
// Types
// ============================================================================

export interface CategoryListItem {
  _id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  parent?: string | null;
  isActive?: boolean;
}

export interface CategoryDetail extends CategoryListItem {
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  code: string;
  name: string;
  parentCode?: string | null;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput extends CreateCategoryInput {
  isActive: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCategoryList(): Promise<{
  items: CategoryListItem[];
  total: number;
}> {
  const response = await api.get<{
    success: boolean;
    data: { items: CategoryListItem[]; total: number };
  }>("/api/categories");

  if (!response.data.success) {
    throw new Error("Failed to fetch categories");
  }

  return response.data.data;
}

async function fetchCategoryDetail(
  id: string
): Promise<CategoryDetail> {
  const response = await api.get<{
    success: boolean;
    data: CategoryDetail;
  }>(`/api/categories/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch category");
  }

  return response.data.data;
}

async function createCategory(
  input: CreateCategoryInput
): Promise<CategoryDetail> {
  const response = await api.post<{
    success: boolean;
    data: CategoryDetail;
    message?: string;
  }>("/api/categories", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create category");
  }

  return response.data.data;
}

async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<CategoryDetail> {
  const response = await api.put<{
    success: boolean;
    data: CategoryDetail;
    message?: string;
  }>(`/api/categories/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update category");
  }

  return response.data.data;
}

async function deleteCategory(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/categories/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete category");
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useCategoryList() {
  return useQuery({
    queryKey: ["category-list"],
    queryFn: fetchCategoryList,
    staleTime: 0,
  });
}

export function useCategoryDetail(id: string | null) {
  return useQuery({
    queryKey: ["category-detail", id],
    queryFn: () => fetchCategoryDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["category-list"] });
      toast.success(`Tạo danh mục "${data.name}" thành công`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCategoryInput;
    }) => updateCategory(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["category-list"] });
      void queryClient.invalidateQueries({
        queryKey: ["category-detail", variables.id],
      });
      toast.success(`Cập nhật danh mục "${data.name}" thành công`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["category-list"] });
      toast.success("Xóa danh mục thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
