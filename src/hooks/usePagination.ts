/**
 * usePagination Hook (Sprint 3 - Common UI Kit)
 *
 * Manage pagination state and calculations.
 */

import { useState, useCallback } from "react";

export type PaginationState = {
  current: number;
  pageSize: number;
  total: number;
};

export type PaginationActions = {
  setCurrent: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  reset: () => void;
  nextPage: () => void;
  prevPage: () => void;
};

export function usePagination(
  initialPage: number = 1,
  initialPageSize: number = 20
): [PaginationState, PaginationActions] {
  const [state, setState] = useState<PaginationState>({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  const setCurrent = useCallback((page: number) => {
    setState((prev) => ({ ...prev, current: page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, pageSize: size, current: 1 }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setState((prev) => ({ ...prev, total }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      current: initialPage,
      pageSize: initialPageSize,
    }));
  }, [initialPage, initialPageSize]);

  const nextPage = useCallback(() => {
    setState((prev) => ({ ...prev, current: prev.current + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      current: Math.max(1, prev.current - 1),
    }));
  }, []);

  return [
    state,
    { setCurrent, setPageSize, setTotal, reset, nextPage, prevPage },
  ];
}

export default usePagination;
