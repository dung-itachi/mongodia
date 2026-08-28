/**
 * ==================================================
 * SALES KPI SERVICE
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * Service layer for Sales KPI and Target management.
 */

import mongoose from "mongoose";
import { salesTargetRepository } from "@/repositories/sales-target.repository";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { Lead } from "@/models/Lead";
import { LeadStatus } from "@/constants/leadStatus";
import type {
  CreateSalesTargetInput,
  UpdateSalesTargetInput,
  KPIData,
  KPIEmployeeData,
  KPISummary,
  KPIChartDataPoint,
  KPIChartData,
  KPIRankingItem,
  KPIRankingData,
} from "@/types/sales-kpi";

// ============================================================================
// Helper functions
// ============================================================================

function getStartOfMonth(month: number, year: number): Date {
  return new Date(year, month - 1, 1);
}

function getEndOfMonth(month: number, year: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function calculateAchievement(current: number, target: number): number {
  if (target === 0) return current > 0 ? 100 : 0;
  return Math.round((current / target) * 100 * 100) / 100;
}

// ============================================================================
// Service
// ============================================================================

export class SalesKPIService {
  /**
   * Get KPI data for a specific employee and month.
   */
  async getEmployeeKPI(employeeId: string, month: number, year: number) {
    // Get target
    const target = await salesTargetRepository.findCurrent(employeeId, month, year);

    // Get actual data from MongoDB
    const startOfMonth = getStartOfMonth(month, year);
    const endOfMonth = getEndOfMonth(month, year);

    // Revenue & Orders
    const orderAggregation = await Order.aggregate([
      {
        $match: {
          saleEmployeeId: new mongoose.Types.ObjectId(employeeId),
          status: { $nin: ["CANCELLED"] },
        },
      },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const currentRevenue = orderAggregation[0]?.totalRevenue ?? 0;
    const currentOrders = orderAggregation[0]?.totalOrders ?? 0;

    // Customers (new customers this month)
    const customerAggregation = await Customer.aggregate([
      {
        $match: {
          saleEmployeeId: new mongoose.Types.ObjectId(employeeId),
          isActive: { $ne: false },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
        },
      },
    ]);

    const currentCustomers = customerAggregation[0]?.totalCustomers ?? 0;

    // Closed Leads (converted leads this month)
    const leadAggregation = await Lead.aggregate([
      {
        $match: {
          saleEmployeeId: new mongoose.Types.ObjectId(employeeId),
          status: LeadStatus.ORDER_CREATED,
          updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalClosedLeads: { $sum: 1 },
        },
      },
    ]);

    const currentClosedLeads = leadAggregation[0]?.totalClosedLeads ?? 0;

    // Build KPI data
    const kpiData: KPIData = {
      revenue: {
        target: target?.targetRevenue ?? 0,
        current: currentRevenue,
        achievement: calculateAchievement(currentRevenue, target?.targetRevenue ?? 0),
        remaining: Math.max(0, (target?.targetRevenue ?? 0) - currentRevenue),
      },
      orders: {
        target: target?.targetOrders ?? 0,
        current: currentOrders,
        achievement: calculateAchievement(currentOrders, target?.targetOrders ?? 0),
        remaining: Math.max(0, (target?.targetOrders ?? 0) - currentOrders),
      },
      customers: {
        target: target?.targetCustomers ?? 0,
        current: currentCustomers,
        achievement: calculateAchievement(currentCustomers, target?.targetCustomers ?? 0),
        remaining: Math.max(0, (target?.targetCustomers ?? 0) - currentCustomers),
      },
      closedLeads: {
        target: target?.targetClosedLead ?? 0,
        current: currentClosedLeads,
        achievement: calculateAchievement(currentClosedLeads, target?.targetClosedLead ?? 0),
        remaining: Math.max(0, (target?.targetClosedLead ?? 0) - currentClosedLeads),
      },
    };

    return {
      employeeId,
      employeeCode: "",
      employeeName: "",
      month,
      year,
      kpi: kpiData,
    } as KPIEmployeeData;
  }

  /**
   * Get KPI summary for all employees in a month.
   */
  async getKPISummary(month: number, year: number) {
    const targets = await salesTargetRepository.findByMonth(month, year);

    const employeeKPIs = await Promise.all(
      targets.map(async (target) => {
        const kpiData = await this.getEmployeeKPI(
          target.employeeId as unknown as string,
          month,
          year
        );
        return kpiData;
      })
    );

    // Calculate averages
    const activeKPIs = employeeKPIs.filter((kpi) => kpi.kpi.revenue.target > 0);
    const avgRevenueAchievement =
      activeKPIs.length > 0
        ? activeKPIs.reduce((sum, kpi) => sum + kpi.kpi.revenue.achievement, 0) / activeKPIs.length
        : 0;
    const avgOrderAchievement =
      activeKPIs.length > 0
        ? activeKPIs.reduce((sum, kpi) => sum + kpi.kpi.orders.achievement, 0) / activeKPIs.length
        : 0;
    const avgCustomerAchievement =
      activeKPIs.length > 0
        ? activeKPIs.reduce((sum, kpi) => sum + kpi.kpi.customers.achievement, 0) / activeKPIs.length
        : 0;

    return {
      month,
      year,
      totalTargets: targets.length,
      employees: employeeKPIs,
      averages: {
        revenueAchievement: Math.round(avgRevenueAchievement * 100) / 100,
        orderAchievement: Math.round(avgOrderAchievement * 100) / 100,
        customerAchievement: Math.round(avgCustomerAchievement * 100) / 100,
      },
    } as KPISummary;
  }

  /**
   * Get KPI chart data for a specific period.
   */
  async getKPIChart(employeeId: string, month: number, year: number) {
    const monthStart = getStartOfMonth(month, year);
    const monthEnd = getEndOfMonth(month, year);
    const daysInMonth = monthEnd.getDate();

    // Daily revenue aggregation
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          saleEmployeeId: new mongoose.Types.ObjectId(employeeId),
          status: { $nin: ["CANCELLED"] },
          createdAt: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          actual: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily orders aggregation
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          saleEmployeeId: new mongoose.Types.ObjectId(employeeId),
          createdAt: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          actual: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get target
    const target = await salesTargetRepository.findCurrent(employeeId, month, year);
    const dailyRevenueTarget = (target?.targetRevenue ?? 0) / daysInMonth;
    const dailyOrderTarget = (target?.targetOrders ?? 0) / daysInMonth;

    // Build chart data
    const revenueChart: KPIChartDataPoint[] = [];
    const ordersChart: KPIChartDataPoint[] = [];

    const revenueMap = new Map<number, number>();
    dailyRevenue.forEach((d) => revenueMap.set(d._id, d.actual));

    const ordersMap = new Map<number, number>();
    dailyOrders.forEach((d) => ordersMap.set(d._id, d.actual));

    for (let day = 1; day <= daysInMonth; day++) {
      const actualRevenue = revenueMap.get(day) ?? 0;
      const actualOrders = ordersMap.get(day) ?? 0;

      revenueChart.push({
        label: `Ngày ${day}`,
        target: Math.round(dailyRevenueTarget),
        actual: actualRevenue,
        achievement: dailyRevenueTarget > 0 ? Math.round((actualRevenue / dailyRevenueTarget) * 100) : 0,
      });

      ordersChart.push({
        label: `Ngày ${day}`,
        target: Math.round(dailyOrderTarget * 100) / 100,
        actual: actualOrders,
        achievement: dailyOrderTarget > 0 ? Math.round((actualOrders / dailyOrderTarget) * 100) : 0,
      });
    }

    return {
      revenue: revenueChart,
      orders: ordersChart,
    } as KPIChartData;
  }

  /**
   * Get KPI ranking for all employees.
   */
  async getKPIRanking(month: number, year: number, limit: number = 5) {
    const summary = await this.getKPISummary(month, year);

    // Calculate overall achievement
    const rankings: KPIRankingItem[] = summary.employees.map((kpi, index) => {
      const overallAchievement =
        (kpi.kpi.revenue.achievement +
          kpi.kpi.orders.achievement +
          kpi.kpi.customers.achievement) /
        3;
      return {
        employeeId: kpi.employeeId,
        employeeCode: kpi.employeeCode,
        employeeName: kpi.employeeName,
        revenueAchievement: kpi.kpi.revenue.achievement,
        orderAchievement: kpi.kpi.orders.achievement,
        customerAchievement: kpi.kpi.customers.achievement,
        overallAchievement: Math.round(overallAchievement * 100) / 100,
        rank: index + 1,
      };
    });

    // Sort by overall achievement
    rankings.sort((a, b) => b.overallAchievement - a.overallAchievement);

    // Assign new ranks
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    return {
      topPerformers: rankings.slice(0, limit),
      bottomPerformers: rankings.slice(-limit).reverse(),
    } as KPIRankingData;
  }

  /**
   * Create or update sales target.
   */
  async upsertTarget(input: CreateSalesTargetInput) {
    const result = await salesTargetRepository.upsert(
      input.employeeId,
      input.month,
      input.year,
      {
        targetRevenue: input.targetRevenue,
        targetOrders: input.targetOrders,
        targetCustomers: input.targetCustomers,
        targetClosedLead: input.targetClosedLead,
        note: input.note,
      }
    );
    return result;
  }

  /**
   * Update existing target.
   */
  async updateTarget(id: string, input: UpdateSalesTargetInput) {
    return salesTargetRepository.update(id, input);
  }

  /**
   * Get target by ID.
   */
  async getTargetById(id: string) {
    return salesTargetRepository.findById(id);
  }

  /**
   * Get all targets for an employee.
   */
  async getTargetsByEmployee(employeeId: string) {
    return salesTargetRepository.findByEmployee(employeeId);
  }
}

export const salesKPIService = new SalesKPIService();
