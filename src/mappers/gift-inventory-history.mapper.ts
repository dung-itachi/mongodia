import type { IGiftInventoryHistory } from "@/models/GiftInventoryHistory";

interface PopulatedEmployee {
  _id?: unknown;
  employeeCode?: string;
  fullName?: string;
}

export function mapGiftInventoryHistory(
  history: IGiftInventoryHistory & { _id?: unknown; createdBy?: unknown }
) {
  const createdBy = history.createdBy as unknown as PopulatedEmployee;
  const isPopulatedEmployee = typeof createdBy === "object" && createdBy !== null;

  return {
    _id: history._id,
    giftId: history.giftId,
    type: history.type,
    quantityBefore: history.quantityBefore,
    quantityChange: history.quantityChange,
    quantityAfter: history.quantityAfter,
    createdAt: history.createdAt,
    createdBy: isPopulatedEmployee
      ? {
          _id: createdBy._id,
          employeeCode: createdBy.employeeCode,
          fullName: createdBy.fullName,
        }
      : createdBy,
    note: history.note ?? "",
  };
}
