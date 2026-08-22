"use client";

import dayjs from "dayjs";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { LoginHistoryItem } from "@/hooks/useLoginHistory";

interface Props {
  visible: boolean;
  item: LoginHistoryItem | null;
  onClose: () => void;
  onConfirm: (item: LoginHistoryItem) => void;
}

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

export default function SuspiciousLoginConfirmModal({
  visible,
  item,
  onClose,
  onConfirm,
}: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const changePasswordMutation = useMutation({
    mutationFn: async (values: { newPassword: string; confirmPassword: string }) => {
      const res = await api.patch("/api/account/change-password", {
        newPassword: values.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      message.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      onClose();
      form.resetFields();
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Không thể đổi mật khẩu");
    },
  });

  const handleNotMe = () => {
    if (!item) return;
    form.resetFields();
  };

  const handleConfirmPassword = () => {
    form.validateFields().then((values) => {
      changePasswordMutation.mutate(values);
    });
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: "#faad14" }} />
          Xác nhận đăng nhập lạ
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnHidden
    >
      {item && (
        <div>
          <Alert
            type="warning"
            message="Phát hiện đăng nhập bất thường"
            description={
              <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                <li>
                  <strong>Người dùng:</strong> {item.fullName} ({item.username})
                </li>
                <li>
                  <strong>Thời gian:</strong>{" "}
                  {dayjs(item.loginAt).format("DD/MM/YYYY HH:mm:ss")}
                </li>
                <li>
                  <strong>IP:</strong> {item.ip || "-"}
                </li>
                <li>
                  <strong>Thiết bị:</strong> {parseUserAgent(item.userAgent) || "-"}
                </li>
                <li>
                  <strong>Lý do:</strong>{" "}
                  <span style={{ color: "#faad14" }}>
                    {item.anomalyReason || "Không xác định"}
                  </span>
                </li>
              </ul>
            }
            style={{ marginBottom: 16 }}
          />

          <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
            Bạn có xác nhận đăng nhập này là của bạn không?
          </Typography.Text>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button danger onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleNotMe}>Không phải tôi</Button>
            <Button
              type="primary"
              onClick={() => onConfirm(item)}
            >
              Đây là tôi
            </Button>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8, color: "#fa8c16" }}
            >
              Vui lòng thay đổi mật khẩu để bảo vệ tài khoản
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Nếu bạn không nhận ra đăng nhập này, hãy đổi mật khẩu ngay.
            </Typography.Text>
            <Form
              form={form}
              layout="vertical"
              style={{ marginTop: 12 }}
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
                      return Promise.reject(
                        new Error("Mật khẩu xác nhận không khớp")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  danger
                  onClick={handleConfirmPassword}
                  loading={changePasswordMutation.isPending}
                  block
                >
                  Đổi mật khẩu và bảo vệ tài khoản
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      )}
    </Modal>
  );
}
