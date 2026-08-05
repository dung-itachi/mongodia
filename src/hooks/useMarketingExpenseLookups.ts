/**
 * ==================================================
 * MARKETING EXPENSE LOOKUP HOOKS
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements
 *
 * Hooks để fetch Facebook Pages và Employees cho Toolbar filters.
 */

import { useState, useEffect, useCallback } from "react";

interface SelectOption {
  label: string;
  value: string;
}

// ============================================================================
// useFacebookPages
// ============================================================================

interface UseFacebookPagesResult {
  pages: SelectOption[];
  loading: boolean;
  error: string | null;
}

export function useFacebookPages(): UseFacebookPagesResult {
  const [pages, setPages] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPages() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/facebook-pages?pageSize=100&isActive=true");

        if (!res.ok) {
          throw new Error("Không thể tải danh sách Facebook Pages");
        }

        const json = await res.json();

        if (cancelled) return;

        if (json.success && json.data?.items) {
          const options: SelectOption[] = json.data.items.map((page: { _id: string; name: string }) => ({
            label: page.name,
            value: page._id,
          }));
          setPages(options);
        } else {
          setPages([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lỗi khi tải Facebook Pages");
          setPages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPages();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loading, error };
}

// ============================================================================
// useMarketingEmployees
// ============================================================================

interface UseMarketingEmployeesResult {
  employees: SelectOption[];
  loading: boolean;
  error: string | null;
}

export function useMarketingEmployees(): UseMarketingEmployeesResult {
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/employees?pageSize=100&isActive=true");

      if (!res.ok) {
        throw new Error("Không thể tải danh sách nhân viên");
      }

      const json = await res.json();

      if (json.success && json.data?.items) {
        const options: SelectOption[] = json.data.items.map((emp: { _id: string; fullName: string; employeeCode?: string }) => ({
          label: emp.employeeCode
            ? `${emp.fullName} (${emp.employeeCode})`
            : emp.fullName,
          value: emp._id,
        }));
        setEmployees(options);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải nhân viên");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await fetchEmployees();
      if (cancelled) return;
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchEmployees]);

  return { employees, loading, error };
}
