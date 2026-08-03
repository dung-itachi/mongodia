/**
 * useFilters Hook (Sprint 3 - Common UI Kit)
 *
 * Manage filter state with type safety.
 */

import { useState, useCallback } from "react";

export type FilterState = Record<string, unknown>;

export type FilterActions = {
  setFilter: (key: string, value: unknown) => void;
  setFilters: (filters: FilterState) => void;
  removeFilter: (key: string) => void;
  clearFilters: () => void;
  resetFilters: () => void;
};

export function useFilters<T extends FilterState>(
  initialFilters: T = {} as T
): [T, FilterActions] {
  const [filters, setFiltersState] = useState<T>(initialFilters);

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters } as T));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFiltersState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({} as T);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
  }, [initialFilters]);

  return [
    filters,
    { setFilter, setFilters, removeFilter, clearFilters, resetFilters },
  ];
}

export default useFilters;
