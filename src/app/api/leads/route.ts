import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadAction } from "@/constants/leadAction";
import Product from "@/models/Product";
import Combo from "@/models/Combo";
import Employee from "@/models/Employee";
import Customer from "@/models/Customer";
import Counter from "@/models/Counter";

import { mapLeadList } from "@/mappers/lead.mapper";

import { success, error as errorResponse } from "@/utils/response";
import { createLeadSchema } from "@/utils/validator";

async function generateLeadCode(session?: mongoose.ClientSession): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const counter = await Counter.findByIdAndUpdate(
    `lead_${year}${month}${day}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const sequence = (counter.seq || 1).toString().padStart(4, "0");
  return `LD${year}${month}${day}${sequence}`;
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem lead", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const keyword = searchParams.get("keyword") ?? "";
    const status = searchParams.get("status") ?? "";
    const marketingEmployeeId = searchParams.get("marketingEmployeeId") ?? "";
    const saleEmployeeId = searchParams.get("saleEmployeeId") ?? "";
    const facebookPageId = searchParams.get("facebookPageId") ?? "";
    const sourceType = searchParams.get("sourceType") ?? "";
    const isDuplicate = searchParams.get("isDuplicate");
    const isActive = searchParams.get("isActive");
    const createdFrom = searchParams.get("createdFrom") ?? "";
    const createdTo = searchParams.get("createdTo") ?? "";

    const filter: Record<string, unknown> = {};

    if (keyword) {
      filter.$or = [
        { leadCode: { $regex: keyword, $options: "i" } },
        { customerName: { $regex: keyword, $options: "i" } },
        { customerNewName: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
        { phone2: { $regex: keyword, $options: "i" } },
        { facebookLink: { $regex: keyword, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (marketingEmployeeId) {
      filter.marketingEmployeeId = marketingEmployeeId;
    }

    if (saleEmployeeId) {
      filter.saleEmployeeId = saleEmployeeId;
    }

    if (facebookPageId) {
      filter.facebookPageId = facebookPageId;
    }

    if (sourceType) {
      filter.sourceType = sourceType;
    }

    if (isDuplicate !== null && isDuplicate !== "") {
      filter.isDuplicate = isDuplicate === "true";
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(createdFrom);
      }
      if (createdTo) {
        const endDate = new Date(createdTo);
        endDate.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("customer", "_id code name phone")
        .populate("facebookPage", "_id pageId pageName")
        .populate("marketingEmployee", "_id employeeCode name")
        .populate("saleEmployee", "_id employeeCode name")
        .populate("category", "_id code name")
        .populate("product", "_id code name")
        .populate("combo", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return success({
      items: mapLeadList(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Lead List Error:", error);
    return errorResponse("Không thể lấy danh sách lead", 500);
  }
}

export async function POST(request: Request) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.create")) {
      return errorResponse("Bạn không có quyền tạo lead", 403);
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = createLeadSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    if (data.productId) {
      const existsProduct = await Product.exists({ _id: data.productId });
      if (!existsProduct) {
        return errorResponse("Sản phẩm không tồn tại", 400);
      }
    }

    if (data.comboId) {
      const existsCombo = await Combo.exists({ _id: data.comboId });
      if (!existsCombo) {
        return errorResponse("Combo không tồn tại", 400);
      }
    }

    if (data.marketingEmployeeId) {
      const existsMarketing = await Employee.exists({ _id: data.marketingEmployeeId });
      if (!existsMarketing) {
        return errorResponse("Nhân viên marketing không tồn tại", 400);
      }
    }

    if (data.saleEmployeeId) {
      const existsSale = await Employee.exists({ _id: data.saleEmployeeId });
      if (!existsSale) {
        return errorResponse("Nhân viên sale không tồn tại", 400);
      }
    }

    if (data.customerId) {
      const existsCustomer = await Customer.exists({ _id: data.customerId });
      if (!existsCustomer) {
        return errorResponse("Khách hàng không tồn tại", 400);
      }
    }

    session.startTransaction();

    const leadCode = await generateLeadCode(session);

    const lead = await Lead.create(
      [
        {
          leadCode,
          customerId: data.customerId || undefined,
          customerName: data.customerName,
          customerNewName: data.customerNewName || undefined,
          facebookLink: data.facebookLink || undefined,
          phone: data.phone || undefined,
          phone2: data.phone2 || undefined,
          address: data.address || undefined,
          province: data.province || undefined,
          district: data.district || undefined,
          ward: data.ward || undefined,
          sourceType: data.sourceType,
          facebookPageId: data.facebookPageId || undefined,
          facebookPageAssignmentId: data.facebookPageAssignmentId || undefined,
          marketingEmployeeId: data.marketingEmployeeId || undefined,
          saleEmployeeId: data.saleEmployeeId || undefined,
          categoryId: data.categoryId || undefined,
          productId: data.productId || undefined,
          comboId: data.comboId || undefined,
          quantity: data.quantity || undefined,
          unitPriceMNT: data.unitPriceMNT || undefined,
          unitPriceVND: data.unitPriceVND || undefined,
          exchangeRate: data.exchangeRate || undefined,
          estimatedWeight: data.estimatedWeight || undefined,
          status: (data.status as LeadStatus) || LeadStatus.NEW,
          latestRemark: "",
          note: data.note || undefined,
          isDuplicate: data.isDuplicate ?? false,
          isActive: true,
          assignedAt: null,
          assignmentType: undefined,
        },
      ],
      { session }
    );

    await LeadHistory.create(
      [
        {
          leadId: lead[0]._id,
          employeeId: currentUser.employee._id,
          action: LeadAction.CREATED,
          note: "Tạo lead mới",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedLead = await Lead.findById(lead[0]._id)
      .populate("customer", "_id code name phone")
      .populate("facebookPage", "_id pageId pageName")
      .populate("marketingEmployee", "_id employeeCode name")
      .populate("saleEmployee", "_id employeeCode name")
      .populate("category", "_id code name")
      .populate("product", "_id code name")
      .populate("combo", "_id code name")
      .lean();

    return success(mapLeadList([populatedLead!])[0], "Tạo lead thành công");
  } catch (error) {
    await session.abortTransaction();
    console.error("Create Lead Error:", error);
    return errorResponse("Không thể tạo lead", 500);
  } finally {
    session.endSession();
  }
}
