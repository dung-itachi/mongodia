/**
 * useSelection Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Manage row selection state for tables.
 */

import { useState, useCallback } from "react";

export type SelectionKey = string | number;

export function useSelection() {
  const [selectedKeys, setSelectedKeys] = useState<SelectionKey[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>([]);

  const handleSelectionChange = useCallback(
    (keys: SelectionKey[], rows: Record<string, unknown>[]) => {
      setSelectedKeys(keys);
      setSelectedRows(rows);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys([]);
    setSelectedRows([]);
  }, []);

  const selectRow = useCallback((key: SelectionKey) => {
    setSelectedKeys((prev) => [...prev, key]);
  }, []);

  const deselectRow = useCallback((key: SelectionKey) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  const toggleSelection = useCallback(
    (key: SelectionKey) => {
      if (selectedKeys.includes(key)) {
        deselectRow(key);
      } else {
        selectRow(key);
      }
    },
    [selectedKeys, selectRow, deselectRow]
  );

  const isSelected = useCallback(
    (key: SelectionKey) => selectedKeys.includes(key),
    [selectedKeys]
  );

  return {
    selectedKeys,
    selectedRows,
    handleSelectionChange,
    clearSelection,
    selectRow,
    deselectRow,
    toggleSelection,
    isSelected,
    hasSelection: selectedKeys.length > 0,
    selectedCount: selectedKeys.length,
  };
}

export default useSelection;