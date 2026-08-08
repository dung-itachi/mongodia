import { useQuery } from "@tanstack/react-query";

export type Warehouse = {
  _id: string;
  code: string;
  name: string;
  areaId?: { _id: string; code: string; name: string };
  managerId?: { _id: string; employeeCode: string; fullName: string } | null;
  address?: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

async function fetchWarehouses() {
  const res = await fetch("/api/warehouses?limit=100");
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Không tải được danh sách kho");
  return data.data.items as Warehouse[];
}

export function useWarehouses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["warehouses-all"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60 * 1000,
  });
  return { warehouses: data ?? [], loading: isLoading, error };
}
