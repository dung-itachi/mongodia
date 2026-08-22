"use client";

/**
 * Shared "Tạo / Sửa tài khoản" drawer.
 *
 * Reused by:
 *   - /accounts page (full create/edit/view)
 *   - /employees org chart (create only — sibling/child of a chart node)
 *
 * The drawer is intentionally presentational: it owns the form state and
 * submit logic, but receives all options (role list, team list, leader
 * list, default values, locked fields, onSuccess) via props so it can
 * be embedded into any page without duplicating the form schema.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  type Account,
  type AccountInput,
  useCreateAccount,
  useUpdateAccount,
} from "@/hooks/useAccounts";
import {
  uploadToCloudinary,
  getAvatarDisplayUrl,
  extractPublicId,
  deleteCloudinaryImage,
  type ValidationError,
} from "@/lib/cloudinary";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./AccountCreateDrawer.module.css";
import ImageSizeErrorModal from "./ImageSizeErrorModal";

export type AccountCreateDrawerProps = {
  open: boolean;
  onClose: () => void;

  /** Mode determines title + submit behaviour. */
  mode?: "create" | "edit" | "view";

  /** Selected account when in edit/view mode. */
  selected?: Account | null;

  /** Pre-fill values applied when mode === "create". */
  defaultValues?: Partial<AccountInput>;

  /**
   * Fields the caller wants to lock to their pre-filled value (the user
   * cannot override them in the form). Useful when the chart pins
   * `teamId` / `leaderId` so the new account inherits its anchor's
   * placement.
   */
  lockedFields?: ReadonlyArray<"roleCode" | "teamId" | "leaderId">;

  /** Roles selectable in the form (e.g. scoped by hierarchy). */
  roleOptions: Array<{ value: string; label: string }>;

  /** Teams selectable in the form. */
  teamOptions: Array<{ value: string; label: string }>;

  /** Leaders selectable in the form. */
  leaderOptions: Array<{ value: string; label: string }>;

  /** Areas selectable in the form. */
  areaOptions: Array<{ value: string; label: string }>;

  /** Departments selectable in the form. */
  departmentOptions: Array<{ value: string; label: string }>;

  /** Called after a successful create/update. */
  onSuccess?: () => void;

  /** Hide fields that aren't relevant (e.g. bank fields when not needed). */
  showBankFields?: boolean;
};

type FormValues = AccountInput & { departmentCode?: string; departmentId?: string };

