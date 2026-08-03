/**
 * useTableState Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Combined state management for tables.
 */

import { useState, useCallback } from "react";
import usePagination, { PaginationState, PaginationActions } from "./usePagination";
import useSelection from "./useSelection";
import useSorting, { SortField, SortOrder } from "./useSorting";

export type TableState = {
  pagination: PaginationState;
  selection: {
    selectedKeys: (string | number)[];
    selectedRows: Record<string, unknown>[];
  };
  sorting: {
    sortField: SortField;
    sortOrder: SortOrder;
  };
  search: string;
  filters: Record<string, unknown>;
};

export type TableActions = {
  pagination: PaginationActions;
  selection: {
    handleSelectionChange: (
      keys: (string | number)[],
      rows: Record<string, unknown>[]
    ) => void;
    clearSelection: () => void;
    selectRow: (key: string | number) => void;
    deselectRow: (key: string | number) => void;
    toggleSelection: (key: string | number) => void;
  };
  sorting: {
    handleSort: (field: string) => void;
    clearSort: () => void;
  };
  setSearch: (value: string) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  resetAll: () => void;
};

export function useTableState(
  initialPage = 1,
  initialPageSize = 20
): [TableState, TableActions] {
  const [pagination, paginationActions] = usePagination(initialPage, initialPageSize);
  const {
    sortField,
    sortOrder,
    handleSort,
    clearSort,
  } = useSorting();
  const selectionResult = useSelection();
  const {
    selectedKeys,
    selectedRows,
    handleSelectionChange,
    clearSelection,
    selectRow,
    deselectRow,
    toggleSelection,
  } = selectionResult;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const setFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const resetAll = useCallback(() => {
    paginationActions.reset();
    clearSelection();
    clearSort();
    setSearch("");
    setFilters({});
  }, [paginationActions, clearSelection, clearSort]);

  const tableState: TableState = {
    pagination,
    selection: {
      selectedKeys: selectedKeys as (string | number)[],
      selectedRows,
    },
    sorting: {
      sortField,
      sortOrder,
    },
    search,
    filters,
  };

  const tableActions: TableActions = {
    pagination: paginationActions,
    selection: {
      handleSelectionChange,
      clearSelection,
      selectRow,
      deselectRow,
      toggleSelection,
    },
    sorting: {
      handleSort,
      clearSort,
    },
    setSearch,
    setFilters,
    setFilter,
    clearFilters,
    resetAll,
  };

  return [tableState, tableActions];
}

export default useTableState;