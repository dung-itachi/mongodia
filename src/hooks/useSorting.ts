/**
 * useSorting Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Manage sorting state for tables.
 */

import { useState, useCallback } from "react";

export type SortOrder = "asc" | "desc" | null;
export type SortField = string | null;

export function useSorting(initialField?: SortField, initialOrder?: SortOrder) {
  const [sortField, setSortField] = useState<SortField>(initialField || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder || null);

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Toggle order
        if (sortOrder === "asc") {
          setSortOrder("desc");
        } else if (sortOrder === "desc") {
          setSortOrder(null);
          setSortField(null);
        } else {
          setSortOrder("asc");
        }
      } else {
        // New field
        setSortField(field);
        setSortOrder("asc");
      }
    },
    [sortField, sortOrder]
  );

  const clearSort = useCallback(() => {
    setSortField(null);
    setSortOrder(null);
  }, []);

  const getSortParams = useCallback(() => {
    if (!sortField || !sortOrder) return {};
    return {
      sort: sortField,
      order: sortOrder,
    };
  }, [sortField, sortOrder]);

  return {
    sortField,
    sortOrder,
    handleSort,
    clearSort,
    getSortParams,
    isSorted: sortOrder !== null,
    isAsc: sortOrder === "asc",
    isDesc: sortOrder === "desc",
  };
}

export default useSorting;
