/**
 * Product Module Hooks (Sprint 8.4.1)
 *
 * Hooks for CRUD operations on Products.
 * Uses existing API routes - NO new API creation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import api from "@/lib/axios";
import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ProductCategoryRef {
  _id: string;
  code: string;
  name: string;
}

export interface ProductListItem {
  _id: string;
  code: string;
  name: string;
  category: ProductCategoryRef | string;
  image?: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductDetail extends ProductListItem {
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductInput {
  code: string;
  name: string;
  categoryCode: string;
  image?: string;
  description?: string;
}

export interface UpdateProductInput extends CreateProductInput {
  isActive: boolean;
}

// ============================================================================
// Product Management Types (Sprint 8.4.1)
// ============================================================================

export interface ComboListItem {
  _id: string;
  code: string;
  name: string;
  sellingPrice: number;
  packageSize: number;
  isActive: boolean;
}

export interface WarehouseInventoryStats {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  importedQuantity: number;
  currentQuantity: number;
  lastImportDate: string | null;
  lastWarehouseReceiptDate: string | null;
}

export interface ProductManagementItem extends ProductListItem {
  comboCount: number;
  combos: ComboListItem[];
  inventoryByWarehouse: Record<string, WarehouseInventoryStats>;
  closedOrdersCount: number;
  totalClosedQuantity: number;
}

export interface WarehouseInfo {
  _id: string;
  code: string;
  name: string;
}

export interface ProductManagementResponse {
  items: ProductManagementItem[];
  total: number;
  warehouses: WarehouseInfo[];
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchProductList(): Promise<{
  items: ProductListItem[];
  total: number;
}> {
  const response = await api.get<{
    success: boolean;
    data: { items: ProductListItem[]; total: number };
  }>("/api/products");

  if (!response.data.success) {
    throw new Error("Failed to fetch products");
  }

  return response.data.data;
}

async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const response = await api.get<{
    success: boolean;
    data: ProductDetail;
  }>(`/api/products/${id}`);

  if (!response.data.success) {
    throw new Error("Failed to fetch product");
  }

  return response.data.data;
}

async function createProduct(input: CreateProductInput): Promise<ProductDetail> {
  const response = await api.post<{
    success: boolean;
    data: ProductDetail;
    message?: string;
  }>("/api/products", input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to create product");
  }

  return response.data.data;
}

async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<ProductDetail> {
  const response = await api.put<{
    success: boolean;
    data: ProductDetail;
    message?: string;
  }>(`/api/products/${id}`, input);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update product");
  }

  return response.data.data;
}

async function deleteProduct(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message?: string;
  }>(`/api/products/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to delete product");
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useProductList() {
  return useQuery({
    queryKey: ["product-list"],
    queryFn: fetchProductList,
    staleTime: 0,
  });
}

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => fetchProductDetail(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-list"] });
      void message.success("Tạo sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      updateProduct(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["product-list"] });
      void queryClient.invalidateQueries({
        queryKey: ["product-detail", variables.id],
      });
      void message.success("Cập nhật sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-list"] });
      void message.success("Xóa sản phẩm thành công");
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}

// ============================================================================
// Product Management Hooks (Sprint 8.4.1)
// ============================================================================

async function fetchProductManagement(params?: {
  warehouseId?: string;
  keyword?: string;
}): Promise<ProductManagementResponse> {
  const searchParams = new URLSearchParams();
  if (params?.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params?.keyword) searchParams.set("keyword", params.keyword);

  const url = `/api/products/management${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const response = await api.get<{
    success: boolean;
    data: ProductManagementResponse;
  }>(url);

  if (!response.data.success) {
    throw new Error("Failed to fetch product management data");
  }

  return response.data.data;
}

export function useProductManagement(params?: {
  warehouseId?: string;
  keyword?: string;
}) {
  return useQuery({
    queryKey: ["product-management", params],
    queryFn: () => fetchProductManagement(params),
    staleTime: 0,
  });
}
