/**
 * useSearchParams Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Manage URL search params state.
 */

import { useCallback } from "react";
import { useSearchParams as useNextSearchParams } from "next/navigation";

export function useSearchParams() {
  const searchParams = useNextSearchParams();

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const getParamAsNumber = useCallback(
    (key: string, defaultValue: number = 0): number => {
      const value = searchParams.get(key);
      const parsed = parseInt(value || "", 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    [searchParams]
  );

  const getAllParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  return {
    searchParams,
    getParam,
    getParamAsNumber,
    getAllParams,
  };
}

export default useSearchParams;
