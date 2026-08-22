"use client";

import { Button, Card, Form, Input, message, Modal, Progress, Space, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import styles from "./profile.module.css";
import { useChangeMyPassword, useMyProfile, useUpdateMyProfile } from "@/hooks/useMyProfile";
import { useAuthStore } from "@/store/auth.store";
import { uploadToCloudinary, getAvatarDisplayUrl, extractPublicId, deleteCloudinaryImage, type ValidationError } from "@/lib/cloudinary";
import type { Account } from "@/hooks/useAccounts";
import ImageSizeErrorModal from "@/components/accounts/ImageSizeErrorModal";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

type ProfileFields = Pick<Account, "fullName" | "email" | "phone" | "avatar">;
type PasswordFields = { currentPassword: string; newPassword: string };

export default function ProfilePage() {
  const lang = useLanguageStore((s) => s.language);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<number | null>(null);

  const user = useAuthStore((state) => state.user);
  const canEditProfile = (user?.permissions.includes("*") ?? false) || (user?.permissions.includes("self-account.update") ?? false);
  const canChangePassword = (user?.permissions.includes("*") ?? false) || (user?.permissions.includes("self-account.changePassword") ?? false);

  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateMyProfile();
  const changePassword = useChangeMyPassword();
  const [profileForm] = Form.useForm<ProfileFields>();
  const [passwordForm] = Form.useForm<PasswordFields>();

  // Sync avatarUrl when profile loads (to handle page refresh and after save)
  useEffect(() => {
    if (profile?.avatar && !avatarUrl) {
      setAvatarUrl(profile.avatar);
    }
  }, [profile?.avatar]);

  const currentAvatarUrl = getAvatarDisplayUrl(avatarUrl ?? profile?.avatar ?? undefined);
  const displayAvatarUrl = previewUrl || currentAvatarUrl;

  const handleAvatarChange = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, (percent) => {
        setUploadProgress(percent);
      });

      setAvatarUrl(result.secure_url);
      setPreviewUrl(null);
    } catch (err) {
      const validationErr = err as ValidationError;
      if (validationErr && typeof validationErr === "object" && validationErr.code === "size") {
        setSizeError(validationErr.fileSizeMB ?? file.size / (1024 * 1024));
        setPreviewUrl(null);
      } else if (validationErr && typeof validationErr === "object" && validationErr.code === "type") {
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        void handleAvatarChange(file);
      }
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 1100, padding: 24 }}>
      {contextHolder}
      <Typography.Title level={3}>Tài khoản của tôi</Typography.Title>
      <Card loading={isLoading}>
        <div className={styles.profileLayout}>
          <div>
            <Typography.Text type="secondary">
              Bạn chỉ có thể cập nhật các thông tin cá nhân. Role, phòng ban, team, leader được quản lý bởi cấp trên.
            </Typography.Text>
            <Form<ProfileFields>
              form={profileForm}
              layout="vertical"
              initialValues={profile as ProfileFields | undefined}
              onFinish={(values) => {
                // Capture current avatarUrl to avoid stale closure
                const currentAvatarUrl = avatarUrl;
                const payload = {
                  fullName: values.fullName,
                  email: values.email,
                  phone: values.phone,
                  avatar: currentAvatarUrl ?? values.avatar ?? "",
                };
                const oldAvatarUrl = profile?.avatar ?? "";
                update.mutate(payload, {
                  onSuccess: () => {
                    void (async () => {
                      const oldPublicId = extractPublicId(oldAvatarUrl);
                      const newPublicId = extractPublicId(currentAvatarUrl ?? "");
                      if (oldPublicId && oldPublicId !== newPublicId) {
                        await deleteCloudinaryImage(oldPublicId);
                      }
                    })();
                    messageApi?.success("Lưu thông tin thành công");
                  },
                  onError: () => {
                    messageApi?.error("Lưu thông tin thất bại");
                  }
                });
              }}
              disabled={!canEditProfile}
            >
              <Form.Item name="avatar" hidden><Input /></Form.Item>

              <Form.Item label="Avatar">
                <div className={styles.avatarUpload}>
                  <div className={styles.avatarPreview}>
                    {displayAvatarUrl ? (
                      <img src={displayAvatarUrl} alt="Avatar" />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <span>Chưa có avatar</span>
                      </div>
                    )}
                  </div>
                  {isUploading && (
                    <div className={styles.uploadProgress}>
                      <Progress percent={uploadProgress} size="small" status="active" />
                      <span>Đang tải lên...</span>
                    </div>
                  )}
                  {canEditProfile && (
                    <Button
                      icon={<UploadOutlined />}
                      onClick={handleUploadClick}
                      loading={isUploading}
                    >
                      {displayAvatarUrl && !previewUrl ? "Chọn ảnh mới" : "Tải lên avatar"}
                    </Button>
                  )}
                  <Typography.Text type="secondary" className={styles.uploadHint}>
                    JPG / PNG / WebP - Tối đa 5MB
                  </Typography.Text>
                </div>
              </Form.Item>

              <Typography.Text type="secondary">
                Bạn chỉ có thể cập nhật các thông tin cá nhân. Role, phòng ban, team, leader được quản lý bởi cấp trên.
              </Typography.Text>

              <Form.Item label="Mã nhân viên"><Input value={profile?.employeeCode} disabled /></Form.Item>
              <Form.Item label="Username"><Input value={profile?.username} disabled /></Form.Item>
              <Form.Item label="Role"><Input value={profile?.role?.code ?? ""} disabled /></Form.Item>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, min: 2, max: 100 }]}><Input /></Form.Item>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}><Input /></Form.Item>
              <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>

              {canEditProfile && (
                <Space>
                  <Button type="primary" htmlType="submit" loading={update.isPending}>Lưu thông tin</Button>
                  {canChangePassword && (
                    <Button onClick={() => setPasswordModalOpen(true)}>{t("Đổi mật khẩu", lang)}</Button>
                  )}
                </Space>
              )}
            </Form>
          </div>
          {!canEditProfile && canChangePassword && (
            <div className={styles.passwordSection}>
              <Typography.Title level={4}>{t("Đổi mật khẩu", lang)}</Typography.Title>
              <Form<PasswordFields>
                form={passwordForm}
                layout="vertical"
                onFinish={(values) => changePassword.mutate(values, { onSuccess: () => passwordForm.resetFields() })}
              >
                <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}><Input.Password /></Form.Item>
                <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={changePassword.isPending}>{t("Đổi mật khẩu", lang)}</Button>
                </Space>
              </Form>
            </div>
          )}
        </div>
      </Card>

      <Modal
        title={t("Đổi mật khẩu", lang)}
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form<PasswordFields>
          form={passwordForm}
          layout="vertical"
          onFinish={(values) => {
            changePassword.mutate(values, {
              onSuccess: () => {
                passwordForm.resetFields();
                setPasswordModalOpen(false);
              }
            });
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setPasswordModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={changePassword.isPending}>Đổi mật kh�u</Button>
          </Space>
        </Form>
      </Modal>

      <ImageSizeErrorModal
        open={sizeError !== null}
        onClose={() => setSizeError(null)}
        fileSizeMB={sizeError ?? undefined}
      />
    </div>
  );
}
