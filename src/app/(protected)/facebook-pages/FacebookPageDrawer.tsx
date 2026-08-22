/**
 * Facebook Page Drawer Component (Sprint 7.4)
 */

import { memo, useEffect, useMemo } from "react";
import { Drawer, Input, Select, Button, Space, Form, Switch, DatePicker, Image } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import api from "@/lib/axios";
import { toast } from "@/components/common/feedback/Toast";
import { useFacebookPage, useCreateFacebookPage, useUpdateFacebookPage, facebookPageKeys } from "@/hooks/useFacebookPages";
import type { CreateFacebookPageInput, UpdateFacebookPageInput } from "@/hooks/useFacebookPages";
import { useEmployees } from "@/hooks/useEmployees";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { TextArea } = Input;

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
  const lang = useLanguageStore((s) => s.language);
  const isEdit = mode === "edit";
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: t("Hoạt động", lang) },
      { value: "INACTIVE", label: t("Không hoạt động", lang) },
    ],
    [lang]
  );

  const currencyOptions = useMemo(
    () => [
      { value: "MNT", label: t("MNT - Tiền Mông Cổ (₮)", lang) },
      { value: "VND", label: t("VND - Việt Nam (₫)", lang) },
      { value: "USD", label: t("USD - Đô la Mỹ ($)", lang) },
    ],
    [lang]
  );

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
        avatarUrl: recordData.avatarUrl ?? "",
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
        toast.error(result.message || t("Không thể cập nhật nhân viên phụ trách", lang));
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
        t("Không thể cập nhật nhân viên phụ trách", lang);
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
        avatarUrl: values.avatarUrl as string | undefined,
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

            toast.success(t("Cập nhật thành công", lang));
            onSuccess?.();
            onClose();
          },
          onError: (err: Error) => {
            toast.error(err.message || t("Lỗi khi cập nhật", lang));
          },
        }
      );
    } else {
      const createData: CreateFacebookPageInput = {
        code: values.code as string,
        name: values.name as string,
        pageUrl: values.pageUrl as string | undefined,
        facebookPageId: values.facebookPageId as string | undefined,
        avatarUrl: values.avatarUrl as string | undefined,
        description: values.description as string | undefined,
        businessManager: values.businessManager as string | undefined,
        currency: values.currency as string | undefined,
        timezone: values.timezone as string | undefined,
        status: values.status as "ACTIVE" | "INACTIVE" | undefined,
        note: values.note as string | undefined,
      };
      createMutation.mutate(createData, {
        onSuccess: (page) => {
          toast.success(t("Tạo thành công", lang));
          onSuccess?.(page);
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message || t("Lỗi khi tạo", lang));
        },
      });
    }
  };

  return (
    <Drawer
      title={isEdit ? t("Sửa Facebook Page", lang) : t("Tạo Facebook Page", lang)}
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>{t("Hủy", lang)}</Button>
          <Button
            type="primary"
            onClick={() => form.validateFields().then(onSubmit).catch(() => {})}
            loading={isSubmitting}
          >
            {isSubmitting ? t("Đang lưu...", lang) : isEdit ? t("Cập nhật", lang) : t("Tạo mới", lang)}
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
          label={t("Mã Page", lang)}
          rules={[
            { required: true, message: t("Mã page là bắt buộc", lang) },
            { whitespace: true, message: t("Mã page không được để trắng", lang) },
          ]}
        >
          <Input
            placeholder={t("Nhập mã page (VD: PAGE_001)", lang)}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label={t("Tên Page", lang)}
          rules={[
            { required: true, message: t("Tên page là bắt buộc", lang) },
            { whitespace: true, message: t("Tên page không được để trắng", lang) },
          ]}
        >
          <Input placeholder={t("Nhập tên page", lang)} />
        </Form.Item>

        <Form.Item name="pageUrl" label={t("URL Page", lang)}>
          <Input placeholder="https://www.facebook.com/..." />
        </Form.Item>

        <Form.Item
          name="avatarUrl"
          label={t("Avatar URL", lang)}
          tooltip={t("Mở ảnh đại diện trên Facebook (đã đăng nhập) → Chuột phải → Mở hình ảnh trong tab mới → Copy URL và dán vào đây", lang)}
        >
          <Input placeholder={t("Dán URL avatar từ Facebook", lang)} />
        </Form.Item>

        <Form.Item name="facebookPageId" label={t("Facebook Page ID", lang)}>
          <Input placeholder="Facebook Page ID" />
        </Form.Item>

        <Form.Item name="businessManager" label={t("Business Manager ID", lang)}>
          <Input placeholder="Business Manager ID" />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item
            name="currency"
            label={t("Đơn vị tiền tệ", lang)}
            style={{ width: 200 }}
          >
            <Select
              options={currencyOptions}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="timezone"
            label={t("Múi giờ", lang)}
            style={{ flex: 1 }}
          >
            <Input placeholder="Asia/Ho_Chi_Minh" />
          </Form.Item>
        </Space>

        <Form.Item name="status" label={t("Trạng thái", lang)}>
          <Select options={statusOptions} style={{ width: "100%" }} />
        </Form.Item>

        {isEdit && (
          <>
            <Form.Item
              name="marketingEmployeeId"
              label={t("Nhân viên MKT phụ trách", lang)}
              tooltip={t("Chọn nhân viên MKT mới sẽ tự động đóng phân công hiện tại và bàn giao cho nhân viên mới từ ngày bắt đầu.", lang)}
            >
              <Select
                options={mktOptions}
                loading={isLoadingMkt}
                showSearch
                placeholder={isLoadingMkt ? t("Đang tải...", lang) : t("Chọn nhân viên MKT", lang)}
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="marketingStartDate"
              label={t("Ngày bắt đầu phụ trách", lang)}
              tooltip={t("Áp dụng khi chọn nhân viên MKT mới. Phân công hiện tại sẽ tự đóng vào ngày trước đó, phân công mới bắt đầu từ ngày này.", lang)}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder={t("Chọn ngày bắt đầu", lang)}
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="description" label={t("Mô tả", lang)}>
          <TextArea rows={3} placeholder={t("Mô tả page...", lang)} />
        </Form.Item>

        <Form.Item name="note" label={t("Ghi chú", lang)}>
          <TextArea rows={2} placeholder={t("Ghi chú...", lang)} />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isActive" label={t("Kích hoạt", lang)} valuePropName="checked">
            <Switch />
          </Form.Item>
        )}

        {isEdit && isLoadingRecord && (
          <div style={{ color: "#999" }}>{t("Đang tải dữ liệu page...", lang)}</div>
        )}
      </Form>
    </Drawer>
  );
}

const FacebookPageDrawer = memo(FacebookPageDrawerInner);
export default FacebookPageDrawer;