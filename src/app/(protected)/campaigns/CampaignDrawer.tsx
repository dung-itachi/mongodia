/**
 * Campaign Drawer Component (Sprint 7.4)
 */

import { memo, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer, Input, Select, DatePicker, Button, Space, Form } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import dayjs from "dayjs";
import { useCampaign, useCreateCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import type { SelectOption } from "@/components/common/inputs/AsyncSelect";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { TextArea } = Input;

function buildFormSchema(lang: ReturnType<typeof useLanguageStore.getState>["language"]) {
  return z.object({
    code: z.string().min(1, t("Mã campaign là bắt buộc", lang)),
    name: z.string().min(1, t("Tên campaign là bắt buộc", lang)),
    facebookPageId: z.string().min(1, t("Facebook Page là bắt buộc", lang)),
    objective: z.string().optional(),
    startDate: z.string().min(1, t("Ngày bắt đầu là bắt buộc", lang)),
    endDate: z.string().optional().nullable(),
    dailyBudget: z.number().optional(),
    lifetimeBudget: z.number().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
    note: z.string().optional(),
  });
}

type FormData = {
  code: string;
  name: string;
  facebookPageId: string;
  objective?: string;
  startDate: string;
  endDate?: string | null;
  dailyBudget?: number;
  lifetimeBudget?: number;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  note?: string;
};

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
  const lang = useLanguageStore((s) => s.language);
  const isEdit = mode === "edit";

  const { data: recordData, isLoading: isLoadingRecord } = useCampaign(
    isEdit && recordId ? recordId : null
  );

  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [facebookPageOptions, setFacebookPageOptions] = useState<SelectOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const formSchema = useMemo(() => buildFormSchema(lang), [lang]);

  const {
    control,
    handleSubmit,
    reset,
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

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: t("Hoạt động", lang) },
      { value: "PAUSED", label: t("Tạm dừng", lang) },
      { value: "COMPLETED", label: t("Hoàn thành", lang) },
      { value: "ARCHIVED", label: t("Lưu trữ", lang) },
    ],
    [lang]
  );

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
      message.error(t("Lỗi khi tải danh sách Facebook Pages", lang));
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
        ? (recordData.facebookPageId as { _id: string })._id
        : (recordData.facebookPageId as string);

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
            message.success(t("Cập nhật thành công", lang));
            onSuccess?.();
            onClose();
          },
          onError: (err: Error) => {
            message.error(err.message || t("Lỗi khi cập nhật", lang));
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          message.success(t("Tạo thành công", lang));
          onSuccess?.();
          onClose();
        },
        onError: (err: Error) => {
          message.error(err.message || t("Lỗi khi tạo", lang));
        },
      });
    }
  };

  return (
    <Drawer
      title={isEdit ? t("Sửa Campaign", lang) : t("Tạo Campaign", lang)}
      placement="right"
      styles={{ wrapper: { width: 500 } }}
      open={open}
      onClose={onClose}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>{t("Hủy", lang)}</Button>
          <Button
            type="primary"
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            {isSubmitting ? t("Đang lưu...", lang) : isEdit ? t("Cập nhật", lang) : t("Tạo mới", lang)}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item
          label={t("Mã Campaign", lang)}
          required
          validateStatus={errors.code ? "error" : ""}
          help={errors.code?.message}
        >
          <Input
            placeholder={t("Nhập mã campaign (VD: CAMP_001)", lang)}
            {...control.register("code")}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          label={t("Tên Campaign", lang)}
          required
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
        >
          <Input
            placeholder={t("Nhập tên campaign", lang)}
            {...control.register("name")}
          />
        </Form.Item>

        <Form.Item
          label={t("Facebook Page", lang)}
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
                placeholder={t("Chọn Facebook Page", lang)}
                allowClear
                searchable
                onSearch={loadFacebookPages}
                loading={loadingPages}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={t("Objective", lang)}>
          <Input
            placeholder={t("VD: CONVERSIONS, TRAFFIC, LEAD_GENERATION", lang)}
            {...control.register("objective")}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item
            label={t("Ngày bắt đầu", lang)}
            required
            style={{ width: "calc(50% - 8px)" }}
          >
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <div style={{ position: "relative" }}>
                  <DatePicker
                    style={{ width: "100%" }}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date?.toISOString() ?? "")}
                    format="DD/MM/YYYY"
                    placeholder={t("Chọn ngày", lang)}
                    getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                  />
                </div>
              )}
            />
          </Form.Item>

          <Form.Item
            label={t("Ngày kết thúc", lang)}
            style={{ width: "calc(50% - 8px)" }}
          >
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <div style={{ position: "relative" }}>
                  <DatePicker
                    style={{ width: "100%" }}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date?.toISOString() ?? null)}
                    format="DD/MM/YYYY"
                    placeholder={t("Chọn ngày (tùy chọn)", lang)}
                    allowClear
                    getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                  />
                </div>
              )}
            />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size={16}>
          <Form.Item label={t("Daily Budget", lang)} style={{ width: "calc(50% - 8px)" }}>
            <Input
              type="number"
              placeholder="0"
              {...control.register("dailyBudget", { valueAsNumber: true })}
            />
          </Form.Item>

          <Form.Item label={t("Lifetime Budget", lang)} style={{ width: "calc(50% - 8px)" }}>
            <Input
              type="number"
              placeholder="0"
              {...control.register("lifetimeBudget", { valueAsNumber: true })}
            />
          </Form.Item>
        </Space>

        <Form.Item label={t("Trạng thái", lang)}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={statusOptions}
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>

        <Form.Item label={t("Ghi chú", lang)}>
          <TextArea
            rows={3}
            placeholder={t("Ghi chú...", lang)}
            {...control.register("note")}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

const CampaignDrawer = memo(CampaignDrawerInner);
export default CampaignDrawer;