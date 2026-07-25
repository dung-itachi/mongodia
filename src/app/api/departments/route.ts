import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { createDepartmentSchema } from "@/utils/validator";
import { mapDepartment } from "@/mappers/department.mapper";
import Department from "@/models/Department";

import {
    mapDepartmentList,
} from "@/mappers/department.mapper";

import {
    error as errorResponse,
    success,
} from "@/utils/response";

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser(request);

        if (
            !currentUser.permissions.includes(
                "department.view"
            )
        ) {
            return errorResponse(
                "Bạn không có quyền xem phòng ban",
                403
            );
        }

        await connectDB();

        const departments = await Department.find({
            isActive: true,
        })
            .sort({
                code: 1,
            })
            .lean();

        return success({
            items: departments.map(mapDepartmentList),
            total: departments.length,
        });

    } catch (error) {
        console.error(
            "Department List Error:",
            error
        );

        return errorResponse(
            "Không thể lấy danh sách phòng ban",
            500
        );
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("department.create")) {
            return errorResponse(
                "Bạn không có quyền tạo phòng ban",
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

        const parsedBody = createDepartmentSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;

        const existedCode = await Department.exists({
            code: data.code.toUpperCase(),
        });

        if (existedCode) {
            return errorResponse(
                "Mã phòng ban đã tồn tại",
                400
            );
        }

        const existedName = await Department.exists({
            name: data.name,
        });

        if (existedName) {
            return errorResponse(
                "Tên phòng ban đã tồn tại",
                400
            );
        }

        const department = await Department.create({
            code: data.code.toUpperCase(),
            name: data.name,
        });

        return success(
            mapDepartment(department),
            "Tạo phòng ban thành công"
        );

    } catch (error) {
        console.error("Create Department Error:", error);

        return errorResponse(
            "Không thể tạo phòng ban",
            500
        );
    }
}