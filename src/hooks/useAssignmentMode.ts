/**
 * Hook for Lead Assignment Mode setting (Sprint 8.x)
 *
 * Reads/writes the global setting that controls whether new Leads are
 * auto-assigned to a Sale or remain for manual assignment.
 *
 * Endpoints:
 *   GET /api/settings/lead-assignment-mode
 *   PUT /api/settings/lead-assignment-mode
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export type LeadAssignmentMode = "AUTO" | "MANUAL";

export interface LeadAssignmentModeSetting {
  mode: LeadAssignmentMode;
  updatedAt?: string;
  updatedBy?: string | null;
}

const SETTINGS_BASE = "/api/settings/lead-assignment-mode";

async function fetchAssignmentMode(): Promise<LeadAssignmentModeSetting> {
  const response = await api.get(SETTINGS_BASE);
  return response.data.data;
}

/**
 * Hook to read the current lead assignment mode.
 * - `staleTime: 5 min` vì setting ít khi đổi.
 * - `refetchOnMount: false` để tránh re-fetch khi navigate qua lại giữa các trang.
 */
export function useAssignmentMode() {
  const { data, isLoading, error, refetch } = useQuery<
    LeadAssignmentModeSetting,
    Error
  >({
    queryKey: ["settings", "lead-assignment-mode"],
    queryFn: fetchAssignmentMode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    mode: data?.mode ?? "MANUAL",
    setting: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to update the lead assignment mode.
 * On success, invalidates both:
 *   - `["settings", "lead-assignment-mode"]` để refetch cùng trang
 *   - `["marketing-leads"]` để các query list Lead reload (nếu đang cache)
 */
export function useUpdateAssignmentMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: LeadAssignmentMode) => {
      const response = await api.put(SETTINGS_BASE, { mode });
      return response.data.data as LeadAssignmentModeSetting;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["settings", "lead-assignment-mode"],
      });
      // Đảm bảo các query liên quan được refetch nếu có
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    },
  });
}
