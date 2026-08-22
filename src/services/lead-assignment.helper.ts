/**
 * Lead Assignment Helper (Sprint 8.x — Auto-assign Sale)
 *
 * Khi Lead.assignmentMode = AUTO, mỗi Lead mới tạo sẽ được tự động gán cho
 * một Sale active bằng một trong hai chiến lược:
 *
 *   1) Chỉ có DUY NHẤT 1 Sale active → gán thẳng cho người đó
 *      (đây là case phổ biến của khách hàng mới triển khai — chỉ có 1 tài khoản Sale).
 *
 *   2) Nhiều Sale active → round-robin "ai rảnh nhất":
 *      đếm số Lead đang active (isActive=true, saleEmployeeId=<sale>) của từng Sale,
 *      pick Sale có số lead hiện tại ít nhất. Nếu hoà → pick theo thứ tự _id để
 *      deterministic, không bị random mỗi lần.
 *
 * Logic này được gọi ở API `POST /api/marketing/leads` SAU KHI tạo Lead thành công.
 * Trả về `null` nếu không tìm được Sale nào — caller sẽ bỏ qua auto-assign.
 */

import { Types } from "mongoose";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import { Lead } from "@/models/Lead";

const SALE_ROLE_CODE = "SALE" as const;

/**
 * @returns ObjectId string của Sale được chọn, hoặc `null` nếu:
 *   - Không có Role nào code = "SALE"
 *   - Không có Employee nào có roleId = SALE và isActive = true
 */
export async function pickNextSaleForLead(): Promise<string | null> {
  // 1) Tìm role SALE
  const saleRole = await Role.findOne({ code: SALE_ROLE_CODE }).select("_id").lean();
  if (!saleRole) {
    return null;
  }

  // 2) Lấy tất cả Sale đang active
  const saleEmployees = await Employee.find({
    roleId: saleRole._id,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (saleEmployees.length === 0) {
    return null;
  }

  // CASE 1: chỉ có 1 Sale active → gán thẳng
  if (saleEmployees.length === 1) {
    return (saleEmployees[0]._id as Types.ObjectId).toString();
  }

  // CASE 2: nhiều Sale → pick theo số lead hiện tại (round-robin)
  const saleIds = saleEmployees.map((e) => e._id as Types.ObjectId);

  const counts = await Lead.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        isActive: true,
        saleEmployeeId: { $in: saleIds },
      },
    },
    {
      $group: {
        _id: "$saleEmployeeId",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  for (const item of counts) {
    countMap.set(item._id.toString(), item.count);
  }

  // Sale nào chưa có lead nào → count = 0 (ưu tiên nhất)
  const candidates = saleEmployees
    .map((e) => ({
      id: (e._id as Types.ObjectId).toString(),
      count: countMap.get((e._id as Types.ObjectId).toString()) ?? 0,
    }))
    .sort((a, b) => {
      // 1) Ưu tiên count nhỏ hơn
      if (a.count !== b.count) return a.count - b.count;
      // 2) Tie-break theo _id để deterministic
      return a.id.localeCompare(b.id);
    });

  return candidates[0]?.id ?? null;
}
