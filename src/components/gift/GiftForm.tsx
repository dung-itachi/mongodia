/**
 * Gift Form Component (Sprint 8.x - Gift Management)
 */

"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  GiftListItem,
  CreateGiftInput,
  UpdateGiftInput,
} from "@/hooks/useGifts";

interface GiftFormProps {
  open: boolean;
  editingItem?: GiftListItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateGiftInput | UpdateGiftInput) => void;
}

export default function GiftForm({
  open,
  editingItem,
  loading,
  onClose,
  onSubmit,
}: GiftFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateGiftInput | UpdateGiftInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa quà tặng" : "Thêm quà tặng"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editingItem
            ? {
                name: editingItem.name,
                stockQuantity: editingItem.stockQuantity,
                isActive: editingItem.isActive,
              }
            : {
                stockQuantity: 0,
                isActive: true,
              }
        }
      >
        <Form.Item
          name="name"
          label="Tên quà"
          rules={[
            { required: true, message: "Vui lòng nhập tên quà" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 100, message: "Tên tối đa 100 ký tự" },
          ]}
        >
          <Input placeholder="VD: Dầu gội, Khăn mặt" />
        </Form.Item>

        <Form.Item
          name="stockQuantity"
          label="Số lượng tồn kho"
          rules={[
            { required: true, message: "Vui lòng nhập số lượng tồn kho" },
          ]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            placeholder="0"
          />
        </Form.Item>

        {isEditing && (
          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}
