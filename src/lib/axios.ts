import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }

      // Trích xuất message lỗi từ response body để hiển thị tiếng Việt
      // thay vì chuỗi mặc định "Request failed with status code 400".
      const serverMessage =
        error.response?.data?.message ??
        error.response?.data?.error?.message ??
        error.response?.data?.errors?.[0]?.message;
      if (serverMessage && typeof serverMessage === "string") {
        error.message = serverMessage;
      }

      return Promise.reject(error);
    }
  );

export default api;