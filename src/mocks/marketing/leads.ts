import { LeadSource } from "@/constants/leadSource";
import { LeadStatus } from "@/constants/leadStatus";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/constants/marketing";

export type MockEmployee = {
  _id: string;
  employeeCode: string;
  name: string;
};

export type MockLead = {
  _id: string;
  leadCode: string;
  customerName: string;
  phone: string;
  email: string;
  source: LeadSource;
  sourceLabel: string;
  status: LeadStatus;
  statusLabel: string;
  marketingEmployee: MockEmployee | null;
  saleEmployee: MockEmployee | null;
  note: string;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
};

export const mockMarketingLeads: MockLead[] = [
  {
    _id: "lead-001",
    leadCode: "LD2608040001",
    customerName: "Nguyễn Văn An",
    phone: "0912345678",
    email: "an.nguyen@email.com",
    source: LeadSource.FACEBOOK_COMMENT,
    sourceLabel: LEAD_SOURCE_LABELS[LeadSource.FACEBOOK_COMMENT],
    status: LeadStatus.NEW,
    statusLabel: LEAD_STATUS_LABELS[LeadStatus.NEW],
    marketingEmployee: { _id: "emp-001", employeeCode: "M001", name: "Nguyễn Văn M1" },
    saleEmployee: null,
    note: "Khách quan tâm sản phẩm A",
    isDuplicate: false,
    createdAt: "2026-08-04T08:00:00Z",
    updatedAt: "2026-08-04T08:00:00Z",
  },
  {
    _id: "lead-002",
    leadCode: "LD2608040002",
    customerName: "Trần Thị Bình",
    phone: "0987654321",
    email: "binh.tran@email.com",
    source: LeadSource.TIKTOK,
    sourceLabel: LEAD_SOURCE_LABELS[LeadSource.TIKTOK],
    status: LeadStatus.CONTACTED,
    statusLabel: LEAD_STATUS_LABELS[LeadStatus.CONTACTED],
    marketingEmployee: { _id: "emp-001", employeeCode: "M001", name: "Nguyễn Văn M1" },
    saleEmployee: { _id: "emp-002", employeeCode: "S001", name: "Trần Thị Sale" },
    note: "Đã gọi điện, hẹn gặp tuần sau",
    isDuplicate: false,
    createdAt: "2026-08-04T09:30:00Z",
    updatedAt: "2026-08-04T10:00:00Z",
  },
  {
    _id: "lead-003",
    leadCode: "LD2608040003",
    customerName: "Lê Văn Cường",
    phone: "0901234567",
    email: "cuong.le@email.com",
    source: LeadSource.LANDING_PAGE,
    sourceLabel: LEAD_SOURCE_LABELS[LeadSource.LANDING_PAGE],
    status: LeadStatus.ASSIGNED,
    statusLabel: LEAD_STATUS_LABELS[LeadStatus.ASSIGNED],
    marketingEmployee: { _id: "emp-003", employeeCode: "M002", name: "Lê Văn M2" },
    saleEmployee: { _id: "emp-004", employeeCode: "S002", name: "Hoàng Văn Sale" },
    note: "Chuyển cho Sale phụ trách",
    isDuplicate: false,
    createdAt: "2026-08-03T14:00:00Z",
    updatedAt: "2026-08-04T11:00:00Z",
  },
  {
    _id: "lead-004",
    leadCode: "LD2608040004",
    customerName: "Phạm Thị Dung",
    phone: "0934567890",
    email: "dung.pham@email.com",
    source: LeadSource.FACEBOOK_INBOX,
    sourceLabel: LEAD_SOURCE_LABELS[LeadSource.FACEBOOK_INBOX],
    status: LeadStatus.CLOSED,
    statusLabel: LEAD_STATUS_LABELS[LeadStatus.CLOSED],
    marketingEmployee: { _id: "emp-001", employeeCode: "M001", name: "Nguyễn Văn M1" },
    saleEmployee: { _id: "emp-002", employeeCode: "S001", name: "Trần Thị Sale" },
    note: "Đã đặt hàng thành công",
    isDuplicate: false,
    createdAt: "2026-08-02T16:00:00Z",
    updatedAt: "2026-08-04T12:00:00Z",
  },
  {
    _id: "lead-005",
    leadCode: "LD2608040005",
    customerName: "Hoàng Văn Em",
    phone: "0978123456",
    email: "em.hoang@email.com",
    source: LeadSource.ZALO,
    sourceLabel: LEAD_SOURCE_LABELS[LeadSource.ZALO],
    status: LeadStatus.CANCELLED,
    statusLabel: LEAD_STATUS_LABELS[LeadStatus.CANCELLED],
    marketingEmployee: { _id: "emp-003", employeeCode: "M002", name: "Lê Văn M2" },
    saleEmployee: null,
    note: "Khách không mua nữa",
    isDuplicate: false,
    createdAt: "2026-08-03T10:00:00Z",
    updatedAt: "2026-08-04T13:00:00Z",
  },
];
