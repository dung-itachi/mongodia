import mongoose from "mongoose";

export function canAccessWarehouse(
  currentUser: { permissions: string[]; role?: { code?: string }; employee?: { warehouseId?: mongoose.Types.ObjectId | null } },
  warehouseId: string
) {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) return false;
  if (currentUser.permissions.includes("*") || ["ADMIN", "MANAGER"].includes(currentUser.role?.code ?? "")) return true;
  const assigned = currentUser.employee?.warehouseId?.toString();
  return Boolean(assigned && assigned === warehouseId);
}

export function canAccessAllWarehouses(currentUser: { permissions: string[]; role?: { code?: string } }) {
  return currentUser.permissions.includes("*") || ["ADMIN", "MANAGER"].includes(currentUser.role?.code ?? "");
}
