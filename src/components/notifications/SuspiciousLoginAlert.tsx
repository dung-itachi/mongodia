"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Typography,
  Space,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import api from "@/lib/axios";

type SuspiciousLogin = {
  _id: string;
  ip: string;
  userAgent: string;
  loginAt: string;
  anomalyReason: string;
  isUnusualIp: boolean;
  isUnusualDevice: boolean;
};

type CheckResponse = {
  hasSuspiciousLogins: boolean;
  count: number;
  items: SuspiciousLogin[];
};

function parseUserAgent(ua: string): string {
  if (!ua) return "-";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("MSIE") || ua.includes("Trident")) return "IE";
  if (ua.includes("Mobile") || ua.includes("Android")) return "Mobile Browser";
  const match = ua.match(/Mozilla\/[\d.]+\s+\(([^)]+)\)/);
  if (match) {
    const info = match[1];
    if (info.includes("Windows")) return "Windows";
    if (info.includes("Mac")) return "macOS";
    if (info.includes("Linux")) return "Linux";
  }
  return ua.slice(0, 30) + "...";
}

export default function SuspiciousLoginAlert() {
  const queryClient = useQueryClient();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedLogin, setSelectedLogin] = useState<SuspiciousLogin | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery<CheckResponse>({
    queryKey: ["suspicious-logins-check"],
    queryFn: async () => {
      const res = await api.get("/api/login-history/check-suspicious");
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, isTrusted }: { id: string; isTrusted: boolean }) => {
      const res = await api.put(`/api/login-history/${id}?id=${id}`, { isTrusted });
      return res.data;
    },
    onSuccess: () => {
      message.success("Đã xác nhận đăng nhập tin cậy");
      setConfirmModalVisible(false);
      setSelectedLogin(null);
      void queryClient.invalidateQueries({ queryKey: ["suspicious-logins-check"] });
      void queryClient.invalidateQueries({ queryKey: ["login-history"] });
    },
    onError: () => {
      message.error("Không thể xác nhận");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: { newPassword: string; confirmPassword: string }) => {
      const res = await api.patch("/api/account/change-password", {
        newPassword: values.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      message.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      setPasswordModalVisible(false);
      form.resetFields();
      // Force logout
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Không thể đổi mật khẩu");
    },
  });

  const handleNotMe = (login: SuspiciousLogin) => {
    setSelectedLogin(login);
    setPasswordModalVisible(true);
  };

  const handleConfirmMe = (login: SuspiciousLogin) => {
    setSelectedLogin(login);
    setConfirmModalVisible(true);
  };

  if (isLoading || !data?.hasSuspiciousLogins) {
    return null;
  }

  return (
    <>
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        title={
          <Space>
            <span>
              Phát hiện <strong>{data.count}</strong> lần đăng nhập bất thường trong 7 ngày gần đây
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => {
                window.location.href = "/accounts/login-history";
              }}
            >
              Xem chi tiết
            </Button>
          </Space>
        }
        description={
          <div style={{ marginTop: 8 }}>
            {data.items.slice(0, 3).map((item) => (
              <div
                key={item._id}
                style={{
                  marginBottom: 8,
                  padding: "8px 12px",
                  background: "#fff",
                  borderRadius: 4,
                  border: "1px solid #ffe58f",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#595959" }}>
                      {new Date(item.loginAt).toLocaleString("vi-VN")} - IP: {item.ip || "-"}
                    </div>
                    <div style={{ fontSize: 12, color: "#faad14" }}>
                      {item.anomalyReason || "Đăng nhập bất thường"}
                    </div>
                  </div>
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleConfirmMe(item)}
                    >
                      Đây là tôi
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={() => handleNotMe(item)}
                    >
                      Không phải tôi
                    </Button>
                  </Space>
                </div>
              </div>
            ))}
            {data.items.length > 3 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Và {data.items.length - 3} lần đăng nhập khác...
              </Typography.Text>
            )}
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {/* Confirm Modal */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: "#faad14" }} />
            Xác nhận đăng nhập
          </Space>
        }
        open={confirmModalVisible}
        onCancel={() => {
          setConfirmModalVisible(false);
          setSelectedLogin(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setConfirmModalVisible(false);
              setSelectedLogin(null);
            }}
          >
            Hủy
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={() => {
              if (selectedLogin) {
                confirmMutation.mutate({
                  id: selectedLogin._id,
                  isTrusted: true,
                });
              }
            }}
            loading={confirmMutation.isPending}
          >
            Xác nhận đây là tôi
          </Button>,
        ]}
      >
        {selectedLogin && (
          <div>
            <p>Bạn xác nhận đăng nhập này là của bạn?</p>
            <ul>
              <li>
                <strong>Thời gian:</strong>{" "}
                {new Date(selectedLogin.loginAt).toLocaleString("vi-VN")}
              </li>
              <li>
                <strong>IP:</strong> {selectedLogin.ip || "-"}
              </li>
              <li>
                <strong>Thiết bị:</strong> {parseUserAgent(selectedLogin.userAgent)}
              </li>
              <li>
                <strong>Lý do:</strong>{" "}
                <span style={{ color: "#faad14" }}>
                  {selectedLogin.anomalyReason || "Không xác định"}
                </span>
              </li>
            </ul>
          </div>
        )}
      </Modal>

      {/* Password Change Modal */}
      <Modal
        title="Vui lòng thay đổi mật khẩu để bảo vệ tài khoản"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setSelectedLogin(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Alert
          type="warning"
          title="Phát hiện đăng nhập lạ"
          description={
            <div>
              <p>Có thể tài khoản của bạn đã bị truy cập trái phép.</p>
              <p>Vui lòng thay đổi mật khẩu ngay để bảo vệ tài khoản.</p>
              {selectedLogin && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <div>Thời gian: {new Date(selectedLogin.loginAt).toLocaleString("vi-VN")}</div>
                  <div>IP: {selectedLogin.ip || "-"}</div>
                  <div>Thiết bị: {parseUserAgent(selectedLogin.userAgent)}</div>
                </div>
              )}
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            changePasswordMutation.mutate(values);
          }}
        >
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setPasswordModalVisible(false);
                  setSelectedLogin(null);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordMutation.isPending}
              >
                Đổi mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
