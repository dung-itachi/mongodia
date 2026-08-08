// Định nghĩa kiểu dữ liệu User
export interface User {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    /** Role code (e.g. "ADMIN", "SALE", "MKT"). Stable identifier. */
    role: string;
    /** Display label for role (e.g. "Quản trị viên"). Optional — older
     *  payloads pre-date this field, so fallback to `role` in UI. */
    roleName?: string;
    permissions: string[];
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}