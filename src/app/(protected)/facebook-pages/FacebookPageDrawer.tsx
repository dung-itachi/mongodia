/**
 * Facebook Page Drawer Component (Sprint 7.4)
 */

import { memo, useEffect } from "react";
import { Drawer, Input, Select, Button, Space, Form } from "antd";
import { toast } from "@/components/common/feedback/Toast";
import { useFacebookPage, useCreateFacebookPage, useUpdateFacebookPage } from "@/hooks/useFacebookPages";
import type { CreateFacebookPageInput, UpdateFacebookPageInput } from "@/hooks/useFacebookPages";

const { TextArea } = Input;

const FACEBOOK_PAGE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Không hoạt động" },
];

const CURRENCY_OPTIONS = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
];

export interface FacebookPageDrawerProps {
  mode: "create" | "edit";
  open: boolean;
  recordId?: string | null;
  onClose: () => void;
  onSuccess?: (page?: { _id: string; code: string; name: string }) => void;
}

function FacebookPageDrawerInner({
  mode,
  open,
  recordId,
  onClose,
  onSuccess,
}: FacebookPageDrawerProps) {
  const isEdit = mode === "edit";
  const [form] = Form.useForm();

  const { data: recordData, isLoading: isLoadingRecord } = useFacebookPage(
    isEdit && recordId ? recordId : null
  );

  const createMutation = useCreateFacebookPage();
  const updateMutation = useUpdateFacebookPage();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Reset form when drawer opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (isEdit && recordData) {
      form.setFieldsValue({
        code: recordData.code,
        name: recordData.name,
        pageUrl: recordData.pageUrl ?? "",
        facebookPageId: recordData.facebookPageId ?? "",
        description: recordData.description ?? "",
        businessManager: recordData.businessManager ?? "",
        currency: recordData.currency ?? "VND",
        timezone: recordData.timezone ?? "Asia/Ho_Chi_Minh",
        status: recordData.status,
        note: recordData.note ?? "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        status: "ACTIVE",
      });
    }
  }, [open, isEdit, recordData, form]);

  const onSubmit = (values: Record<string, unknown>) => {
    if (isEdit && recordId) {
      const updateData: UpdateFacebookPageInput = {
        ...values,
      } as UpdateFacebookPageInput;
      updateMutation.mutate(
        { id: recordId, data: updateData },
        {
          onSuccess: () => {
            toast.success("Cập nhật thành công");
            onSuccess?.();
            onClose();
          },
          onError: (err: Error) => {
            toast.error(err.message || "Lỗi khi cập nhật");
          },
        }
      );
    } else {
      const createData: CreateFacebookPageInput = {
        code: values.code as string,
        name: values.name as string,
        pageUrl: values.pageUrl as string | undefined,
        facebookPageId: values.facebookPageId as string | undefined,
        description: values.description as string | undefined,
        businessManager: values.businessManager as string | undefined,
        currency: values.currency as string | undefined,
        timezone: values.timezone as string | undefined,
        status: values.status as "ACTIVE" | "INACTIVE" | undefined,
        note: values.note as string | undefined,
      };
      createMutation.mutate(createData, {
        onSuccess: (page) => {
          toast.success("Tạo thành công");
          onSuccess?.(page);
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message || "Lỗi khi tạo");
        },
      });
    }
  };

  return (
    <Drawer
      title={isEdit ? "Sửa Facebook Page" : "Tạo Facebook Page"}
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            onClick={() => form.validateFields().then(onSubmit).catch(() => {})}
            loading={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        key={open ? "open" : "closed"}
      >
        <Form.Item
          name="code"
          label="Mã Page"
          rules={[
            { required: true, message: "Mã page là bắt buộc" },
            { whitespace: true, message: "Mã page không được để trắng" },
          ]}
        >
          <Input
            placeholder="Nhập mã page (VD: PAGE_001)"
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên Page"
          rules={[
            { required: true, message: "Tên page là bắt buộc" },
            { whitespace: true, message: "Tên page không được để trắng" },
          ]}
        >
          <Input placeholder="Nhập tên page" />
        </Form.Item>

        <Form.Item name="pageUrl" label="URL Page">
          <Input placeholder="https://www.facebook.com/..." />
        </Form.Item>

        <Form.Item name="facebookPageId" label="Facebook Page ID">
          <Input placeholder="Facebook Page ID" />
        </Form.Item>

        <Form.Item name="businessManager" label="Business Manager">
          <Input placeholder="Business Manager ID" />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item name="currency" label="Currency" style={{ width: 120 }}>
            <Select
              options={CURRENCY_OPTIONS}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item name="timezone" label="Timezone" style={{ flex: 1 }}>
            <Input placeholder="Asia/Ho_Chi_Minh" />
          </Form.Item>
        </Space>

        <Form.Item name="status" label="Trạng thái">
          <Select options={FACEBOOK_PAGE_STATUS_OPTIONS} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả page..." />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={2} placeholder="Ghi chú..." />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

const FacebookPageDrawer = memo(FacebookPageDrawerInner);
export default FacebookPageDrawer;
