import Counter from "@/models/Counter";
import Employee from "@/models/Employee";

export async function generateEmployeeCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      {
        key: "EMPLOYEE",
      },
      {
        $inc: {
          seq: 1,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    const code = `EMP${counter.seq.toString().padStart(6, "0")}`;

    // Kiểm tra xem mã này đã tồn tại chưa (phòng trường hợp counter bị reset)
    const exists = await Employee.exists({ employeeCode: code });
    if (!exists) {
      return code;
    }
  }

  throw new Error("Không thể tạo mã nhân viên duy nhất");
}