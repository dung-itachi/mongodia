import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Counter from "@/models/Counter";
import { success } from "@/utils/response";

export async function POST() {
  await connectDB();

  // Tìm mã employee lớn nhất hiện có
  const lastEmployee = await Employee.findOne({ employeeCode: { $regex: /^EMP/ } })
    .sort({ employeeCode: -1 })
    .select("employeeCode")
    .lean();

  let maxSeq = 0;
  if (lastEmployee?.employeeCode) {
    const match = lastEmployee.employeeCode.match(/^EMP(\d+)$/);
    if (match) {
      maxSeq = parseInt(match[1], 10);
    }
  }

  // Cập nhật counter với giá trị max hiện tại
  await Counter.findOneAndUpdate(
    { key: "EMPLOYEE" },
    { $max: { seq: maxSeq } },
    { upsert: true }
  );

  return success({
    message: `Đã đồng bộ counter với maxSeq: ${maxSeq}`,
    maxSeq,
  });
}
