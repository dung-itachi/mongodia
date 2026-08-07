/**
 * Product Module Hooks (Sprint 8.5.2)
 *
 * Hooks for fetching Products, Categories, and Combos from Product Module.
 * Uses existing API routes - NO new API creation.
 * Uses axios for automatic authentication token handling.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

// ============================================================================
// Types - Match Product Module structure
// ============================================================================

/**
 * Category from Category API
 */
export interface CategoryItem {
  _id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  parent?: string | null;
  isActive?: boolean;
}

/**
 * Product from Product API
 * Note: category field is populated from categoryId
 */
export interface ProductItem {
  _id: string;
  code: string;
  name: string;
  category: CategoryItem | string;
  image?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Combo from Combo API
 * Note: product field is populated from productId
 */
export interface ComboItem {
  _id: string;
  code: string;
  name: string;
  product: ProductItem | string;
  category: CategoryItem | string;
  sellingPrice: number;
  packageSize: number;
  displayOrder?: number;
  image?: string;
  description?: string;
  isActive?: boolean;
  itemCount?: number;
}

/**
 * Product with category info (normalized)
 */
export interface ProductWithCategory {
  _id: string;
  code: string;
  name: string;
  categoryId?: string;
  categoryCode?: string;
  categoryName?: string;
}

/**
 * Combo with product info (normalized)
 */
export interface ComboWithProduct {
  _id: string;
  code: string;
  name: string;
  sellingPrice: number;
  packageSize: number;
  productId?: string;
  productName?: string;
  description?: string;
}

/**
 * Category with products (grouped view)
 */
export interface CategoryWithProducts {
  _id: string;
  code: string;
  name: string;
  products: ProductWithCategory[];
}

// ============================================================================
// API Functions - Using axios for automatic token handling
// ============================================================================

async function fetchCategories(): Promise<CategoryItem[]> {
  const response = await api.get<{ success: boolean; data: { items: CategoryItem[] } }>("/api/categories");

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to fetch categories");
  }

  return response.data.data.items;
}

async function fetchProducts(): Promise<ProductItem[]> {
  const response = await api.get<{ success: boolean; data: { items: ProductItem[] } }>("/api/products");

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to fetch products");
  }

  return response.data.data.items;
}

async function fetchCombosByProduct(productId: string): Promise<ComboItem[]> {
  const response = await api.get<{ success: boolean; data: { items: ComboItem[] } }>(
    `/api/combos?productId=${productId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to fetch combos");
  }

  return response.data.data.items;
}

async function fetchAllCombos(): Promise<ComboItem[]> {
  const response = await api.get<{ success: boolean; data: { items: ComboItem[] } }>(
    "/api/combos?limit=1000"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to fetch combos");
  }

  return response.data.data.items;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all categories (isActive = true)
 */
export function useCategories() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<CategoryItem[], Error>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  return {
    categories: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch all products with category info (isActive = true)
 */
export function useProducts() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ProductItem[], Error>({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  return {
    products: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch combos for a specific product (isActive = true)
 */
export function useCombosByProduct(productId: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ComboItem[], Error>({
    queryKey: ["combos-by-product", productId],
    queryFn: () => fetchCombosByProduct(productId!),
    enabled: !!productId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  return {
    combos: data ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch ALL active combos (for landing parser lookup)
 */
export function useAllCombos() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ComboItem[], Error>({
    queryKey: ["all-combos"],
    queryFn: fetchAllCombos,
    enabled: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  return {
    combos: data ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get products grouped by category
 * Extracts category info directly from products (no separate categories API call needed)
 */
export function useProductsByCategory() {
  const { products, loading, error, refetch } = useProducts();

  const categoriesWithProducts: CategoryWithProducts[] = (() => {
    const grouped: Record<string, CategoryWithProducts> = {};

    products.forEach((product) => {
      // Extract category info directly from product.category (populated by API)
      const cat = product.category;
      // Handle both object and string format
      let categoryId: string;
      let categoryCode: string;
      let categoryName: string;

      if (typeof cat === "object" && cat !== null) {
        categoryId = (cat as CategoryItem)._id || "unknown";
        categoryCode = (cat as CategoryItem).code || "";
        categoryName = (cat as CategoryItem).name || "Khác";
      } else {
        // category is just a string (ObjectId)
        categoryId = String(cat);
        categoryCode = "";
        categoryName = "Khác";
      }

      if (!grouped[categoryId]) {
        grouped[categoryId] = {
          _id: categoryId,
          code: categoryCode,
          name: categoryName,
          products: [],
        };
      }

      grouped[categoryId].products.push({
        _id: product._id,
        code: product.code,
        name: product.name,
        categoryId,
        categoryCode,
        categoryName,
      });
    });

    return Object.values(grouped);
  })();

  return {
    categories: categoriesWithProducts,
    loading,
    error: typeof error === "string" ? error : error ? String(error) : null,
    refetch,
  };
}

/**
 * Hook to normalize combos with product info
 * Returns combos ready for UI display
 */
export function useCombosWithProduct(productId: string | null) {
  const { combos, loading, error, refetch } = useCombosByProduct(productId);

  const normalizedCombos: ComboWithProduct[] = combos.map((combo) => {
    const product = combo.product;
    return {
      _id: combo._id,
      code: combo.code,
      name: combo.name,
      sellingPrice: combo.sellingPrice,
      packageSize: combo.packageSize,
      productId: typeof product === "object" && product !== null ? product._id : String(product),
      productName: typeof product === "object" && product !== null ? product.name : "",
      description: combo.description,
    };
  });

  return {
    combos: normalizedCombos,
    loading,
    error: typeof error === "string" ? error : error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to normalize ALL combos with product info
 * For landing parser lookup
 */
export function useAllCombosNormalized() {
  const { combos, loading, error, refetch } = useAllCombos();

  // Helper function to normalize
  const normalizedCombos = (): ComboWithProduct[] => {
    return combos.map((combo) => {
      const product = combo.product;
      return {
        _id: combo._id,
        code: combo.code,
        name: combo.name,
        sellingPrice: combo.sellingPrice,
        packageSize: combo.packageSize,
        productId: typeof product === "object" && product !== null ? product._id : String(product),
        productName: typeof product === "object" && product !== null ? product.name : "",
        description: combo.description,
      };
    });
  };

  // Build lookup maps
  const comboMap: Record<string, ComboWithProduct> = {};
  const comboByNameMap: Record<string, ComboWithProduct> = {};

  combos.forEach((combo) => {
    const product = combo.product;
    const normalized: ComboWithProduct = {
      _id: combo._id,
      code: combo.code,
      name: combo.name,
      sellingPrice: combo.sellingPrice,
      packageSize: combo.packageSize,
      productId: typeof product === "object" && product !== null ? product._id : String(product),
      productName: typeof product === "object" && product !== null ? product.name : "",
      description: combo.description,
    };

    comboMap[combo._id] = normalized;
    // Key by lowercase name for case-insensitive lookup
    comboByNameMap[combo.name.toLowerCase()] = normalized;
  });

  return {
    combos: normalizedCombos(),
    comboMap,
    comboByNameMap,
    loading,
    error: error?.message ?? null,
    refetch,
  };
}
