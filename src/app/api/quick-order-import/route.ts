/**
 * ==================================================
 * QUICK ORDER IMPORT API
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import
 *
 * API endpoints:
 *   POST /api/quick-order-import/parse  - Parse pasted text
 *   POST /api/quick-order-import/validate - Validate rows with context
 *   POST /api/quick-order-import/import  - Create orders
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { parseQuickOrder } from "@/utils/import/quickOrderParser";
import {
  loadQuickOrderImportContext,
  validateQuickOrderRow,
  toEditableRow,
  getComboCandidatesForProduct,
} from "@/services/import/quickOrderImportValidation.service";
import {
  simulateQuickOrderImport,
  importQuickOrders,
} from "@/services/import/quickOrderImport.service";
import type { EditableQuickOrderRow } from "@/types/quickOrder";

// ==================================================
// Helper
// ==================================================

async function getEmployeeId(request: NextRequest): Promise<string | null> {
  try {
    const currentUser = await getCurrentUser(request);
    return currentUser.employee._id.toString();
  } catch {
    return null;
  }
}

// ==================================================
// POST /api/quick-order-import
// ==================================================

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const employeeId = await getEmployeeId(request);
    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, text, rows, context: contextOptions } = body;

    // Load context for validation
    const context = await loadQuickOrderImportContext(contextOptions);

    // Handle different actions
    switch (action) {
      case "parse": {
        // Parse pasted text
        const { rows: parsedRows, totalRows } = parseQuickOrder(text || "");

        console.log("[QUICK IMPORT API] Raw text:", text?.substring(0, 200));
        console.log("[QUICK IMPORT API] Parsed rows:", JSON.stringify(parsedRows, null, 2));

        // Validate each row
        const validatedRows = parsedRows.map((row) =>
          validateQuickOrderRow(row, context)
        );

        console.log("[QUICK IMPORT API] Validated rows:", JSON.stringify(validatedRows, null, 2));

        // Convert to editable rows
        const editableRows = validatedRows.map((row) => {
          const editable = toEditableRow(row);

          // Get combo candidates if we have a product
          if (row.productId) {
            editable.comboCandidates = getComboCandidatesForProduct(
              row.productId,
              context
            );
          }

          return editable;
        });

        console.log("[QUICK IMPORT API] Editable rows:", JSON.stringify(editableRows.map(r => ({
          rowNumber: r.rowNumber,
          customerName: r.customerName,
          phone: r.phone,
          editablePhone: r.editablePhone,
          address: r.address,
          productText: r.productText,
          productId: r.productId,
          comboText: r.comboText,
          priceText: r.priceText,
          editablePrice: r.editablePrice,
        })), null, 2));

        // Calculate stats
        const validCount = editableRows.filter((r) => r.status === "VALID").length;
        const invalidCount = editableRows.filter(
          (r) => r.status === "INVALID"
        ).length;
        const warningCount = editableRows.reduce(
          (sum, r) => sum + r.errors.filter((e) => e.severity === "WARNING").length,
          0
        );

        return NextResponse.json({
          success: true,
          data: {
            rows: editableRows,
            totalRows,
            validCount,
            invalidCount,
            warningCount,
            exchangeRate: context.exchangeRate,
            exchangeRateDate: context.exchangeRateDate,
          },
        });
      }

      case "validate": {
        // Validate/update specific rows
        const editableRows = (rows || []) as EditableQuickOrderRow[];

        // Re-validate each row
        const validatedRows = editableRows.map((row) =>
          validateQuickOrderRow(
            {
              rowNumber: row.rowNumber,
              timestamp: row.timestamp,
              customerName: row.editableCustomerName || row.customerName,
              phone: row.editablePhone || row.phone,
              address: row.editableAddress || row.address,
              comboText: row.comboText,
              productText: row.productText,
              priceText: String(row.editablePrice || row.priceText),
              raw: row.raw || [],
            },
            context
          )
        );

        // Calculate stats
        const validCount = validatedRows.filter((r) => r.status === "VALID").length;
        const invalidCount = validatedRows.filter(
          (r) => r.status === "INVALID"
        ).length;

        return NextResponse.json({
          success: true,
          data: {
            rows: validatedRows,
            validCount,
            invalidCount,
          },
        });
      }

      case "simulate": {
        // Simulate import
        const simulation = simulateQuickOrderImport((rows || []) as EditableQuickOrderRow[]);

        return NextResponse.json({
          success: true,
          data: simulation,
        });
      }

      case "import": {
        // Actual import
        const result = await importQuickOrders(
          (rows || []) as EditableQuickOrderRow[],
          context,
          employeeId
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: parse, validate, simulate, import" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Quick Order Import API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
