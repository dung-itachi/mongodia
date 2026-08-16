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

import { useEffect, useMemo } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  type Account,
  type AccountInput,
  useCreateAccount,
  useUpdateAccount,
} from "@/hooks/useAccounts";

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

  /** Called after a successful create/update. */
  onSuccess?: () => void;

  /** Hide fields that aren't relevant (e.g. bank fields when not needed). */
  showBankFields?: boolean;
};

type FormValues = AccountInput & { departmentCode?: string };

export default function AccountCreateDrawer({
  open,
  onClose,
  mode = "create",
  selected = null,
  defaultValues,
  lockedFields,
  roleOptions,
  teamOptions,
  leaderOptions,
  onSuccess,
  showBankFields = true,
}: AccountCreateDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const create = useCreateAccount();
  const update = useUpdateAccount();

  const locked = useMemo(() => new Set(lockedFields ?? []), [lockedFields]);

  // Reset form whenever the drawer opens or the inputs change.
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      form.resetFields();
      form.setFieldsValue({
        roleCode: defaultValues?.roleCode ?? "EMPLOYEE",
        teamId: defaultValues?.teamId ?? undefined,
        leaderId: defaultValues?.leaderId ?? undefined,
      });
    } else if (selected) {
      form.setFieldsValue({
        ...selected,
        roleCode: selected.role?.code,
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
          avatar: values.avatar,
          roleCode: values.roleCode,
          teamId: values.teamId ?? null,
          leaderId: values.leaderId ?? null,
          bankName: values.bankName,
          bankAccountNumber: values.bankAccountNumber,
          bankAccountHolder: values.bankAccountHolder,
        },
        {
          onSuccess: () => {
            form.resetFields();
            onSuccess?.();
            onClose();
          },
        }
      );
    } else if (selected) {
      update.mutate(
        {
          id: selected._id,
          input: {
            username: values.username,
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            avatar: values.avatar,
            roleCode: values.roleCode,
            teamId: values.teamId ?? null,
            leaderId: values.leaderId ?? null,
            bankName: values.bankName,
            bankAccountNumber: values.bankAccountNumber,
            bankAccountHolder: values.bankAccountHolder,
          },
        },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
        }
      );
    }
  };

  const title =
    mode === "create"
      ? "Tạo tài khoản"
      : mode === "edit"
        ? "Cập nhật tài khoản"
        : "Chi tiết tài khoản";

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      size={520}
    >
      {mode === "view" && selected ? (
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <Typography.Paragraph>
            <b>Mã NV:</b> {selected.employeeCode}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Username:</b> {selected.username}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Họ tên:</b> {selected.fullName}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Email:</b> {selected.email || "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Phone:</b> {selected.phone || "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Role:</b>{" "}
            <Tag color="blue">{selected.role?.code ?? "-"}</Tag> (
            {selected.role?.name ?? "-"})
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Department:</b>{" "}
            <Tag color="purple">{selected.department?.name ?? "-"}</Tag>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Team:</b> {selected.team?.code ?? "-"}{" "}
            {selected.team?.name ? `(${selected.team.name})` : ""}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Leader:</b> {selected.leader?.fullName ?? "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Trạng thái:</b>{" "}
            <Tag color={selected.isActive ? "green" : "red"}>
              {selected.isActive ? "Hoạt động" : "Đã khóa"}
            </Tag>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Ngày tạo:</b> {selected.createdAt}
          </Typography.Paragraph>
          {showBankFields &&
            (selected.bankName ||
              selected.bankAccountNumber ||
              selected.bankAccountHolder) && (
              <>
                <Typography.Paragraph>
                  <b>Tài khoản ngân hàng:</b>
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>Ngân hàng:</b> {selected.bankName || "-"}
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>Số TK:</b> {selected.bankAccountNumber || "-"}
                </Typography.Paragraph>
                <Typography.Paragraph style={{ paddingLeft: 16 }}>
                  <b>Chủ TK:</b> {selected.bankAccountHolder || "-"}
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
              label="Mật khẩu"
              rules={[{ required: true, min: 6 }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}

          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>

          <Form.Item name="roleCode" label="Role">
            <Select
              options={roleOptions}
              placeholder="Chọn role"
              disabled={locked.has("roleCode")}
            />
          </Form.Item>

          <Form.Item name="teamId" label="Team">
            <Select
              options={teamOptions}
              allowClear
              placeholder="Chọn team"
              disabled={locked.has("teamId")}
            />
          </Form.Item>

          <Form.Item name="leaderId" label="Leader">
            <Select
              options={leaderOptions}
              allowClear
              placeholder="Chọn leader"
              disabled={locked.has("leaderId")}
            />
          </Form.Item>

          {showBankFields && (
            <>
              <Divider plain style={{ margin: "16px 0 8px" }}>
                Tài khoản ngân hàng
              </Divider>
              <Form.Item name="bankName" label="Tên ngân hàng">
                <Input />
              </Form.Item>
              <Form.Item name="bankAccountNumber" label="Số tài khoản">
                <Input />
              </Form.Item>
              <Form.Item name="bankAccountHolder" label="Tên chủ tài khoản">
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
              {mode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
            </Button>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
