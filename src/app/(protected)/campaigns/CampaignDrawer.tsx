/**
 * Campaign Drawer Component (Sprint 7.4)
 */

import { memo, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer, Input, Select, DatePicker, Button, Space, Form } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import dayjs from "dayjs";
import { useCampaign, useCreateCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import type { SelectOption } from "@/components/common/inputs/AsyncSelect";

const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const formSchema = z.object({
  code: z.string().min(1, "Mã campaign là bắt buộc"),
  name: z.string().min(1, "Tên campaign là bắt buộc"),
  facebookPageId: z.string().min(1, "Facebook Page là bắt buộc"),
  objective: z.string().optional(),
  startDate: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  endDate: z.string().optional().nullable(),
  dailyBudget: z.number().optional(),
  lifetimeBudget: z.number().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface CampaignDrawerProps {
  mode: "create" | "edit";
  open: boolean;
  recordId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function CampaignDrawerInner({
  mode,
  open,
  recordId,
  onClose,
  onSuccess,
}: CampaignDrawerProps) {
  const message = useMessage();
  const isEdit = mode === "edit";

  const { data: recordData, isLoading: isLoadingRecord } = useCampaign(
    isEdit && recordId ? recordId : null
  );

  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [facebookPageOptions, setFacebookPageOptions] = useState<SelectOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      facebookPageId: "",
      objective: "",
      startDate: "",
      endDate: null,
      dailyBudget: 0,
      lifetimeBudget: 0,
      status: "ACTIVE",
      note: "",
    },
  });

  const loadFacebookPages = async (keyword: string) => {
    setLoadingPages(true);
    try {
      const params = new URLSearchParams({ pageSize: "100", isActive: "true" });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/facebook-pages?${params.toString()}`);
      const json = await res.json();
      
      if (json.success && json.data?.items) {
        setFacebookPageOptions(
          json.data.items.map((p: { _id: string; name: string }) => ({
            label: p.name,
            value: p._id,
          }))
        );
      }
    } catch {
      message.error("Lỗi khi tải danh sách Facebook Pages");
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFacebookPages("");
    }
  }, [open]);

  // Reset form when drawer opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      reset({
        code: "",
        name: "",
        facebookPageId: "",
        objective: "",
        startDate: "",
        endDate: null,
        dailyBudget: 0,
        lifetimeBudget: 0,
        status: "ACTIVE",
        note: "",
      });
      return;
    }

    if (isEdit && recordData) {
      const facebookPageIdValue = typeof recordData.facebookPageId === "object" 
        ? recordData.facebookPageId._id 
        : recordData.facebookPageId;
      
      reset({
        code: recordData.code,
        name: recordData.name,
        facebookPageId: facebookPageIdValue,
        objective: recordData.objective ?? "",
        startDate: recordData.startDate,
        endDate: recordData.endDate,
        dailyBudget: recordData.dailyBudget ?? 0,
        lifetimeBudget: recordData.lifetimeBudget ?? 0,
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
        onSuccess: () => {
          message.success("Tạo thành công");
          onSuccess?.();
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
      title={isEdit ? "Sửa Campaign" : "Tạo Campaign"}
      placement="right"
      styles={{ wrapper: { width: 500 } }}
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
          label="Mã Campaign"
          required
          validateStatus={errors.code ? "error" : ""}
          help={errors.code?.message}
        >
          <Input
            placeholder="Nhập mã campaign (VD: CAMP_001)"
            {...control.register("code")}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          label="Tên Campaign"
          required
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
        >
          <Input
            placeholder="Nhập tên campaign"
            {...control.register("name")}
          />
        </Form.Item>

        <Form.Item
          label="Facebook Page"
          required
          validateStatus={errors.facebookPageId ? "error" : ""}
          help={errors.facebookPageId?.message}
        >
          <Controller
            name="facebookPageId"
            control={control}
            render={({ field }) => (
              <AsyncSelect
                value={field.value}
                onChange={(val) => field.onChange(val as string)}
                options={facebookPageOptions}
                placeholder="Chọn Facebook Page"
                allowClear
                searchable
                onSearch={loadFacebookPages}
                loading={loadingPages}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Objective">
          <Input
            placeholder="VD: CONVERSIONS, TRAFFIC, LEAD_GENERATION"
            {...control.register("objective")}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item
            label="Ngày bắt đầu"
            required
            style={{ width: "calc(50% - 8px)" }}
          >
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toISOString() ?? "")}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Ngày kết thúc"
            style={{ width: "calc(50% - 8px)" }}
          >
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toISOString() ?? null)}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày (tùy chọn)"
                  allowClear
                />
              )}
            />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item label="Daily Budget" style={{ width: "calc(50% - 8px)" }}>
            <Input
              type="number"
              placeholder="0"
              {...control.register("dailyBudget", { valueAsNumber: true })}
            />
          </Form.Item>

          <Form.Item label="Lifetime Budget" style={{ width: "calc(50% - 8px)" }}>
            <Input
              type="number"
              placeholder="0"
              {...control.register("lifetimeBudget", { valueAsNumber: true })}
            />
          </Form.Item>
        </Space>

        <Form.Item label="Trạng thái">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={STATUS_OPTIONS}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú">
          <TextArea
            rows={3}
            placeholder="Ghi chú..."
            {...control.register("note")}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

const CampaignDrawer = memo(CampaignDrawerInner);
export default CampaignDrawer;
