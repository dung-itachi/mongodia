"use client";

import { useEffect } from "react";
import { Form, Input, Radio, Select, Switch, Tag } from "antd";
import { PushpinOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { NotificationAdminItem } from "@/hooks/useNotificationsAdmin";
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

interface NotificationFormDrawerProps {
  open: boolean;
  initial: NotificationAdminItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateNotificationInput | UpdateNotificationInput) => void;
}

const TYPE_OPTIONS = NOTIFICATION_TYPE_VALUES.map((t) => ({
  label: (
    <span>
      <Tag color={t === "error" ? "red" : t === "warning" ? "orange" : t === "success" ? "green" : "blue"}>
        {NOTIFICATION_TYPE_LABELS[t]}
      </Tag>
    </span>
  ),
  value: t,
}));

const CATEGORY_OPTIONS = NOTIFICATION_CATEGORY_VALUES.map((c) => ({
  label: NOTIFICATION_CATEGORY_LABELS[c],
  value: c,
}));

const PRIORITY_OPTIONS = NOTIFICATION_PRIORITY_VALUES.map((p) => ({
  label: NOTIFICATION_PRIORITY_LABELS[p],
  value: p,
}));

export default function NotificationFormDrawer({
  open,
  initial,
  submitting,
  onClose,
  onSubmit,
}: NotificationFormDrawerProps) {
  const [form] = Form.useForm();
  const isEditing = !!initial;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.setFieldsValue({
        title: initial.title,
        message: initial.message,
        type: initial.type,
        category: initial.category,
        priority: initial.priority,
        isPinned: initial.isPinned,
        link: initial.link,
        recipientMode: initial.recipientsCount === 0 ? "broadcast" : "specific",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: NotificationType.INFO,
        category: NotificationCategory.GENERAL,
        priority: NotificationPriority.NORMAL,
        isPinned: false,
        recipientMode: "broadcast",
      });
    }
  }, [open, initial, form]);

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      const broadcast = values.recipientMode === "broadcast";
      if (isEditing) {
        // Edit mode — full UpdateNotificationInput shape.
        const payload: UpdateNotificationInput = {
          title: values.title,
          message: values.message,
          type: values.type,
          category: values.category,
          priority: values.priority,
          isPinned: values.isPinned,
          link: values.link || null,
          broadcast,
          recipientIds: broadcast ? undefined : values.recipientIds,
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
          broadcast,
          recipientIds: broadcast ? undefined : values.recipientIds,
        };
        onSubmit(payload);
      }
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa thông báo" : "Tạo thông báo"}
      loading={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo"}
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[
            { required: true, message: "Vui lòng nhập tiêu đề" },
            { max: 200, message: "Tiêu đề tối đa 200 ký tự" },
          ]}
        >
          <Input placeholder="VD: Bảo trì hệ thống 22:00" maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          name="message"
          label="Nội dung"
          rules={[
            { required: true, message: "Vui lòng nhập nội dung" },
            { max: 1000, message: "Nội dung tối đa 1000 ký tự" },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Mô tả chi tiết..."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item name="type" label="Loại">
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item name="category" label="Danh mục">
          <Select options={CATEGORY_OPTIONS} />
        </Form.Item>

        <Form.Item name="priority" label="Mức độ ưu tiên">
          <Select options={PRIORITY_OPTIONS} />
        </Form.Item>

        <Form.Item name="link" label="Link liên quan (tùy chọn)">
          <Input placeholder="VD: /orders hoặc /products" />
        </Form.Item>

        <Form.Item
          name="isPinned"
          label="Ghim lên đầu"
          valuePropName="checked"
          tooltip="Thông báo được ghim sẽ hiển thị trước các thông báo khác"
        >
          <Switch checkedChildren={<PushpinOutlined />} unCheckedChildren={null} />
        </Form.Item>

        <Form.Item name="recipientMode" label="Người nhận">
          <Radio.Group>
            <Radio.Button value="broadcast">Tất cả</Radio.Button>
            <Radio.Button value="specific">Cụ thể (sẽ cấu hình sau)</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) =>
            prev.recipientMode !== curr.recipientMode
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("recipientMode") === "specific" ? (
              <Form.Item
                name="recipientIds"
                label="Danh sách ID người nhận"
                tooltip="Dán danh sách _id của Employee, phân cách bằng dấu phẩy. Tính năng chọn user sẽ được bổ sung sau."
                rules={[
                  {
                    validator: async (_rule, value) => {
                      if (!value) return;
                      if (!Array.isArray(value)) {
                        throw new Error("Cần mảng ID");
                      }
                      for (const v of value) {
                        if (typeof v !== "string" || v.trim().length < 1) {
                          throw new Error("Mỗi ID phải là chuỗi hợp lệ");
                        }
                      }
                    },
                  },
                ]}
              >
                <Select
                  mode="tags"
                  placeholder="Dán ID, Enter để thêm"
                  tokenSeparators={[","]}
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        {isEditing && (
          <Form.Item
            name="isActive"
            label="Đang hoạt động"
            valuePropName="checked"
            initialValue={true}
            tooltip="Tắt để ẩn thông báo khỏi danh sách"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}
