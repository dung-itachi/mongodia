/**
 * Shared types for the Organization Chart.
 *
 * These mirror the wire-format produced by /api/employees/org-chart
 * and are kept in one place so components stay aligned.
 */

export type OrgNodeRole =
  | "ADMIN"
  | "MANAGER"
  | "LEADER"
  | "EMPLOYEE"
  | "SALE"
  | "MKT"
  | "WAREHOUSE"
  | "UNKNOWN";

export type OrgNode = {
  id: string;
  role: string;
  roleLabel: string;
  employeeCode: string;
  fullName: string;
  avatar?: string;
  teamName?: string | null;
  isActive: boolean;
  children: OrgNode[];
  meta: {
    directReports: number;
    totalReports: number;
  };
};

export type OrgFlatEntry = {
  id: string;
  employeeCode: string;
  fullName: string;
  role: string;
  ancestorIds: string[];
};

export type OrgChartPayload = {
  root: OrgNode;
  flat: OrgFlatEntry[];
};

/** Layout coordinates computed by the layout pass. */
export type LaidOutNode = {
  node: OrgNode;
  /** Logical horizontal slot (used to keep siblings in line). */
  col: number;
  /** Pixel x,y of the node's top-left corner. */
  x: number;
  y: number;
  /** Pixel width/height of the node's rendered card. */
  width: number;
  height: number;
  /** Indices of children in `laidOut`. */
  childIds: string[];
};
