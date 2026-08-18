// Định nghĩa kiểu dữ liệu User
export interface User {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    avatar?: string;
    /** Role code (e.g. "ADMIN", "SALE", "MKT"). Stable identifier. */
    role: string;
    /** Display label for role (e.g. "Quản trị viên"). Optional — older
     *  payloads pre-date this field, so fallback to `role` in UI. */
    roleName?: string;
    /** Nav groups (from `NavGroupKey`) this role is allowed to see
     *  on the sidebar. Empty array means "resolve dynamically" —
     *  currently used by LEADER whose visibleGroups depend on
     *  their team code (MKT/SALE/WAREHOUSE). */
    visibleGroups?: string[];
    /** Team code (from `Employee.teamId`). Used by Sidebar to resolve
     *  Leader scope — MKT → MKT group, SALE → SALE group,
     *  WAREHOUSE → WAREHOUSE group. Null when the user has no team. */
    teamCode?: string | null;
    permissions: string[];
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}