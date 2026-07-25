import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Area from "@/models/Area";
import { createAreaSchema } from "@/utils/validator";
import { mapArea, mapAreaList } from "@/mappers/area.mapper";

import {
  error as errorResponse,
  success,
} from "@/utils/response";

export async function GET(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("area.view")) {
        return errorResponse(
          "Bạn không có quyền xem khu vực",
          403
        );
      }
  
      await connectDB();
  
      const areas = await Area.find({
        isActive: true,
      })
        .sort({
          code: 1,
        })
        .lean();
  
      return success({
        items: areas.map(mapAreaList),
        total: areas.length,
      });
  
    } catch (error) {
      console.error("Area List Error:", error);
  
      return errorResponse(
        "Không thể lấy danh sách khu vực",
        500
      );
    }
  }

  export async function POST(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("area.create")) {
        return errorResponse(
          "Bạn không có quyền tạo khu vực",
          403
        );
      }
  
      await connectDB();
  
      let body: unknown;
  
      try {
        body = await request.json();
      } catch {
        return errorResponse("Dữ liệu không hợp lệ", 400);
      }
  
      const parsedBody = createAreaSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const existedCode = await Area.exists({
        code: data.code.toUpperCase(),
      });
  
      if (existedCode) {
        return errorResponse(
          "Mã khu vực đã tồn tại",
          400
        );
      }
  
      const existedName = await Area.exists({
        name: data.name,
      });
  
      if (existedName) {
        return errorResponse(
          "Tên khu vực đã tồn tại",
          400
        );
      }
  
      const area = await Area.create({
        code: data.code.toUpperCase(),
        name: data.name,
        address: data.address ?? "",
        countryCode: data.countryCode.toUpperCase(),
      });
  
      return success(
        mapArea(area),
        "Tạo khu vực thành công"
      );
  
    } catch (error) {
      console.error("Create Area Error:", error);
  
      return errorResponse(
        "Không thể tạo khu vực",
        500
      );
    }
  }