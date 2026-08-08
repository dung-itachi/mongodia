"use client";

import { Button, Card, Divider, Form, Input, Space, Typography } from "antd";
import { useChangeMyPassword, useMyProfile, useUpdateMyProfile } from "@/hooks/useMyProfile";
import { useAuthStore } from "@/store/auth.store";
import type { Account } from "@/hooks/useAccounts";

type ProfileFields = Pick<Account, "fullName" | "email" | "phone" | "avatar">;
type PasswordFields = { currentPassword: string; newPassword: string };

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const canEditProfile = (user?.permissions.includes("*") ?? false) || (user?.permissions.includes("self-account.update") ?? false);
  const canChangePassword = (user?.permissions.includes("*") ?? false) || (user?.permissions.includes("self-account.changePassword") ?? false);

  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateMyProfile();
  const changePassword = useChangeMyPassword();
  const [profileForm] = Form.useForm<ProfileFields>();
  const [passwordForm] = Form.useForm<PasswordFields>();

  return (
    <div style={{ maxWidth: 760, padding: 24 }}>
      <Typography.Title level={3}>Tài khoản của tôi</Typography.Title>
      <Card loading={isLoading}>
        <Typography.Text type="secondary">
          Bạn chỉ có thể cập nhật các thông tin cá nhân. Role, phòng ban, team, leader được quản lý bởi cấp trên.
        </Typography.Text>
        <Divider />
        <Form<ProfileFields>
          form={profileForm}
          layout="vertical"
          initialValues={profile as ProfileFields | undefined}
          onFinish={(values) => update.mutate(values)}
          disabled={!canEditProfile}
        >
          <Form.Item label="Mã nhân viên"><Input value={profile?.employeeCode} disabled /></Form.Item>
          <Form.Item label="Username"><Input value={profile?.username} disabled /></Form.Item>
          <Form.Item label="Role"><Input value={profile?.role?.code ?? ""} disabled /></Form.Item>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, min: 2, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="avatar" label="Avatar URL"><Input /></Form.Item>
          {canEditProfile && <Button type="primary" htmlType="submit" loading={update.isPending}>Lưu thông tin</Button>}
        </Form>
        {canChangePassword && (
          <>
            <Divider />
            <Typography.Title level={4}>Đổi mật khẩu</Typography.Title>
            <Form<PasswordFields>
              form={passwordForm}
              layout="vertical"
              onFinish={(values) => changePassword.mutate(values, { onSuccess: () => passwordForm.resetFields() })}
            >
              <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}><Input.Password /></Form.Item>
              <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
              <Space><Button type="primary" htmlType="submit" loading={changePassword.isPending}>Đổi mật khẩu</Button></Space>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}