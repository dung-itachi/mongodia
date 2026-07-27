import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Supplier from "@/models/Supplier";
import Area from "@/models/Area";

import {
  mapSupplier,
  mapSupplierList,
} from "@/mappers/supplier.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createSupplierSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "supplier.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem nhà cung cấp",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const areaId = searchParams.get("areaId") ?? "";
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (areaId) {
      filter.areaId = areaId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Supplier.find(filter)
        .populate("areaId", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapSupplierList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Supplier List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách nhà cung cấp",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "supplier.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo nhà cung cấp",
        403
      );
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu không hợp lệ",
        400
      );
    }

    const parsedBody =
      createSupplierSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Supplier.exists({
      code: data.code.toUpperCase(),
    });

    if (existedCode) {
      return errorResponse(
        "Mã nhà cung cấp đã tồn tại",
        400
      );
    }

    const existedPhone = await Supplier.exists({
      phone: data.phone,
    });

    if (existedPhone) {
      return errorResponse(
        "Số điện thoại đã tồn tại",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(data.areaId)) {
      return errorResponse(
        "ID khu vực không hợp lệ",
        400
      );
    }

    const existedArea = await Area.exists({
      _id: data.areaId,
    });

    if (!existedArea) {
      return errorResponse(
        "Khu vực không tồn tại",
        400
      );
    }

    const supplier = await Supplier.create({
      code: data.code.toUpperCase(),
      name: data.name,
      phone: data.phone,
      email: data.email ?? "",
      contactPerson: data.contactPerson ?? "",
      address: data.address ?? "",
      areaId: data.areaId,
      note: data.note ?? "",
    });

    const populatedSupplier = await Supplier.findById(
      supplier._id
    )
      .populate("areaId", "_id code name")
      .lean();

    return success(
      mapSupplier(populatedSupplier!),
      "Tạo nhà cung cấp thành công"
    );
  } catch (error) {
    console.error("Create Supplier Error:", error);

    return errorResponse(
      "Không thể tạo nhà cung cấp",
      500
    );
  }
}
