import Warehouse from "@/models/Warehouse";

// Mapping kho hard-coded theo `code`. Warehouse KHÔNG thuộc Area
// (Area chỉ dùng cho nhân viên) — seed thuần theo code.
// KHO1 = Kho Trung Quốc (kho nguồn).
// KHO2 = Kho Mông Cổ (kho chính).
const WAREHOUSES: Array<{ code: string; name: string }> = [
  { code: "KHO1", name: "Kho 1" },
  { code: "KHO2", name: "Kho 2" },
];

export async function seedWarehouses() {
  for (const warehouse of WAREHOUSES) {
    await Warehouse.updateOne(
      { code: warehouse.code },
      {
        $set: {
          code: warehouse.code,
          name: warehouse.name,
          isActive: true,
        },
        // Detach legacy Area link (nếu doc cũ có areaId từ bản seed trước).
        $unset: { areaId: "" },
      },
      { upsert: true }
    );
  }
  console.log("[OK] Warehouses");
}
