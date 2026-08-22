"use client";

import { useEffect, useState, useMemo } from "react";
import { Form, Input, Radio, Select, Switch, Tag } from "antd";
import { PushpinOutlined, UserOutlined, TeamOutlined, CheckCircleFilled } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { NotificationAdminItem } from "@/hooks/useNotificationsAdmin";
import {
  RecipientSelector,
  type RecipientValue,
} from "@/components/settings/NotificationManagement/RecipientSelector";
import type {
  CreateNotificationInput,
  UpdateNotificationInput,
} from "@/types/notification";
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_VALUES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_VALUES,
} from "@/constants/notification";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface NotificationFormDrawerProps {
  open: boolean;
  initial: NotificationAdminItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateNotificationInput | UpdateNotificationInput) => void;
}

export default function NotificationFormDrawer({
  open,
  initial,
  submitting,
  onClose,
  onSubmit,
}: NotificationFormDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm();
  const isEditing = !!initial;
  const [recipientValue, setRecipientValue] = useState<RecipientValue | undefined>();

  const TYPE_OPTIONS = useMemo(
    () =>
      NOTIFICATION_TYPE_VALUES.map((type) => ({
        label: (
          <span>
            <Tag color={type === "error" ? "red" : type === "warning" ? "orange" : type === "success" ? "green" : "blue"}>
              {t(NOTIFICATION_TYPE_LABELS[type], lang)}
            </Tag>
          </span>
        ),
        value: type,
      })),
    [lang]
  );

  const CATEGORY_OPTIONS = useMemo(
    () =>
      NOTIFICATION_CATEGORY_VALUES.map((c) => ({
        label: t(NOTIFICATION_CATEGORY_LABELS[c], lang),
        value: c,
      })),
    [lang]
  );

  const PRIORITY_OPTIONS = useMemo(
    () =>
      NOTIFICATION_PRIORITY_VALUES.map((p) => ({
        label: t(NOTIFICATION_PRIORITY_LABELS[p], lang),
        value: p,
      })),
    [lang]
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      // Parse existing recipients if any
      const hasSpecificRecipients = initial.recipientsCount > 0;
      const initialRecipientValue: RecipientValue = {
        mode: hasSpecificRecipients ? "individual" : "broadcast",
        recipientIds: [],
      };
      setRecipientValue(initialRecipientValue);

      form.setFieldsValue({
        title: initial.title,
        message: initial.message,
        type: initial.type,
        category: initial.category,
        priority: initial.priority,
        isPinned: initial.isPinned,
        link: initial.link,
        recipientMode: hasSpecificRecipients ? "specific" : "broadcast",
        isActive: initial.isActive,
      });
    } else {
      form.resetFields();
      setRecipientValue(undefined);
      form.setFieldsValue({
        type: NotificationType.INFO,
        category: NotificationCategory.GENERAL,
        priority: NotificationPriority.NORMAL,
        isPinned: false,
        recipientMode: "broadcast",
        isActive: true,
      });
    }
  }, [open, initial, form]);

  const handleRecipientModeChange = (mode: string) => {
    const recipientMode: RecipientValue["mode"] =
      mode === "broadcast" ? "broadcast" : "individual";
    setRecipientValue({ mode: recipientMode, recipientIds: [] });
  };

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      const isBroadcast = values.recipientMode === "broadcast";

      // Get recipient IDs and filters from RecipientSelector
      const recipientIds = isBroadcast
        ? []
        : recipientValue?.recipientIds ?? [];
      const teamIds = recipientValue?.teamIds;
      const leaderIds = recipientValue?.leaderIds;
      const roleFilters = recipientValue?.roleFilters;

      if (isEditing) {
        const payload: UpdateNotificationInput = {
          title: values.title,
          message: values.message,
          type: values.type,
          category: values.category,
          priority: values.priority,
          isPinned: values.isPinned,
          link: values.link || null,
          broadcast: isBroadcast,
          recipientIds,
          teamIds,
          leaderIds,
          roleFilters,
          isActive: values.isActive,
        };
        onSubmit(payload);
      } else {
        const payload: CreateNotificationInput = {
          title: values.title,
          message: values.message,
          type: values.type,
          category: values.category,
          priority: values.priority,
          isPinned: values.isPinned,
          link: values.link || null,
          broadcast: isBroadcast,
          recipientIds,
          teamIds,
          leaderIds,
          roleFilters,
        };
        onSubmit(payload);
      }
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? t("Sửa thông báo", lang) : t("Tạo thông báo", lang)}
      loading={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? t("Cập nhật", lang) : t("Tạo", lang)}
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label={t("Tiêu đề", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tiêu đề", lang) },
            { max: 200, message: t("Tiêu đề tối đa 200 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: Bảo trì hệ thống 22:00", lang)} maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          name="message"
          label={t("Nội dung", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập nội dung", lang) },
            { max: 1000, message: t("Nội dung tối đa 1000 ký tự", lang) },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t("Mô tả chi tiết...", lang)}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item name="type" label={t("Loại", lang)}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item name="category" label={t("Danh mục", lang)}>
          <Select options={CATEGORY_OPTIONS} />
        </Form.Item>

        <Form.Item name="priority" label={t("Mức độ ưu tiên", lang)}>
          <Select options={PRIORITY_OPTIONS} />
        </Form.Item>

        <Form.Item name="link" label={t("Link liên quan (tùy chọn)", lang)}>
          <Input placeholder={t("VD: /orders hoặc /products", lang)} />
        </Form.Item>

        <Form.Item name="isPinned" label={t("Ghim lên đầu", lang)} valuePropName="checked" tooltip={t("Thông báo được ghim sẽ hiển thị trước các thông báo khác", lang)}>
          <Switch checkedChildren={<PushpinOutlined />} unCheckedChildren={null} />
        </Form.Item>

        {/* Recipient Selection */}
        <Form.Item name="recipientMode" label={t("Người nhận", lang)} valuePropName="value">
          <Radio.Group onChange={(e) => handleRecipientModeChange(e.target.value)}>
            <Radio.Button value="broadcast">
              <UserOutlined /> {t("Tất cả", lang)}
            </Radio.Button>
            <Radio.Button value="specific">
              <TeamOutlined /> {t("Cụ thể", lang)}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.recipientMode !== curr.recipientMode}
        >
          {({ getFieldValue }) =>
            getFieldValue("recipientMode") === "specific" ? (
              <Form.Item label={t("Chọn người nhận", lang)}>
                <RecipientSelector
                  value={recipientValue}
                  onChange={setRecipientValue}
                  disabled={submitting}
                />
              </Form.Item>
            ) : (
              <div style={{ padding: "8px 0", color: "#52c41a" }}>
                <CheckCircleFilled /> {t("Thông báo sẽ được gửi đến TẤT CẢ nhân viên", lang)}
              </div>
            )
          }
        </Form.Item>

        {isEditing && (
          <Form.Item
            name="isActive"
            label={t("Đang hoạt động", lang)}
            valuePropName="checked"
            initialValue={true}
            tooltip={t("Tắt để ẩn thông báo khỏi danh sách", lang)}
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}