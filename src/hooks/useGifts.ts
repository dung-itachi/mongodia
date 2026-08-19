import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export interface GiftListItem {
  _id: string;
  name: string;
  stockQuantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGiftInput {
  name: string;
  stockQuantity?: number;
  isActive?: boolean;
}

export interface UpdateGiftInput {
  name: string;
  isActive: boolean;
}

export interface GiftInventoryHistoryItem {
  _id: string;
  giftId: string;
  type: "INITIAL" | "IMPORT" | "ADJUSTMENT";
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  createdAt: string;
  createdBy: { _id: string; employeeCode?: string; fullName?: string };
  note: string;
}

interface GiftListResponse {
  items: GiftListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface GiftInventoryHistoryResponse {
  items: GiftInventoryHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

type ApiResponse<T> = { success: boolean; data: T; message?: string };

async function fetchGiftList(params?: {
  search?: string;
  isActive?: boolean | null;
}): Promise<GiftListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.isActive !== undefined && params?.isActive !== null) {
    query.set("isActive", String(params.isActive));
  }
  const qs = query.toString();
  const response = await api.get<ApiResponse<GiftListResponse>>(
    `/api/gifts${qs ? `?${qs}` : ""}`
  );
  if (!response.data.success) throw new Error(getTranslated("Không thể tải danh sách quà tặng"));
  return response.data.data;
}

async function createGift(input: CreateGiftInput): Promise<GiftListItem> {
  const response = await api.post<ApiResponse<GiftListItem>>("/api/gifts", input);
  if (!response.data.success) throw new Error(response.data.message ?? getTranslated("Không thể tạo quà tặng"));
  return response.data.data;
}

async function updateGift(id: string, input: UpdateGiftInput): Promise<GiftListItem> {
  const response = await api.put<ApiResponse<GiftListItem>>(`/api/gifts/${id}`, input);
  if (!response.data.success) throw new Error(response.data.message ?? getTranslated("Không thể cập nhật quà tặng"));
  return response.data.data;
}

async function deleteGift(id: string): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(`/api/gifts/${id}`);
  if (!response.data.success) throw new Error(response.data.message ?? getTranslated("Không thể xóa quà tặng"));
}

async function fetchGiftInventoryHistory(id: string): Promise<GiftInventoryHistoryResponse> {
  const response = await api.get<ApiResponse<GiftInventoryHistoryResponse>>(
    `/api/gifts/${id}/inventory`
  );
  if (!response.data.success) throw new Error(getTranslated("Không thể tải lịch sử tồn quà tặng"));
  return response.data.data;
}

async function changeGiftInventory(
  id: string,
  input:
    | { operation: "IMPORT"; quantity: number; note: string }
    | { operation: "ADJUSTMENT"; direction: "INCREASE" | "DECREASE"; quantity: number; note: string }
): Promise<GiftListItem> {
  const response = await api.post<ApiResponse<{ gift: GiftListItem }>>(
    `/api/gifts/${id}/inventory`,
    input
  );
  if (!response.data.success) throw new Error(response.data.message ?? getTranslated("Không thể thay đổi tồn quà tặng"));
  return response.data.data.gift;
}

function invalidateGiftData(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["gift-list"] });
  if (id) {
    void queryClient.invalidateQueries({ queryKey: ["gift-inventory-history", id] });
  }
}

export function useGiftList(params?: { search?: string; isActive?: boolean | null }) {
  return useQuery({
    queryKey: ["gift-list", params?.search ?? "", params?.isActive ?? null],
    queryFn: () => fetchGiftList(params),
    staleTime: 0,
  });
}

export function useGiftInventoryHistory(id: string | null) {
  return useQuery({
    queryKey: ["gift-inventory-history", id],
    queryFn: () => fetchGiftInventoryHistory(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCreateGift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createGift,
    onSuccess: () => {
      invalidateGiftData(queryClient);
    },
  });
}

export function useUpdateGift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGiftInput }) => updateGift(id, input),
    onSuccess: () => {
      invalidateGiftData(queryClient);
    },
  });
}

export function useDeleteGift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteGift,
    onSuccess: () => {
      invalidateGiftData(queryClient);
    },
  });
}

export function useChangeGiftInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input:
        | { operation: "IMPORT"; quantity: number; note: string }
        | {
            operation: "ADJUSTMENT";
            direction: "INCREASE" | "DECREASE";
            quantity: number;
            note: string;
          };
    }) => changeGiftInventory(id, input),
    onSuccess: (_, variables) => {
      invalidateGiftData(queryClient, variables.id);
    },
  });
}