export default function AccountCreateDrawer({
  open,
  onClose,
  mode = "create",
  selected = null,
  defaultValues,
  lockedFields,
  roleOptions,
  teamOptions,
  departmentOptions,
  leaderOptions,
  areaOptions,
  onSuccess,
  showBankFields = true,
}: AccountCreateDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const lang = useLanguageStore((s) => s.language);
  const create = useCreateAccount();
  const update = useUpdateAccount();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<{ fileSizeMB: number; fileName: string } | null>(null);

  const locked = useMemo(() => new Set(lockedFields ?? []), [lockedFields]);

  const currentAvatarUrl = getAvatarDisplayUrl(avatarUrl ?? selected?.avatar ?? undefined);
  const displayAvatarUrl = previewUrl || currentAvatarUrl;

  // Sync avatarUrl when drawer opens with selected account
  useEffect(() => {
    if (open && selected?.avatar) {
      setAvatarUrl(selected.avatar);
    }
    if (open && !selected) {
      setAvatarUrl(null);
      setPreviewUrl(null);
    }
  }, [open, selected]);

  const handleAvatarChange = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, (percent) => {
        setUploadProgress(percent);
      });

      setAvatarUrl(result.secure_url);
      setPreviewUrl(null);
      void form.setFieldValue("avatar", result.secure_url);
    } catch (err) {
      const validationErr = err as ValidationError;
      if (validationErr && typeof validationErr === "object" && validationErr.code === "size") {
        setSizeError({
          fileSizeMB: validationErr.fileSizeMB ?? file.size / (1024 * 1024),
          fileName: file.name,
        });
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

  // Reset form whenever the drawer opens or the inputs change.
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      form.resetFields();
      form.setFieldsValue({
        roleCode: defaultValues?.roleCode ?? "EMPLOYEE",
        teamId: defaultValues?.teamId ?? undefined,
        departmentId: defaultValues?.departmentId ?? undefined,
        leaderId: defaultValues?.leaderId ?? undefined,
        areaId: defaultValues?.areaId ?? undefined,
      });
    } else if (selected) {
      form.setFieldsValue({
        ...selected,
        roleCode: selected.role?.code,
        departmentId: selected.departmentId?._id,
        areaId: selected.area?._id,
      });
    }
    // We intentionally exclude `form` from the deps — Ant's `useForm`
    // returns a stable handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, selected, defaultValues]);

  const submit = (values: FormValues) => {
    if (mode === "create") {
      create.mutate(
        {
          username: values.username,
          password: values.password,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          avatar: avatarUrl ?? values.avatar ?? "",
          roleCode: values.roleCode,
          teamId: values.teamId ?? null,
          departmentId: values.departmentId ?? null,
          leaderId: values.leaderId ?? null,
          areaId: values.areaId ?? null,
          bankName: values.bankName,
          bankAccountNumber: values.bankAccountNumber,
          bankAccountHolder: values.bankAccountHolder,
        },
        {
          onSuccess: () => {
            form.resetFields();
            setAvatarUrl(null);
            setPreviewUrl(null);
            onSuccess?.();
            onClose();
          },
        }
      );
    } else if (selected) {
      const oldAvatarUrl = selected.avatar ?? "";
      const newAvatarUrl = avatarUrl ?? values.avatar ?? "";
      update.mutate(
        {
          id: selected._id,
          input: {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            avatar: newAvatarUrl,
            roleCode: values.roleCode,
            teamId: values.teamId ?? null,
            departmentId: values.departmentId ?? null,
            leaderId: values.leaderId ?? null,
            areaId: values.areaId ?? null,
            bankName: values.bankName,
            bankAccountNumber: values.bankAccountNumber,
            bankAccountHolder: values.bankAccountHolder,
          },
        },
        {
          onSuccess: () => {
            void (async () => {
              const oldPublicId = extractPublicId(oldAvatarUrl);
              const newPublicId = extractPublicId(newAvatarUrl);
              if (oldPublicId && oldPublicId !== newPublicId) {
                await deleteCloudinaryImage(oldPublicId);
              }
            })();
            setAvatarUrl(null);
            setPreviewUrl(null);
            onSuccess?.();
            onClose();
          },
        }
      );
    }
  };

  const title =
    mode === "create"
      ? t("Tạo tài khoản", lang)
      : mode === "edit"
        ? t("Cập nhật tài khoản", lang)
        : t("Chi tiết tài khoản", lang);

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      size={520}
    >
      {mode === "view" && selected ? (
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #d9d9d9",
              background: "#fafafa",
              flexShrink: 0
            }}>
              {selected.avatar ? (
                <img src={getAvatarDisplayUrl(selected.avatar)} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 11 }}>
                  {t("Không có avatar", lang)}
                </div>
              )}
            </div>
          </div>
          <Typography.Paragraph>
            <b>{t("Mã NV", lang)}:</b> {selected.employeeCode}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Username:</b> {selected.username}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Họ tên", lang)}:</b> {selected.fullName}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Email:</b> {selected.email || "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Điện thoại", lang)}:</b> {selected.phone || "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Role:</b>{" "}
            <Tag color="blue">{selected.role?.code ?? "-"}</Tag> (
            {selected.role?.name ?? "-"})
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Phòng ban", lang)}:</b>{" "}
            <Tag color="purple">{selected.department?.name ?? selected.departmentId?.name ?? "-"}</Tag>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Team:</b> {selected.team?.code ?? "-"} {" "}
            {selected.team?.name ? `(${selected.team.name})` : ""}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Khu vực", lang)}:</b>{" "}
            <Tag color="green">{selected.area?.code ?? selected.area?.name ?? "-"}</Tag>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Leader:</b> {selected.leader?.fullName ?? "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Trạng thái", lang)}:</b>{" "}
            <Tag color={selected.isActive ? "green" : "red"}>
              {selected.isActive ? t("Hoạt động", lang) : t("Đã khóa", lang)}
            </Tag>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>{t("Ngày tạo", lang)}:</b> {selected.createdAt}
          </Typography.Paragraph>
          {showBankFields &&
            (selected.bankName ||
              selected.bankAccountNumber ||
              selected.bankAccountHolder) && (
              <>
                <Typography.Paragraph>
                  <b>{t("Tài khoản ngân hàng", lang)}:</b>
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>{t("Ngân hàng", lang)}:</b> {selected.bankName || "-"}
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>{t("Số TK", lang)}:</b> {selected.bankAccountNumber || "-"}
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>{t("Chủ TK", lang)}:</b> {selected.bankAccountHolder || "-"}
                </Typography.Paragraph>
              </>
            )}
        </Space>
      ) : (
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={submit}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: mode === "create" }]}
          >
            <Input autoComplete="new-username" disabled={mode === "edit"} />
          </Form.Item>

          {mode === "create" && (
            <Form.Item
              name="password"
              label={t("Mật khẩu", lang)}
              rules={[{ required: true, min: 6 }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}

          <Form.Item name="fullName" label={t("Họ tên", lang)} rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label={t("Điện thoại", lang)}>
            <Input />
          </Form.Item>

          <Form.Item label="Avatar">
            <div className={styles.avatarRow}>
              <div className={styles.avatarPreview}>
                {displayAvatarUrl ? (
                  <img src={displayAvatarUrl} alt="Avatar" />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <span>{t("Chưa có avatar", lang)}</span>
                  </div>
                )}
              </div>
              <div className={styles.uploadActions}>
                {isUploading && (
                  <div className={styles.uploadProgress}>
                    <Progress percent={uploadProgress} size="small" status="active" />
                    <span>{t("Đang tải lên...", lang)}</span>
                  </div>
                )}
                <Button
                  icon={<UploadOutlined />}
                  onClick={handleUploadClick}
                  loading={isUploading}
                >
                  {displayAvatarUrl && !previewUrl ? t("Chọn ảnh mới", lang) : t("Tải lên avatar", lang)}
                </Button>
                <Typography.Text type="secondary" className={styles.uploadHint}>
                  JPG / PNG / WebP - {t("Tối đa 5MB", lang)}
                </Typography.Text>
              </div>
            </div>
          </Form.Item>

          <Form.Item name="avatar" hidden><Input /></Form.Item>

          <Form.Item name="roleCode" label="Role">
            <Select
              options={roleOptions}
              placeholder={t("Chọn role", lang)}
              disabled={locked.has("roleCode")}
            />
          </Form.Item>

          <Form.Item name="teamId" label="Team">
            <Select
              options={teamOptions}
              allowClear
              placeholder={t("Chọn team", lang)}
              disabled={locked.has("teamId")}
            />
          </Form.Item>

          <Form.Item name="departmentId" label={t("Phòng ban", lang)}>
            <Select
              options={departmentOptions}
              allowClear
              placeholder={t("Chọn phòng ban", lang)}
            />
          </Form.Item>

          <Form.Item name="areaId" label={t("Khu vực", lang)}>
            <Select
              options={areaOptions}
              allowClear
              placeholder={t("Chọn khu vực", lang)}
            />
          </Form.Item>

          <Form.Item name="leaderId" label="Leader">
            <Select
              options={leaderOptions}
              allowClear
              placeholder={t("Chọn leader", lang)}
              disabled={locked.has("leaderId")}
            />
          </Form.Item>

          {showBankFields && (
            <>
              <Divider plain style={{ margin: "16px 0 8px" }}>
                {t("Tài khoản ngân hàng", lang)}
              </Divider>
              <Form.Item name="bankName" label={t("Tên ngân hàng", lang)}>
                <Input />
              </Form.Item>
              <Form.Item name="bankAccountNumber" label={t("Số tài khoản", lang)}>
                <Input />
              </Form.Item>
              <Form.Item name="bankAccountHolder" label={t("Tên chủ tài khoản", lang)}>
                <Input />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={create.isPending || update.isPending}
            >
              {mode === "create" ? t("Tạo tài khoản", lang) : t("Lưu thay đổi", lang)}
            </Button>
          </Form.Item>
        </Form>
      )}

      <ImageSizeErrorModal
        open={sizeError !== null}
        onClose={() => setSizeError(null)}
        fileSizeMB={sizeError?.fileSizeMB}
      />
    </Drawer>
  );
}
