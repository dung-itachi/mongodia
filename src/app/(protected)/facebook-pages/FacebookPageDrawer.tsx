/**
 * Facebook Page Drawer Component (Sprint 7.4)
 */

import { memo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer, Input, Select, Button, Space, Form, message } from "antd";
import { useFacebookPage, useCreateFacebookPage, useUpdateFacebookPage } from "@/hooks/useFacebookPages";

const { TextArea } = Input;

const FACEBOOK_PAGE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Không hoạt động" },
];

const CURRENCY_OPTIONS = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
];

const formSchema = z.object({
  code: z.string().min(1, "Mã page là bắt buộc"),
  name: z.string().min(1, "Tên page là bắt buộc"),
  pageUrl: z.string().optional(),
  facebookPageId: z.string().optional(),
  description: z.string().optional(),
  businessManager: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

  const { data: recordData, isLoading: isLoadingRecord } = useFacebookPage(
    isEdit && recordId ? recordId : null
  );

  const createMutation = useCreateFacebookPage();
  const updateMutation = useUpdateFacebookPage();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      pageUrl: "",
      facebookPageId: "",
      description: "",
      businessManager: "",
      currency: "VND",
      timezone: "Asia/Ho_Chi_Minh",
      status: "ACTIVE",
      note: "",
    },
  });

  // Reset form when drawer opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      reset({
        code: "",
        name: "",
        pageUrl: "",
        facebookPageId: "",
        description: "",
        businessManager: "",
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        status: "ACTIVE",
        note: "",
      });
      return;
    }

    if (isEdit && recordData) {
      reset({
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
    }
  }, [open, isEdit, recordData, reset]);

  const onSubmit = (data: FormData) => {
    if (isEdit && recordId) {
      updateMutation.mutate(
        { id: recordId, data },
        {
          onSuccess: () => {
            message.success("Cập nhật thành công");
            onSuccess?.();
            onClose();
          },
          onError: (err: Error) => {
            message.error(err.message || "Lỗi khi cập nhật");
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: (page) => {
          message.success("Tạo thành công");
          onSuccess?.(page);
          onClose();
        },
        onError: (err: Error) => {
          message.error(err.message || "Lỗi khi tạo");
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
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item
          label="Mã Page"
          required
          validateStatus={errors.code ? "error" : ""}
          help={errors.code?.message}
        >
          <Input
            placeholder="Nhập mã page (VD: PAGE_001)"
            {...register("code")}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          label="Tên Page"
          required
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
        >
          <Input
            placeholder="Nhập tên page"
            {...register("name")}
          />
        </Form.Item>

        <Form.Item label="URL Page">
          <Input
            placeholder="https://www.facebook.com/..."
            {...register("pageUrl")}
          />
        </Form.Item>

        <Form.Item label="Facebook Page ID">
          <Input
            placeholder="Facebook Page ID"
            {...register("facebookPageId")}
          />
        </Form.Item>

        <Form.Item label="Business Manager">
          <Input
            placeholder="Business Manager ID"
            {...register("businessManager")}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item label="Currency" style={{ width: 120 }}>
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select
                  options={CURRENCY_OPTIONS}
                  value={field.value ?? "VND"}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  style={{ width: "100%" }}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="Timezone" style={{ flex: 1 }}>
            <Input
              placeholder="Asia/Ho_Chi_Minh"
              {...register("timezone")}
            />
          </Form.Item>
        </Space>

        <Form.Item label="Trạng thái">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                options={FACEBOOK_PAGE_STATUS_OPTIONS}
                value={field.value ?? "ACTIVE"}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Mô tả">
          <TextArea
            rows={3}
            placeholder="Mô tả page..."
            {...register("description")}
          />
        </Form.Item>

        <Form.Item label="Ghi chú">
          <TextArea
            rows={2}
            placeholder="Ghi chú..."
            {...register("note")}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

const FacebookPageDrawer = memo(FacebookPageDrawerInner);
export default FacebookPageDrawer;
