/**
 * Facebook Page Drawer Component (Sprint 7.4)
 */

import { memo, useEffect, useMemo } from "react";
import { Drawer, Input, Select, Button, Space, Form, Switch, DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import api from "@/lib/axios";
import { toast } from "@/components/common/feedback/Toast";
import { useFacebookPage, useCreateFacebookPage, useUpdateFacebookPage, facebookPageKeys } from "@/hooks/useFacebookPages";
import type { CreateFacebookPageInput, UpdateFacebookPageInput } from "@/hooks/useFacebookPages";
import { useEmployees } from "@/hooks/useEmployees";
import { useQueryClient } from "@tanstack/react-query";

const { TextArea } = Input;

const FACEBOOK_PAGE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Không hoạt động" },
];

const CURRENCY_OPTIONS = [
  { value: "MNT", label: "MNT - Tiền Mông Cổ (₮)" },
  { value: "VND", label: "VND - Việt Nam (₫)" },
  { value: "USD", label: "USD - Đô la Mỹ ($)" },
];

const DEFAULT_CURRENCY = "MNT";
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

type AssignmentApiResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
};

async function createAssignment(input: {
  facebookPageId: string;
  marketingEmployeeId: string;
  startDate: string;
  endDate?: string | null;
  note?: string;
}): Promise<AssignmentApiResponse> {
  const { data } = await api.post<AssignmentApiResponse>("/api/facebook-page-assignments", input);
  return data;
}

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
  const queryClient = useQueryClient();

  const { data: recordData, isLoading: isLoadingRecord } = useFacebookPage(
    isEdit && recordId ? recordId : null
  );

  // Danh sách nhân viên MKT đang hoạt động
  const { data: mktEmployees = [], isLoading: isLoadingMkt } = useEmployees({
    role: "MKT",
    isActive: true,
    pageSize: 100,
  });

  const mktOptions = useMemo(
    () =>
      mktEmployees.map((emp) => ({
        value: emp._id,
        label: `${emp.employeeCode} - ${emp.fullName}`,
      })),
    [mktEmployees]
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
      const currentAssignment = recordData.currentAssignment;
      form.setFieldsValue({
        code: recordData.code,
        name: recordData.name,
        pageUrl: recordData.pageUrl ?? "",
        facebookPageId: recordData.facebookPageId ?? "",
        description: recordData.description ?? "",
        businessManager: recordData.businessManager ?? "",
        currency: recordData.currency ?? DEFAULT_CURRENCY,
        timezone: recordData.timezone ?? DEFAULT_TIMEZONE,
        status: recordData.status,
        note: recordData.note ?? "",
        isActive: recordData.isActive,
        marketingEmployeeId: currentAssignment?.marketingEmployeeId ?? null,
        marketingStartDate: currentAssignment?.startDate
          ? dayjs(currentAssignment.startDate)
          : dayjs(),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        currency: DEFAULT_CURRENCY,
        timezone: DEFAULT_TIMEZONE,
        status: "ACTIVE",
        marketingStartDate: dayjs(),
      });
    }
  }, [open, isEdit, recordData, form]);

  const submitAssignmentChange = async (params: {
    facebookPageId: string;
    newEmployeeId: string;
    currentEmployeeId: string | null;
    startDate: Dayjs;
  }): Promise<boolean> => {
    if (params.newEmployeeId === params.currentEmployeeId) return true;

    try {
      const startOfDay = params.startDate.startOf("day").toISOString();
      const result = await createAssignment({
        facebookPageId: params.facebookPageId,
        marketingEmployeeId: params.newEmployeeId,
        startDate: startOfDay,
        endDate: null,
      });

      if (!result.success) {
        toast.error(result.message || "Không thể cập nhật nhân viên phụ trách");
        return false;
      }

      // Invalidate cache của page detail & list để drawer + table hiển thị MKT mới
      void queryClient.invalidateQueries({
        queryKey: facebookPageKeys.detail(params.facebookPageId),
      });
      void queryClient.invalidateQueries({
        queryKey: facebookPageKeys.lists(),
      });

      return true;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        "Không thể cập nhật nhân viên phụ trách";
      toast.error(message);
      return false;
    }
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    if (isEdit && recordId) {
      const currentAssignment = recordData?.currentAssignment;
      const newEmployeeId = values.marketingEmployeeId as string | undefined;
      const startDate = (values.marketingStartDate as Dayjs | undefined) ?? dayjs();

      const updateData: UpdateFacebookPageInput = {
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
        isActive: values.isActive as boolean | undefined,
      };

      updateMutation.mutate(
        { id: recordId, data: updateData },
        {
          onSuccess: async () => {
            // Update assignment nếu có thay đổi nhân viên phụ trách
            if (newEmployeeId) {
              const ok = await submitAssignmentChange({
                facebookPageId: recordId,
                newEmployeeId,
                currentEmployeeId: currentAssignment?.marketingEmployeeId ?? null,
                startDate,
              });
              if (!ok) return;
            }

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

        <Form.Item name="businessManager" label="Business Manager ID">
          <Input placeholder="Business Manager ID" />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item
            name="currency"
            label="Đơn vị tiền tệ"
            style={{ width: 200 }}
          >
            <Select
              options={CURRENCY_OPTIONS}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="timezone"
            label="Múi giờ"
            style={{ flex: 1 }}
          >
            <Input placeholder="Asia/Ho_Chi_Minh" />
          </Form.Item>
        </Space>

        <Form.Item name="status" label="Trạng thái">
          <Select options={FACEBOOK_PAGE_STATUS_OPTIONS} style={{ width: "100%" }} />
        </Form.Item>

        {isEdit && (
          <>
            <Form.Item
              name="marketingEmployeeId"
              label="Nhân viên MKT phụ trách"
              tooltip="Chọn nhân viên MKT mới sẽ tự động đóng phân công hiện tại và bàn giao cho nhân viên mới từ ngày bắt đầu."
            >
              <Select
                options={mktOptions}
                loading={isLoadingMkt}
                showSearch
                placeholder={isLoadingMkt ? "Đang tải..." : "Chọn nhân viên MKT"}
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="marketingStartDate"
              label="Ngày bắt đầu phụ trách"
              tooltip="Áp dụng khi chọn nhân viên MKT mới. Phân công hiện tại sẽ tự đóng vào ngày trước đó, phân công mới bắt đầu từ ngày này."
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày bắt đầu"
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả page..." />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={2} placeholder="Ghi chú..." />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}

        {isEdit && isLoadingRecord && (
          <div style={{ color: "#999" }}>Đang tải dữ liệu page...</div>
        )}
      </Form>
    </Drawer>
  );
}

const FacebookPageDrawer = memo(FacebookPageDrawerInner);
export default FacebookPageDrawer;
