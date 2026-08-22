/**
 * Gift Form Component (Sprint 8.x - Gift Management)
 */

"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
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
  const lang = useLanguageStore((s) => s.language);
  const isEditing = !!editingItem;

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateGiftInput | UpdateGiftInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? t("Sửa quà tặng", lang) : t("Thêm quà tặng", lang)}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? t("Cập nhật", lang) : t("Tạo mới", lang)}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editingItem
            ? {
                name: editingItem.name,
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
          label={t("Tên quà", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tên quà", lang) },
            { min: 2, message: t("Tên tối thiểu 2 ký tự", lang) },
            { max: 100, message: t("Tên tối đa 100 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: Dầu gội, Khăn mặt", lang)} />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="stockQuantity"
            label={t("Tồn kho ban đầu", lang)}
            rules={[
              { required: true, message: t("Vui lòng nhập tồn kho ban đầu", lang) },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
        )}

        {isEditing && (
          <Form.Item
            name="isActive"
            label={t("Trạng thái", lang)}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}
