import { LeadStatus, LEAD_STATUS_LABELS } from "../constants/leadStatus";
import { LeadAction, LEAD_ACTION_LABELS } from "../constants/leadAction";
import {
  ILead,
  SourceType,
  SOURCE_TYPE_LABELS,
  AssignmentType,
} from "../models/Lead";
import { ILeadHistory } from "../models/LeadHistory";

export interface LeadResponse {
  _id: string;
  leadCode: string;
  customerId?: string;
  customer?: {
    _id: string;
    code: string;
    name: string;
    phone?: string;
  };
  customerName: string;
  customerNewName?: string;
  facebookLink?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  sourceType: SourceType;
  sourceTypeLabel: string;
  facebookPageId?: string;
  facebookPage?: {
    _id: string;
    pageId: string;
    pageName: string;
  };
  facebookPageAssignmentId?: string;
  facebookPageAssignment?: {
    _id: string;
    employeeId: string;
    employee?: {
      _id: string;
      employeeCode: string;
      name: string;
    };
  };
  marketingEmployeeId?: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: string;
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  assignmentType?: AssignmentType;
  assignedAt?: string;
  categoryId?: string;
  category?: {
    _id: string;
    code: string;
    name: string;
  };
  productId?: string;
  product?: {
    _id: string;
    code: string;
    name: string;
  };
  comboId?: string;
  combo?: {
    _id: string;
    code: string;
    name: string;
  };
  quantity?: number;
  unitPriceMNT?: number;
  unitPriceVND?: number;
  exchangeRate?: number;
  estimatedWeight?: number;
  status: LeadStatus;
  statusLabel: string;
  latestRemark?: string;
  note?: string;
  isDuplicate: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListItem extends LeadResponse {
  histories?: LeadHistoryResponse[];
}

export interface LeadHistoryResponse {
  _id: string;
  leadId: string;
  employeeId: string;
  employee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  action: LeadAction;
  actionLabel: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
}

export function mapLead(lead: ILead): LeadResponse {
  return {
    _id: lead._id.toString(),
    leadCode: lead.leadCode,
    customerId: lead.customerId?.toString(),
    customerName: lead.customerName,
    customerNewName: lead.customerNewName,
    facebookLink: lead.facebookLink,
    phone: lead.phone,
    phone2: lead.phone2,
    address: lead.address,
    province: lead.province,
    district: lead.district,
    ward: lead.ward,
    sourceType: lead.sourceType,
    sourceTypeLabel: SOURCE_TYPE_LABELS[lead.sourceType],
    facebookPageId: lead.facebookPageId?.toString(),
    facebookPageAssignmentId: lead.facebookPageAssignmentId?.toString(),
    marketingEmployeeId: lead.marketingEmployeeId?.toString(),
    saleEmployeeId: lead.saleEmployeeId?.toString(),
    assignmentType: lead.assignmentType,
    assignedAt: lead.assignedAt?.toISOString(),
    categoryId: lead.categoryId?.toString(),
    productId: lead.productId?.toString(),
    comboId: lead.comboId?.toString(),
    quantity: lead.quantity,
    unitPriceMNT: lead.unitPriceMNT,
    exchangeRate: lead.exchangeRate,
    estimatedWeight: lead.estimatedWeight,
    status: lead.status,
    statusLabel: LEAD_STATUS_LABELS[lead.status],
    latestRemark: lead.latestRemark,
    note: lead.note,
    isDuplicate: lead.isDuplicate,
    isActive: lead.isActive,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function mapLeadList(
  leads: ILead[],
  populateFields: string[] = [
    "customerId",
    "facebookPageId",
    "facebookPageAssignment",
    "marketingEmployeeId",
    "saleEmployeeId",
    "categoryId",
    "productId",
    "comboId",
  ]
): LeadListItem[] {
  return leads.map((lead) => {
    const mapped = mapLead(lead) as LeadListItem;

    if (populateFields.includes("customerId") && lead.customerId) {
      const customer = (lead as any).customerId;
      if (customer) {
        mapped.customer = {
          _id: customer._id.toString(),
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
        };
      }
    }

    if (populateFields.includes("facebookPageId") && lead.facebookPageId) {
      const fp = (lead as any).facebookPageId;
      if (fp) {
        mapped.facebookPage = {
          _id: fp._id.toString(),
          pageId: fp.pageId,
          pageName: fp.pageName,
        };
      }
    }

    if (
      populateFields.includes("facebookPageAssignment") &&
      lead.facebookPageAssignmentId
    ) {
      const fpa = (lead as any).facebookPageAssignment;
      if (fpa) {
        mapped.facebookPageAssignment = {
          _id: fpa._id.toString(),
          employeeId: fpa.employeeId.toString(),
          employee: fpa.employee
            ? {
                _id: fpa.employee._id.toString(),
                employeeCode: fpa.employee.employeeCode,
                name: fpa.employee.name,
              }
            : undefined,
        };
      }
    }

    if (
      populateFields.includes("marketingEmployeeId") &&
      lead.marketingEmployeeId
    ) {
      const me = (lead as any).marketingEmployeeId;
      if (me) {
        mapped.marketingEmployee = {
          _id: me._id.toString(),
          employeeCode: me.employeeCode,
          name: me.name,
        };
      }
    }

    if (populateFields.includes("saleEmployeeId") && lead.saleEmployeeId) {
      const se = (lead as any).saleEmployeeId;
      if (se) {
        mapped.saleEmployee = {
          _id: se._id.toString(),
          employeeCode: se.employeeCode,
          name: se.name,
        };
      }
    }

    if (populateFields.includes("categoryId") && lead.categoryId) {
      const cat = (lead as any).categoryId;
      if (cat) {
        mapped.category = {
          _id: cat._id.toString(),
          code: cat.code,
          name: cat.name,
        };
      }
    }

    if (populateFields.includes("productId") && lead.productId) {
      const prod = (lead as any).productId;
      if (prod) {
        mapped.product = {
          _id: prod._id.toString(),
          code: prod.code,
          name: prod.name,
        };
      }
    }

    if (populateFields.includes("comboId") && lead.comboId) {
      const combo = (lead as any).comboId;
      if (combo) {
        mapped.combo = {
          _id: combo._id.toString(),
          code: combo.code,
          name: combo.name,
        };
      }
    }

    return mapped;
  });
}

export function mapLeadHistory(history: ILeadHistory): LeadHistoryResponse {
  return {
    _id: history._id.toString(),
    leadId: history.leadId.toString(),
    employeeId: history.employeeId.toString(),
    action: history.action,
    actionLabel: LEAD_ACTION_LABELS[history.action],
    oldValue: history.oldValue,
    newValue: history.newValue,
    note: history.note,
    createdAt: history.createdAt.toISOString(),
  };
}

export function mapLeadHistoryList(
  histories: ILeadHistory[],
  populateEmployee: boolean = true
): LeadHistoryResponse[] {
  return histories.map((history) => {
    const mapped = mapLeadHistory(history);

    if (populateEmployee) {
      const emp = (history as any).employeeId;
      if (emp) {
        mapped.employee = {
          _id: emp._id.toString(),
          employeeCode: emp.employeeCode,
          name: emp.name,
        };
      }
    }

    return mapped;
  });
}
