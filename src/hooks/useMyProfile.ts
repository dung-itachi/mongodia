"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAntApp } from "@/providers/AntdProvider";
import api from "@/lib/axios";
import type { Account } from "@/hooks/useAccounts";

type ApiResponse<T> = { success: boolean; data: T; message?: string };
async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) { const { data } = await promise; if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại"); return data.data; }

export function useMyProfile() { return useQuery({ queryKey: ["my-profile"], queryFn: () => unwrap(api.get<ApiResponse<Account>>("/api/account/profile")) }); }
export function useUpdateMyProfile() {
  const client = useQueryClient();
  const { message } = useAntApp();
  return useMutation({
    mutationFn: (input: Pick<Account, "fullName" | "email" | "phone" | "avatar">) => unwrap(api.patch<ApiResponse<Account>>("/api/account/profile", input)),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["my-profile"] }); void message.success("Cập nhật hồ sơ thành công"); },
    onError: (error: Error) => void message.error(error.message),
  });
}
export function useChangeMyPassword() {
  const { message } = useAntApp();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => unwrap(api.patch<ApiResponse<null>>("/api/account/change-password", input)),
    onSuccess: () => void message.success("Đổi mật khẩu thành công"),
    onError: (error: Error) => void message.error(error.message),
  });
}