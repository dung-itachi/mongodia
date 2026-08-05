/**
 * ==================================================
 * MARKETING EXPENSE HISTORY REPOSITORY
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Timeline
 *
 * Data access layer cho MarketingExpenseHistory.
 */

import { MarketingExpenseHistory } from "@/models/MarketingExpenseHistory";
import type { IMarketingExpenseHistory } from "@/models/MarketingExpenseHistory";
import Employee from "@/models/Employee";

/**
 * Timeline item với populated employee info
 */
export interface MarketingExpenseHistoryItem {
  _id: string;
  reportId: string;
  employeeId: string;
  action: string;
  note?: string;
  createdAt: string;
  employee: {
    _id: string;
    employeeCode: string;
    fullName: string;
  } | null;
}

export interface MarketingExpenseHistoryRepository {
  findByReportIdWithPopulate(reportId: string): Promise<MarketingExpenseHistoryItem[]>;
}

interface EmployeeLean {
  _id: { toString(): string };
  employeeCode: string;
  fullName: string;
}

/**
 * Find timeline by reportId với employee population
 */
async function findByReportIdWithPopulate(
  reportId: string
): Promise<MarketingExpenseHistoryItem[]> {
  const docs = await MarketingExpenseHistory.find({ reportId })
    .sort({ createdAt: -1 })
    .lean();

  // Get unique employee IDs
  const employeeIds = [...new Set(docs.map((d) => d.employeeId.toString()))];

  // Fetch employees in batch
  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .select("_id employeeCode fullName")
    .lean() as EmployeeLean[];

  const employeeMap = new Map<string, EmployeeLean>(
    employees.map((e) => [e._id.toString(), e])
  );

  return docs.map((doc: IMarketingExpenseHistory) => {
    const emp = employeeMap.get(doc.employeeId.toString());
    return {
      _id: doc._id.toString(),
      reportId: doc.reportId.toString(),
      employeeId: doc.employeeId.toString(),
      action: doc.action,
      note: doc.note,
      createdAt: doc.createdAt.toISOString(),
      employee: emp
        ? {
            _id: emp._id.toString(),
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
          }
        : null,
    };
  });
}

export const marketingExpenseHistoryRepository: MarketingExpenseHistoryRepository = {
  findByReportIdWithPopulate,
};
