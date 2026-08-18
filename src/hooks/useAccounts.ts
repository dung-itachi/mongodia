"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export type Account = {
  _id: string; employeeCode: string; username: string; fullName: string; email: string; phone?: string; avatar?: string;
  bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string;
  isActive: boolean; role?: { code: string; name: string }; team?: { _id?: string; code: string; name: string; departmentId?: { code: string; name: string } }; department?: { _id?: string; code: string; name: string }; departmentId?: { _id: string; code: string; name: string }; leader?: { _id: string; employeeCode: string; fullName: string }; area?: { _id: string; code: string; name: string }; createdAt?: string; updatedAt?: string; permissions?: string[];
};
export type AccountFilters = { search?: string; role?: string; teamId?: string; leaderId?: string; areaId?: string; isActive?: boolean; page?: number; pageSize?: number };
export type AccountInput = { username?: string; password?: string; fullName: string; email?: string; phone?: string; avatar?: string; roleCode?: string; teamId?: string | null; departmentId?: string | null; leaderId?: string | null; areaId?: string | null; isActive?: boolean; bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string };

export type AccountList = { items: Account[]; total: number; page: number; pageSize: number; totalPages: number };

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchEnvelope<T>(response: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await response;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

const query = (filters: AccountFilters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== null).map(([key, value]) => [key, String(value)])).toString();

export function useAccounts(filters: AccountFilters = {}) {
  return useQuery<AccountList>({
    queryKey: ["accounts", filters],
    queryFn: () => fetchEnvelope<AccountList>(api.get<ApiEnvelope<AccountList>>(`/api/accounts?${query(filters)}`)),
    staleTime: 30_000,
    retry: false,
  });
}
export function useAccount(id: string | null) {
  return useQuery<Account>({
    queryKey: ["account", id],
    queryFn: () => fetchEnvelope<Account>(api.get<ApiEnvelope<Account>>(`/api/accounts/${id}`)),
    enabled: Boolean(id),
    retry: false,
  });
}
function useAccountMutation<T>(fn: (input: T) => Promise<unknown>, successText: string) {
  const client = useQueryClient();
  
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["accounts"] }); },
  });
}
export function useCreateAccount() { return useAccountMutation((input: AccountInput) => fetchEnvelope<Account>(api.post<ApiEnvelope<Account>>("/api/accounts", input)), "Tạo tài khoản thành công"); }
export function useUpdateAccount() { return useAccountMutation(({ id, input }: { id: string; input: AccountInput }) => fetchEnvelope<Account>(api.patch<ApiEnvelope<Account>>(`/api/accounts/${id}`, input)), "Cập nhật tài khoản thành công"); }
export function useDisableAccount() { return useAccountMutation(({ id, isActive }: { id: string; isActive: boolean }) => fetchEnvelope<Account>(api.patch<ApiEnvelope<Account>>(`/api/accounts/${id}`, { isActive })), "Cập nhật trạng thái thành công"); }
export function useResetPassword() { return useAccountMutation(({ id, newPassword }: { id: string; newPassword: string }) => fetchEnvelope<null>(api.patch<ApiEnvelope<null>>(`/api/accounts/${id}/reset-password`, { newPassword })), "Đặt lại mật khẩu thành công"); }