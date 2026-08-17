/**
 * useRecipientOptions Hook
 *
 * Fetches employee/team recipient options for notification targeting.
 * Supports different selection modes:
 *   - By individual employee
 *   - By team (select team → all members)
 *   - By leader (select leader → leader + all employees under them)
 *   - By role (select role → all employees with that role)
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type RecipientEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  role: string;
  roleLabel: string;
  teamName?: string | null;
};

export type RecipientTeam = {
  id: string;
  code: string;
  name: string;
  memberCount: number;
};

export type RecipientOption =
  | { type: "employee"; data: RecipientEmployee }
  | { type: "team"; data: RecipientTeam };

export type RecipientGroup = {
  employees: RecipientEmployee[];
  teams: RecipientTeam[];
};

export type RecipientMode =
  | "individual"    // Select individual employees
  | "team"           // Select entire teams
  | "leader"         // Select leader + all employees under them
  | "role";          // Select by role (sale/mkt/warehouse)

type RecipientQueryParams = {
  mode?: "employees" | "teams" | "all";
  role?: string;
  roles?: string[];
  teamId?: string;
  leaderId?: string;
  keyword?: string;
  includeHierarchy?: boolean;
  pageSize?: number;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchRecipientOptions(
  params: RecipientQueryParams = {}
): Promise<RecipientGroup> {
  const searchParams = new URLSearchParams();

  if (params.mode) searchParams.set("mode", params.mode);
  if (params.role) searchParams.set("role", params.role);
  if (params.roles && params.roles.length > 0) {
    searchParams.set("roles", params.roles.join(","));
  }
  if (params.teamId) searchParams.set("teamId", params.teamId);
  if (params.leaderId) searchParams.set("leaderId", params.leaderId);
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.includeHierarchy) {
    searchParams.set("includeHierarchy", "true");
  }
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const url = `/api/employees/recipients?${searchParams.toString()}`;
  const response = await api.get<ApiEnvelope<RecipientGroup>>(url);

  if (!response.data.success) {
    throw new Error(
      response.data.message ?? "Không thể tải danh sách người nhận"
    );
  }

  return response.data.data;
}

/**
 * Hook to fetch all recipient options (employees + teams) for the selector.
 */
export function useRecipientOptions(options?: RecipientQueryParams) {
  return useQuery<RecipientGroup>({
    queryKey: ["employees", "recipients", options],
    queryFn: () => fetchRecipientOptions({ mode: "all", ...options }),
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch employees only (for individual selection or role-based).
 */
export function useEmployeeRecipients(options?: RecipientQueryParams) {
  return useQuery<RecipientEmployee[]>({
    queryKey: ["employees", "recipients", "list", options],
    queryFn: async () => {
      const data = await fetchRecipientOptions({
        mode: "employees",
        ...options,
      });
      return data.employees;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch teams only (for team-based selection).
 */
export function useTeamRecipients() {
  return useQuery<RecipientTeam[]>({
    queryKey: ["employees", "recipients", "teams"],
    queryFn: async () => {
      const data = await fetchRecipientOptions({ mode: "teams" });
      return data.teams;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch employees under a specific leader (including the leader).
 */
export function useLeaderTeam(leaderId: string | null) {
  return useQuery<RecipientEmployee[]>({
    queryKey: ["employees", "recipients", "leader", leaderId],
    queryFn: async () => {
      if (!leaderId) return [];
      const data = await fetchRecipientOptions({
        leaderId,
        includeHierarchy: true,
      });
      return data.employees;
    },
    enabled: Boolean(leaderId),
    staleTime: 60_000,
  });
}

/**
 * Hook to fetch employees by role(s).
 */
export function useRoleRecipients(roles: string[]) {
  return useQuery<RecipientEmployee[]>({
    queryKey: ["employees", "recipients", "roles", roles.join(",")],
    queryFn: async () => {
      if (roles.length === 0) return [];
      const data = await fetchRecipientOptions({
        roles,
      });
      return data.employees;
    },
    enabled: roles.length > 0,
    staleTime: 60_000,
  });
}
