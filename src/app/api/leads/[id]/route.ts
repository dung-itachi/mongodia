import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import { LeadAction } from "@/constants/leadAction";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";
import Product from "@/models/Product";
import Combo from "@/models/Combo";
import Employee from "@/models/Employee";

import { mapLead, mapLeadList } from "@/mappers/lead.mapper";

import { success, error as errorResponse } from "@/utils/response";
import { updateLeadSchema } from "@/utils/validator";

const REVENUE_FIELDS = [
  "productId",
  "comboId",
  "quantity",
  "unitPriceMNT",
  "unitPriceVND",
  "exchangeRate",
  "marketingEmployeeId",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem lead", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const lead = await Lead.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("facebookPageId", "_id pageId pageName")
      .populate("facebookPageAssignment.employee", "_id employeeCode name")
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .populate("categoryId", "_id code name")
      .populate("productId", "_id code name")
      .populate("comboId", "_id code name")
      .lean();

    if (!lead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    return success(mapLead(lead));
  } catch (error) {
    console.error("Lead Detail Error:", error);
    return errorResponse("Không thể lấy lead", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.update")) {
      return errorResponse("Bạn không có quyền cập nhật lead", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const existedLead = await Lead.findById(id);

    if (!existedLead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = updateLeadSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // Business Rule 1: Không cho sửa Lead đã tạo Order
    if (existedLead.status === LeadStatus.ORDER_CREATED) {
      const revenueFieldsSent = REVENUE_FIELDS.filter((field) => {
        const value = (data as Record<string, unknown>)[field];
        return value !== undefined && value !== null;
      });

      if (revenueFieldsSent.length > 0) {
        return errorResponse(
          "Lead đã tạo Order, không thể sửa các thông tin ảnh hưởng doanh thu.",
          409
        );
      }
    }

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

    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{
      leadId: mongoose.Types.ObjectId;
      employeeId: mongoose.Types.ObjectId;
      action: LeadAction;
      oldValue?: string;
      newValue?: string;
    }> = [];

    // customerName
    if (data.customerName !== undefined) {
      updateData.customerName = data.customerName;
    }

    // customerNewName
    if (data.customerNewName !== undefined) {
      updateData.customerNewName = data.customerNewName || undefined;
    }

    // facebookLink
    if (data.facebookLink !== undefined) {
      updateData.facebookLink = data.facebookLink || undefined;
    }

    // phone
    if (data.phone !== undefined) {
      updateData.phone = data.phone || undefined;
    }

    // phone2
    if (data.phone2 !== undefined) {
      updateData.phone2 = data.phone2 || undefined;
    }

    // address
    if (data.address !== undefined) {
      updateData.address = data.address || undefined;
    }

    // sourceType
    if (data.sourceType !== undefined) {
      updateData.sourceType = data.sourceType;
    }

    // facebookPageId
    if (data.facebookPageId !== undefined) {
      updateData.facebookPageId = data.facebookPageId || undefined;
    }

    // facebookPageAssignmentId
    if (data.facebookPageAssignmentId !== undefined) {
      updateData.facebookPageAssignmentId = data.facebookPageAssignmentId || undefined;
    }

    // marketingEmployeeId (và tạo history nếu thay đổi)
    if (data.marketingEmployeeId !== undefined) {
      const oldValue = existedLead.marketingEmployeeId?.toString();
      const newValue = data.marketingEmployeeId || undefined;

      if (oldValue !== newValue) {
        historyEntries.push({
          leadId: existedLead._id as mongoose.Types.ObjectId,
          employeeId: currentUser.employee._id as mongoose.Types.ObjectId,
          action: LeadAction.MARKETING_CHANGED,
          oldValue: oldValue || undefined,
          newValue,
        });
      }

      updateData.marketingEmployeeId = data.marketingEmployeeId || undefined;
    }

    // saleEmployeeId (và tạo history nếu thay đổi)
    // Business Rule 2: assignedAt chỉ set khi Sale từ null -> có giá trị
    if (data.saleEmployeeId !== undefined) {
      const oldSaleId = existedLead.saleEmployeeId?.toString();
      const newSaleId = data.saleEmployeeId || undefined;

      if (oldSaleId !== newSaleId) {
        // Tạo history SALE_CHANGED
        historyEntries.push({
          leadId: existedLead._id as mongoose.Types.ObjectId,
          employeeId: currentUser.employee._id as mongoose.Types.ObjectId,
          action: LeadAction.SALE_CHANGED,
          oldValue: oldSaleId || undefined,
          newValue: newSaleId,
        });

        // assignedAt chỉ set khi Sale từ null -> có giá trị
        if (!oldSaleId && newSaleId) {
          updateData.assignedAt = new Date();
        }
      }

      updateData.saleEmployeeId = data.saleEmployeeId || undefined;
    }

    // categoryId
    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId || undefined;
    }

    // productId
    if (data.productId !== undefined) {
      updateData.productId = data.productId || undefined;
    }

    // comboId
    if (data.comboId !== undefined) {
      updateData.comboId = data.comboId || undefined;
    }

    // quantity
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }

    // unitPriceMNT
    if (data.unitPriceMNT !== undefined) {
      updateData.unitPriceMNT = data.unitPriceMNT;
    }

    // unitPriceMNT (Sprint Settings — chỉ giữ MNT)
    if (data.unitPriceMNT !== undefined) {
      updateData.unitPriceMNT = data.unitPriceMNT;
    }

    // exchangeRate
    if (data.exchangeRate !== undefined) {
      updateData.exchangeRate = data.exchangeRate;
    }

    // estimatedWeight
    if (data.estimatedWeight !== undefined) {
      updateData.estimatedWeight = data.estimatedWeight;
    }

    // status (và tạo history nếu thay đổi)
    if (data.status !== undefined) {
      if (existedLead.status !== data.status) {
        historyEntries.push({
          leadId: existedLead._id as mongoose.Types.ObjectId,
          employeeId: currentUser.employee._id as mongoose.Types.ObjectId,
          action: LeadAction.STATUS_CHANGED,
          oldValue: LEAD_STATUS_LABELS[existedLead.status as LeadStatus],
          newValue: LEAD_STATUS_LABELS[data.status as LeadStatus],
        });
      }
      updateData.status = data.status;
    }

    // note
    if (data.note !== undefined) {
      updateData.note = data.note || undefined;
    }

    // isDuplicate
    if (data.isDuplicate !== undefined) {
      updateData.isDuplicate = data.isDuplicate;
    }

    // isActive
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // latestRemark (và tạo history nếu thay đổi)
    if (data.latestRemark !== undefined && existedLead.latestRemark !== data.latestRemark) {
      historyEntries.push({
        leadId: existedLead._id as mongoose.Types.ObjectId,
        employeeId: currentUser.employee._id as mongoose.Types.ObjectId,
        action: LeadAction.NOTE_UPDATED,
        oldValue: existedLead.latestRemark || undefined,
        newValue: data.latestRemark || undefined,
      });
      updateData.latestRemark = data.latestRemark || "";
    }

    session.startTransaction();

    if (Object.keys(updateData).length > 0) {
      await Lead.updateOne({ _id: id }, { $set: updateData }, { session });
    }

    // Tạo tất cả LeadHistory với employeeId
    if (historyEntries.length > 0) {
      await LeadHistory.insertMany(historyEntries, { session });
    }

    await session.commitTransaction();

    const updatedLead = await Lead.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("facebookPageId", "_id pageId pageName")
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .populate("categoryId", "_id code name")
      .populate("productId", "_id code name")
      .populate("comboId", "_id code name")
      .lean();

    return success(mapLeadList([updatedLead!])[0], "Cập nhật lead thành công");
  } catch (error) {
    await session.abortTransaction();
    console.error("Update Lead Error:", error);
    return errorResponse("Không thể cập nhật lead", 500);
  } finally {
    session.endSession();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.delete")) {
      return errorResponse("Bạn không có quyền xóa lead", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const existedLead = await Lead.findById(id);

    if (!existedLead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    // Business Rule 5: Không cho Delete Lead đã tạo Order
    if (existedLead.status === LeadStatus.ORDER_CREATED) {
      return errorResponse("Lead đã tạo Order.", 409);
    }

    session.startTransaction();

    await Lead.updateOne(
      { _id: id },
      { $set: { isActive: false } },
      { session }
    );

    await LeadHistory.create(
      [
        {
          leadId: existedLead._id,
          employeeId: currentUser.employee._id,
          action: LeadAction.DELETED,
          note: "Xóa lead (soft delete)",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return success(null, "Xóa lead thành công");
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete Lead Error:", error);
    return errorResponse("Không thể xóa lead", 500);
  } finally {
    session.endSession();
  }
}
