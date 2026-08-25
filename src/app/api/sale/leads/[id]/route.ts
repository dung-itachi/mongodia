/**
 * API Route: Update Sale Lead (PATCH)
 *
 * PATCH /api/sale/leads/:id
 *
 * Allows Sale/Admin to update lead information including:
 * - Customer info (name, phone, address)
 * - Product & Combo selection
 * - Variant details
 * - Pricing
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { Lead } from "@/models";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadHistory } from "@/models/LeadHistory";
import { LeadAction } from "@/constants/leadAction";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền cập nhật lead", 403);
    }

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const {
      customerName,
      phone,
      address,
      note,
      productId,
      comboId,
      comboQuantity,
      unitPriceMNT,
      exchangeRate,
      variantDetails,
      giftMode,
      giftSelections,
      status,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (customerName !== undefined) updateData.customerName = customerName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (note !== undefined) updateData.note = note;
    if (productId !== undefined) updateData.productId = productId;
    if (comboId !== undefined) updateData.comboId = comboId;
    if (comboQuantity !== undefined) updateData.quantity = comboQuantity;
    if (unitPriceMNT !== undefined) updateData.unitPriceMNT = unitPriceMNT;
    if (exchangeRate !== undefined) updateData.exchangeRate = exchangeRate;
    if (variantDetails !== undefined) {
      updateData.variantDetails = Array.isArray(variantDetails)
        ? variantDetails.map((vd: { quantity?: number; attributes?: Array<Record<string, unknown>>; variantId?: string }) => ({
            quantity: typeof vd.quantity === "number" ? vd.quantity : 0,
            attributes: Array.isArray(vd.attributes)
              ? vd.attributes.map((a) => ({
                  optionId: a.optionId?.toString() ?? "",
                  valueId: a.valueId?.toString() ?? "",
                  optionName: typeof a.optionName === "string" ? a.optionName : undefined,
                  valueName: typeof a.valueName === "string" ? a.valueName : undefined,
                }))
              : [],
            variantId: vd.variantId ?? undefined,
          }))
        : variantDetails;
    }
    if (giftMode !== undefined) updateData.giftMode = giftMode;
    if (giftSelections !== undefined) {
      updateData.giftSelections = Array.isArray(giftSelections)
        ? giftSelections.map((g: { giftProductId?: string; giftProductName?: string; quantity?: number }) => ({
            giftProductId: g.giftProductId?.toString() ?? "",
            giftProductName: typeof g.giftProductName === "string" ? g.giftProductName : undefined,
            quantity: typeof g.quantity === "number" ? g.quantity : 0,
          }))
        : giftSelections;
    }

    // Validate and capture status change so we can write a LeadHistory entry
    let statusChangedFrom: string | undefined;
    let statusChangedTo: string | undefined;
    if (status !== undefined) {
      if (!Object.values(LeadStatus).includes(status as LeadStatus)) {
        return errorResponse(`Trạng thái không hợp lệ: ${status}`, 400);
      }
      const currentLead = await Lead.findById(id).select("status isConverted").lean();
      if (!currentLead) {
        return errorResponse("Không tìm thấy lead", 404);
      }
      if (currentLead.isConverted) {
        return errorResponse("Lead đã được chốt đơn, không thể cập nhật trạng thái", 400);
      }
      if (currentLead.status !== status) {
        statusChangedFrom = currentLead.status;
        statusChangedTo = status as string;
        updateData.status = status;
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: "after" }
    )
      .populate("productId", "_id code name")
      .populate("comboId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .populate("facebookPageId", "_id code name")
      .lean();

    if (!updatedLead) {
      return errorResponse("Không tìm thấy lead", 404);
    }

    // Write timeline entry when status was changed through this endpoint
    if (statusChangedFrom && statusChangedTo) {
      try {
        await LeadHistory.create({
          leadId: updatedLead._id.toString(),
          employeeId: (currentUser.employee as { _id?: { toString(): string } } | null)?._id?.toString(),
          action: LeadAction.STATUS_CHANGED,
          oldValue: statusChangedFrom,
          newValue: statusChangedTo,
          note: `Sửa lead: cập nhật trạng thái ${statusChangedFrom} → ${statusChangedTo}`,
        });
      } catch (historyError) {
        console.error("Failed to write LeadHistory for status update:", historyError);
      }
    }

    // Transform response to match frontend types
    const response = {
      _id: updatedLead._id.toString(),
      leadCode: updatedLead.leadCode,
      customerName: updatedLead.customerName,
      phone: updatedLead.phone,
      address: updatedLead.address,
      note: updatedLead.note,
      sourceType: updatedLead.sourceType,
      status: updatedLead.status,
      product: updatedLead.productId && typeof updatedLead.productId === "object"
        ? {
            _id: (updatedLead.productId as { _id: { toString(): string } })._id.toString(),
            code: (updatedLead.productId as { code: string }).code,
            name: (updatedLead.productId as { name: string }).name,
          }
        : undefined,
      combo: updatedLead.comboId && typeof updatedLead.comboId === "object"
        ? {
            _id: (updatedLead.comboId as { _id: { toString(): string } })._id.toString(),
            code: (updatedLead.comboId as { code: string }).code,
            name: (updatedLead.comboId as { name: string }).name,
          }
        : undefined,
      quantity: updatedLead.quantity,
      unitPriceMNT: updatedLead.unitPriceMNT,
      exchangeRate: updatedLead.exchangeRate,
      variantDetails: updatedLead.variantDetails,
      giftMode: updatedLead.giftMode,
      giftSelections: updatedLead.giftSelections,
      marketingEmployeeId: updatedLead.marketingEmployeeId,
      saleEmployeeId: updatedLead.saleEmployeeId,
      assignedAt: updatedLead.assignedAt,
      isConverted: updatedLead.isConverted,
      facebookPage: updatedLead.facebookPageId && typeof updatedLead.facebookPageId === "object"
        ? {
            _id: (updatedLead.facebookPageId as { _id: { toString(): string } })._id.toString(),
            code: (updatedLead.facebookPageId as { code: string }).code,
            name: (updatedLead.facebookPageId as { name: string }).name,
          }
        : undefined,
      createdAt: updatedLead.createdAt,
      updatedAt: updatedLead.updatedAt,
    };

    return success(response);
  } catch (err) {
    console.error("Update Sale Lead Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi cập nhật lead",
      500
    );
  }
}
