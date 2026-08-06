/**
 * ==================================================
 * CUSTOMER ACTIVITY TYPES
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 */

// ============================================================================
// Activity Types
// ============================================================================

export enum ActivityType {
  CALL = "CALL",
  MEETING = "MEETING",
  NOTE = "NOTE",
  FOLLOW_UP = "FOLLOW_UP",
  EMAIL = "EMAIL",
  SMS = "SMS",
  OTHER = "OTHER",
}

// ============================================================================
// Activity Result
// ============================================================================

export enum ActivityResult {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  NO_ANSWER = "NO_ANSWER",
  PENDING = "PENDING",
}

// ============================================================================
// Customer Activity Entity
// ============================================================================

export interface CustomerActivity {
  _id: string;
  customerId: string;
  employeeId: string;

  activityType: ActivityType;
  title: string;
  content?: string;

  nextFollowUpAt?: string;
  result?: ActivityResult;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Populated Customer Activity
// ============================================================================

export interface CustomerActivityResponse extends CustomerActivity {
  customer?: {
    _id: string;
    customerCode: string;
    fullName: string;
  };
  employee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  resultLabel?: string;
  activityTypeLabel?: string;
}

// ============================================================================
// Filter
// ============================================================================

export interface CustomerActivityFilter {
  customerId?: string;
  employeeId?: string;
  activityType?: ActivityType;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  result?: ActivityResult;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// List Response
// ============================================================================

export interface CustomerActivityListResponse {
  items: CustomerActivity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Create Input
// ============================================================================

export interface CreateCustomerActivityInput {
  customerId: string;
  activityType: ActivityType;
  title: string;
  content?: string;
  nextFollowUpAt?: string;
  result?: ActivityResult;
  employeeId: string;
}

// ============================================================================
// Update Input
// ============================================================================

export interface UpdateCustomerActivityInput {
  activityType?: ActivityType;
  title?: string;
  content?: string;
  nextFollowUpAt?: string | null;
  result?: ActivityResult;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface FollowUpStats {
  todayTotal: number;
  todayCompleted: number;
  todayPending: number;
  upcomingTotal: number;
  upcomingCount: number;
  missedTotal: number;
  missedCount: number;
}
