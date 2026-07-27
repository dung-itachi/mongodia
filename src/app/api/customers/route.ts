import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Customer from "@/models/Customer";
import Area from "@/models/Area";
import Team from "@/models/Team";
import Employee from "@/models/Employee";

import {
  mapCustomer,
  mapCustomerList,
} from "@/mappers/customer.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createCustomerSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "customer.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem khách hàng",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const teamId = searchParams.get("teamId") ?? "";
    const employeeId = searchParams.get("employeeId") ?? "";
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

    if (teamId) {
      filter.teamId = teamId;
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (areaId) {
      filter.areaId = areaId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Customer.find(filter)
        .populate("teamId", "_id code name")
        .populate("employeeId", "_id employeeCode fullName")
        .populate("areaId", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapCustomerList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Customer List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách khách hàng",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "customer.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo khách hàng",
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
      createCustomerSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Customer.exists({
      code: data.code.toUpperCase(),
    });

    if (existedCode) {
      return errorResponse(
        "Mã khách hàng đã tồn tại",
        400
      );
    }

    const existedPhone = await Customer.exists({
      phone: data.phone,
    });

    if (existedPhone) {
      return errorResponse(
        "Số điện thoại đã tồn tại",
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

    const existedTeam = await Team.exists({
      _id: data.teamId,
    });

    if (!existedTeam) {
      return errorResponse(
        "Nhóm không tồn tại",
        400
      );
    }

    const existedEmployee = await Employee.exists({
      _id: data.employeeId,
    });

    if (!existedEmployee) {
      return errorResponse(
        "Nhân viên không tồn tại",
        400
      );
    }

    const customer = await Customer.create({
      code: data.code.toUpperCase(),
      name: data.name,
      phone: data.phone,
      email: data.email ?? "",
      gender: data.gender,
      birthday: data.birthday
        ? new Date(data.birthday)
        : null,
      address: data.address ?? "",
      areaId: data.areaId,
      teamId: data.teamId,
      employeeId: data.employeeId,
      note: data.note ?? "",
    });

    const populatedCustomer = await Customer.findById(
      customer._id
    )
      .populate("teamId", "_id code name")
      .populate("employeeId", "_id employeeCode name")
      .populate("areaId", "_id code name")
      .lean();

    return success(
      mapCustomer(populatedCustomer!),
      "Tạo khách hàng thành công"
    );
  } catch (error) {
    console.error("Create Customer Error:", error);

    return errorResponse(
      "Không thể tạo khách hàng",
      500
    );
  }
}
