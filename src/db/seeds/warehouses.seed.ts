import Area from "@/models/Area";
import Warehouse from "@/models/Warehouse";

const WAREHOUSES = [
  { code: "KHO1", name: "Kho 1" },
  { code: "KHO2", name: "Kho 2" },
];

export async function seedWarehouses() {
  const area = await Area.findOne({ isActive: true }).sort({ code: 1 });
  if (!area) throw new Error("Cần seed Area trước khi seed Warehouse");
  for (const warehouse of WAREHOUSES) {
    await Warehouse.updateOne(
      { code: warehouse.code },
      { $setOnInsert: { code: warehouse.code, name: warehouse.name, areaId: area._id, isActive: true } },
      { upsert: true }
    );
  }
  console.log("[OK] Warehouses");
}
