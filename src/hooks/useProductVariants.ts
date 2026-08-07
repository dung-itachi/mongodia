/**
 * ==================================================
 * PRODUCT VARIANTS HOOKS
 * ==================================================
 *
 * Sprint 8.x - Generic Variant Support
 *
 * Hooks for fetching Product with VariantOptions and Variants.
 * Dùng cho Order Form và Product Management.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import api from "@/lib/axios";
import type {
  ProductWithVariants,
  ProductVariant,
  VariantOptionWithValues,
  ProductVariantsResponse,
  ProductDetailWithVariantsResponse,
  ProductAttribute,
} from "@/types/variant";

// ============================================================================
// API Functions
// ============================================================================

async function fetchProductWithVariants(productId: string): Promise<ProductDetailWithVariantsResponse> {
  const response = await api.get<{
    success: boolean;
    data: ProductDetailWithVariantsResponse;
  }>(`/api/products/${productId}/variants`);

  if (!response.data.success) {
    throw new Error("Failed to fetch product variants");
  }

  return response.data.data;
}

async function fetchProductVariantOptions(productId: string): Promise<VariantOptionWithValues[]> {
  const response = await api.get<{
    success: boolean;
    data: { items: VariantOptionWithValues[] };
  }>(`/api/products/${productId}/variant-options`);

  if (!response.data.success) {
    throw new Error("Failed to fetch variant options");
  }

  return response.data.data.items;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch product with its variant options and variants
 */
export function useProductWithVariants(productId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<ProductDetailWithVariantsResponse, Error>({
    queryKey: ["product-variants", productId],
    queryFn: () => fetchProductWithVariants(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    product: data?.product ?? null,
    variantOptions: data?.variantOptions ?? [],
    variants: data?.variants ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch variant options for a product
 */
export function useProductVariantOptions(productId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<VariantOptionWithValues[], Error>({
    queryKey: ["product-variant-options", productId],
    queryFn: () => fetchProductVariantOptions(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    variantOptions: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

// ============================================================================
// Variant Resolution Helpers
// ============================================================================

export interface ResolvedVariant {
  variant: ProductVariant | null;
  sku: string;
  price: number;
  attributes: Array<{
    optionId: string;
    optionName: string;
    valueId: string;
    valueName: string;
  }>;
  /** Display string: "Đen / XL" */
  displayString: string;
}

/**
 * Resolve variant từ attributes đã chọn.
 */
export function resolveVariantFromAttributes(
  attributes: ProductAttribute[],
  variants: ProductVariant[]
): ResolvedVariant {
  if (attributes.length === 0) {
    return {
      variant: null,
      sku: "",
      price: 0,
      attributes: [],
      displayString: "",
    };
  }

  const selectedValueIds = new Set(attributes.map((a) => a.valueId));

  // Find variant that matches all selected attributes
  const matchedVariant = variants.find((variant) => {
    const variantValueIds = variant.variantValues.map((v) =>
      typeof v === "string" ? v : v._id
    );
    return attributes.every((attr) => variantValueIds.includes(attr.valueId));
  });

  if (!matchedVariant) {
    return {
      variant: null,
      sku: "",
      price: 0,
      attributes: [],
      displayString: attributes.map((a) => a.valueId).join(", "),
    };
  }

  return {
    variant: matchedVariant,
    sku: matchedVariant.sku,
    price: matchedVariant.price,
    attributes: [],
    displayString: "",
  };
}

/**
 * Generate unique temp ID for UI
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Re-export types
export type { ProductWithVariants, ProductVariant, VariantOptionWithValues };
