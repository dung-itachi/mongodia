/**
 * Export Utilities (Sprint 7.3 — Drill-down & Export)
 *
 * Export dashboard data to Excel (.xlsx) and PDF.
 */

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportData } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

/**
 * Export data to Excel file.
 */
export function exportToExcel(data: ExportData, filename: string = "dashboard-export") {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Marketing Dashboard Export"],
    [],
    ["Metric", "Value"],
    ["Lead hôm nay", data.summary.todayLead],
    ["Lead tháng", data.summary.monthLead],
    ["Tổng Lead", data.summary.totalLead],
    ["Lead đã giao Sale", data.summary.assignedLead],
    ["Lead chốt", data.summary.closedLead],
    ["Chi phí quảng cáo", data.summary.totalSpent],
    ["Doanh thu tháng", data.summary.monthRevenue],
    ["ROAS", `${data.summary.roas.toFixed(2)}x`],
    ["CPA", data.summary.cpa],
    ["Conversion Rate", `${data.summary.conversionRate}%`],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Sheet 2: Lead Trend
  const leadTrendData = [
    ["Xu hướng Lead"],
    ["Ngày", "Số Lead"],
    ...data.leads.map((d) => [d.date, d.value]),
  ];
  const leadTrendSheet = XLSX.utils.aoa_to_sheet(leadTrendData);
  XLSX.utils.book_append_sheet(workbook, leadTrendSheet, "Lead Trend");

  // Sheet 3: Expense Trend
  const expenseTrendData = [
    ["Xu hướng Chi phí"],
    ["Ngày", "Chi phí"],
    ...data.expenses.map((d) => [d.date, d.value]),
  ];
  const expenseTrendSheet = XLSX.utils.aoa_to_sheet(expenseTrendData);
  XLSX.utils.book_append_sheet(workbook, expenseTrendSheet, "Expense Trend");

  // Sheet 4: Revenue Trend
  const revenueTrendData = [
    ["Xu hướng Doanh thu"],
    ["Ngày", "Doanh thu"],
    ...data.revenues.map((d) => [d.date, d.value]),
  ];
  const revenueTrendSheet = XLSX.utils.aoa_to_sheet(revenueTrendData);
  XLSX.utils.book_append_sheet(workbook, revenueTrendSheet, "Revenue Trend");

  // Sheet 5: ROAS Trend
  const roasTrendData = [
    ["Xu hướng ROAS"],
    ["Ngày", "ROAS"],
    ...data.roas.map((d) => [d.date, d.value.toFixed(2)]),
  ];
  const roasTrendSheet = XLSX.utils.aoa_to_sheet(roasTrendData);
  XLSX.utils.book_append_sheet(workbook, roasTrendSheet, "ROAS Trend");

  // Sheet 6: CPA Trend
  const cpaTrendData = [
    ["Xu hướng CPA"],
    ["Ngày", "CPA"],
    ...data.cpa.map((d) => [d.date, d.value.toFixed(2)]),
  ];
  const cpaTrendSheet = XLSX.utils.aoa_to_sheet(cpaTrendData);
  XLSX.utils.book_append_sheet(workbook, cpaTrendSheet, "CPA Trend");

  // Sheet 7: Facebook Pages Ranking
  const facebookPagesData = [
    ["Top Facebook Pages"],
    ["Page", "Lead", "Revenue", "ROAS"],
    ...data.facebookPages.map((p) => [p.pageName, p.totalLeads, p.totalRevenue, `${p.roas.toFixed(2)}x`]),
  ];
  const facebookPagesSheet = XLSX.utils.aoa_to_sheet(facebookPagesData);
  XLSX.utils.book_append_sheet(workbook, facebookPagesSheet, "Facebook Pages");

  // Sheet 8: Marketing Employees Ranking
  const employeesData = [
    ["Top Marketing Employees"],
    ["Employee", "Lead", "Qualified", "Closed", "Revenue"],
    ...data.marketingEmployees.map((e) => [e.employeeName, e.totalLeads, e.qualifiedLeads, e.closedLeads, e.revenue]),
  ];
  const employeesSheet = XLSX.utils.aoa_to_sheet(employeesData);
  XLSX.utils.book_append_sheet(workbook, employeesSheet, "Marketing Employees");

  // Sheet 9: Campaigns Ranking
  const campaignsData = [
    ["Top Campaigns"],
    ["Campaign", "Spent", "Revenue", "ROAS", "Lead"],
    ...data.campaigns.map((c) => [c.campaignName, c.totalSpent, c.totalRevenue, `${c.roas.toFixed(2)}x`, c.totalLeads]),
  ];
  const campaignsSheet = XLSX.utils.aoa_to_sheet(campaignsData);
  XLSX.utils.book_append_sheet(workbook, campaignsSheet, "Campaigns");

  // Generate and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF file.
 */
export function exportToPDF(data: ExportData, filename: string = "dashboard-export") {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Marketing Dashboard Report", 14, 20);

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString("vi-VN")}`, 14, 28);

  // Summary Section
  doc.setFontSize(14);
  doc.text("Summary", 14, 40);

  const summaryRows = [
    ["Lead hôm nay", String(data.summary.todayLead)],
    ["Lead tháng", String(data.summary.monthLead)],
    ["Tổng Lead", String(data.summary.totalLead)],
    ["Lead đã giao Sale", String(data.summary.assignedLead)],
    ["Lead chốt", String(data.summary.closedLead)],
    ["Chi phí quảng cáo", formatNumber(data.summary.totalSpent)],
    ["Doanh thu tháng", formatNumber(data.summary.monthRevenue)],
    ["ROAS", `${data.summary.roas.toFixed(2)}x`],
    ["CPA", formatNumber(data.summary.cpa)],
    ["Conversion Rate", `${data.summary.conversionRate}%`],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Metric", "Value"]],
    body: summaryRows,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Facebook Pages
  if (data.facebookPages.length > 0) {
    doc.setFontSize(14);
    const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.text("Top Facebook Pages", 14, afterSummary);

    autoTable(doc, {
      startY: afterSummary + 4,
      head: [["Page", "Lead", "Revenue", "ROAS"]],
      body: data.facebookPages.map((p) => [p.pageName, p.totalLeads, formatNumber(p.totalRevenue), `${p.roas.toFixed(2)}x`]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  // Marketing Employees
  if (data.marketingEmployees.length > 0) {
    doc.setFontSize(14);
    const afterPages = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.text("Top Marketing Employees", 14, afterPages);

    autoTable(doc, {
      startY: afterPages + 4,
      head: [["Employee", "Lead", "Qualified", "Closed", "Revenue"]],
      body: data.marketingEmployees.map((e) => [e.employeeName, e.totalLeads, e.qualifiedLeads, e.closedLeads, formatNumber(e.revenue)]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  // Campaigns
  if (data.campaigns.length > 0) {
    doc.setFontSize(14);
    const afterEmployees = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.text("Top Campaigns", 14, afterEmployees);

    autoTable(doc, {
      startY: afterEmployees + 4,
      head: [["Campaign", "Spent", "Revenue", "ROAS", "Lead"]],
      body: data.campaigns.map((c) => [c.campaignName, formatNumber(c.totalSpent), formatNumber(c.totalRevenue), `${c.roas.toFixed(2)}x`, c.totalLeads]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  // Download
  doc.save(`${filename}.pdf`);
}
