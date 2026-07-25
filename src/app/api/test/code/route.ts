import { connectDB } from "@/lib/mongodb";
import { generateEmployeeCode } from "@/lib/generateEmployeeCode";
import { success } from "@/utils/response";

export async function GET() {
  await connectDB();

  const code = await generateEmployeeCode();

  return success({
    code,
  });
}