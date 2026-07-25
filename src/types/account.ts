// Định nghĩa kiểu dữ liệu User
export interface User {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}