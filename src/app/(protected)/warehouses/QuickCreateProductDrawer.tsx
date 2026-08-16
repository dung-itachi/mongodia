/**
 * QuickCreateProductDrawer Component
 *
 * Drawer "Tạo sản phẩm nhanh" mở từ nút "+ Thêm SP kho" trên trang
 * `/warehouses`. Cho phép tạo Product + Variant + nhập kho ngay trong 1
 * drawer (3 bước liên hoàn).
 *
 *   ┌─────────────────────────────────────┐
 *   │ [STEP 1] Thông tin sản phẩm          │
 *   │   Mã SP*                             │
 *   │   Tên SP*                            │
 *   │   Danh mục*                          │
 *   │   Mô tả (tuỳ chọn)                   │
 *   │                                      │
 *   │ [STEP 2] Variant                     │
 *   │   SKU*  [_____]                      │
 *   │   Chọn thuộc tính                    │
 *   │     [Color ▼] [Red ▼]                │
 *   │     [Size ▼]  [L ▼]                  │
 *   │                                      │
 *   │ [STEP 3] Nhập kho                    │
 *   │   Số lượng* [_____]                  │
 *   │   Ghi chú                            │
 *   │                                      │
 *   │ [Huỷ]                  [Tạo & Nhập] │
 *   └─────────────────────────────────────┘
 */

import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  Steps,
  Button,
  Space,
  Alert,
  App,
  Divider,
  Typography,
} from "antd";
import { useCategoryList } from "@/hooks/useCategories";
import {
  useVariantOptionList,
  useVariantValueList,
} from "@/hooks/useVariants";
import { useQuickCreateProduct } from "@/hooks/useQuickCreateProduct";
import styles from "./warehouses.module.css";

export type QuickCreateProductDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type FormValues = {
  // Step 1
  code: string;
  name: string;
  categoryCode: string;
  description?: string;
  // Step 2
  sku: string;
  variantValues: string[];
  // Step 3
  quantity: number;
  note?: string;
};

export default function QuickCreateProductDrawer({
  open,
  onClose,
  onSuccess,
}: QuickCreateProductDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading } = useCategoryList();
  const categories = categoriesData?.items ?? [];
  const { data: optionsData, isLoading: optionsLoading } =
    useVariantOptionList();
  const options = optionsData?.items ?? [];

  const { mutateAsync, isPending, reset } = useQuickCreateProduct();

  // Reset state khi đóng
  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        form.resetFields();
        setStep(0);
        setSubmitError(null);
        reset();
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, form, reset]);

  // Load values cho từng option
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  // Map optionId → Set<valueId> để khi xoá option ta biết xoá những value nào
  const [valueIdToOptionIdMap, setValueIdToOptionIdMap] = useState<
    Record<string, Set<string>>
  >({});

  const categoryOptions = useMemo(
    () =>
      categories.map((c: { code: string; name: string }) => ({
        value: c.code,
        label: `${c.code} · ${c.name}`,
      })),
    [categories]
  );

  const variantOptionOptions = useMemo(
    () =>
      options.map((o: { _id: string; code: string; name: string }) => ({
        value: o._id,
        label: `${o.code} · ${o.name}`,
      })),
    [options]
  );

  const handleAddOption = (optionId: string) => {
    if (!selectedOptionIds.includes(optionId)) {
      setSelectedOptionIds((prev) => [...prev, optionId]);
    }
  };

const handleRemoveOption = (optionId: string) => {
  setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
  // Xoá values thuộc option vừa bỏ
  const currentValues: string[] = form.getFieldValue("variantValues") || [];
  const valuesUnderOption = valueIdToOptionIdMap[optionId] ?? new Set<string>();
  if (valuesUnderOption.size > 0) {
    form.setFieldsValue({
      variantValues: currentValues.filter((v) => !valuesUnderOption.has(v)),
    });
    setValueIdToOptionIdMap((prev) => {
      const next = { ...prev };
      delete next[optionId];
      return next;
    });
  }
};

  const handleNext = async () => {
    try {
      if (step === 0) {
        await form.validateFields(["code", "name", "categoryCode"]);
      } else if (step === 1) {
        await form.validateFields(["sku", "variantValues"]);
      }
      setStep((s) => s + 1);
      setSubmitError(null);
    } catch (err) {
      const msg = (err as Error)?.message || "Vui lòng điền đầy đủ thông tin";
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitError(null);
      const result = await mutateAsync({
        code: values.code,
        name: values.name,
        categoryCode: values.categoryCode,
        description: values.description,
        sku: values.sku,
        variantValueIds: values.variantValues,
        quantity: values.quantity,
        note: values.note,
      });
      message.success(
        `Đã tạo "${result.productCode}" và nhập ${result.totalChange} vào ${result.updatedWarehouses} kho`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        (err as Error)?.message || "Không thể tạo sản phẩm. Vui lòng thử lại.";
      setSubmitError(msg);
    }
  };

  return (
    <Drawer
      title="Tạo sản phẩm nhanh"
      open={open}
      onClose={onClose}
      size="large"
      destroyOnHidden
      mask={{ closable: !isPending }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button onClick={onClose} disabled={isPending}>
            Huỷ
          </Button>
          <Space>
            {step > 0 && (
              <Button onClick={handleBack} disabled={isPending}>
                Quay lại
              </Button>
            )}
            {step < 2 && (
              <Button type="primary" onClick={handleNext} disabled={isPending}>
                Tiếp tục
              </Button>
            )}
            {step === 2 && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={isPending}
              >
                Tạo & Nhập
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        current={step}
        size="small"
        items={[
          { title: "Thông tin SP" },
          { title: "Variant" },
          { title: "Nhập kho" },
        ]}
        style={{ marginBottom: 24 }}
      />

      {submitError && (
        <Alert
          type="error"
          message={submitError}
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setSubmitError(null)}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{ quantity: 1, note: "", variantValues: [] }}
      >
        {step === 0 && (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Thông tin sản phẩm
            </Typography.Title>
            <Form.Item
              name="code"
              label="Mã sản phẩm"
              rules={[
                { required: true, message: "Vui lòng nhập mã" },
                { min: 2, message: "Mã tối thiểu 2 ký tự" },
                { max: 50, message: "Mã tối đa 50 ký tự" },
              ]}
              extra="Mã sẽ tự động in hoa"
            >
              <Input placeholder="VD: EYELASH-MASCARA" disabled={isPending} />
            </Form.Item>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[
                { required: true, message: "Vui lòng nhập tên" },
                { min: 2, message: "Tên tối thiểu 2 ký tự" },
                { max: 200, message: "Tên tối đa 200 ký tự" },
              ]}
            >
              <Input placeholder="VD: Eyelash mascara" disabled={isPending} />
            </Form.Item>
            <Form.Item
              name="categoryCode"
              label="Danh mục"
              rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
            >
              <Select
                showSearch
                placeholder="Chọn danh mục"
                options={categoryOptions}
                loading={categoriesLoading}
                disabled={isPending || categoryOptions.length === 0}
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item name="description" label="Mô tả (tuỳ chọn)">
              <Input.TextArea
                rows={2}
                placeholder="Mô tả sản phẩm..."
                maxLength={500}
                disabled={isPending}
              />
            </Form.Item>
          </>
        )}

        {step === 1 && (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Variant
            </Typography.Title>
            <Form.Item
              name="sku"
              label="SKU"
              rules={[
                { required: true, message: "Vui lòng nhập SKU" },
                { min: 2, message: "SKU tối thiểu 2 ký tự" },
                { max: 100, message: "SKU tối đa 100 ký tự" },
              ]}
              extra="SKU sẽ tự động in hoa"
            >
              <Input
                placeholder="VD: MASCARA-RED-L"
                disabled={isPending}
              />
            </Form.Item>

            <Form.Item label="Thuộc tính (VariantOption)">
              <Space.Compact style={{ width: "100%" }}>
                <Select
                  showSearch
                  placeholder="Chọn thuộc tính để thêm"
                  options={variantOptionOptions.filter(
                    (o) => !selectedOptionIds.includes(o.value as string)
                  )}
                  loading={optionsLoading}
                  disabled={isPending || variantOptionOptions.length === 0}
                  style={{ flex: 1 }}
                  value={null}
                  onChange={(value: string) => handleAddOption(value)}
                  filterOption={(input, option) =>
                    String(option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Space.Compact>
              {selectedOptionIds.length > 0 && (
                <div className={styles["wh-qc-pills"]}>
                  {selectedOptionIds.map((oid) => {
                    const opt = options.find((o) => o._id === oid);
                    return (
                      <span
                        key={oid}
                        className={styles["wh-qc-pill"]}
                      >
                        {opt?.name ?? oid}
                        <Button
                          type="text"
                          size="small"
                          disabled={isPending}
                          onClick={() => handleRemoveOption(oid)}
                        >
                          ×
                        </Button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Form.Item>

            {selectedOptionIds.map((optionId) => (
              <VariantValuesSelector
                key={optionId}
                optionId={optionId}
                form={form}
                disabled={isPending}
                onChangeMapping={(valueIds) => {
                  setValueIdToOptionIdMap((prev) => ({
                    ...prev,
                    [optionId]: new Set(valueIds),
                  }));
                }}
              />
            ))}

            <Form.Item
              name="variantValues"
              label="Tổ hợp giá trị Variant"
              hidden
            >
              <Input />
            </Form.Item>
          </>
        )}

        {step === 2 && (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Nhập kho
            </Typography.Title>
            <Divider style={{ margin: "0 0 16px" }} />
            <Form.Item
              name="quantity"
              label="Số lượng nhập"
              rules={[
                { required: true, message: "Vui lòng nhập số lượng" },
                {
                  type: "number",
                  min: 1,
                  max: 100000,
                  message: "Số lượng trong khoảng 1–100,000",
                },
              ]}
              extra="Số lượng này sẽ được nhập vào TẤT CẢ kho active"
            >
              <InputNumber
                min={1}
                max={100000}
                style={{ width: "100%" }}
                placeholder="Số lượng"
                disabled={isPending}
              />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
              <Input.TextArea
                rows={2}
                placeholder="Lý do nhập / số PO / NCC..."
                maxLength={200}
                disabled={isPending}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
}

// ----- Sub-component: chọn giá trị cho 1 VariantOption -----
function VariantValuesSelector({
  optionId,
  form,
  disabled,
  onChangeMapping,
}: {
  optionId: string;
  form: ReturnType<typeof Form.useForm<FormValues>>[0];
  disabled: boolean;
  onChangeMapping?: (valueIds: string[]) => void;
}) {
  const { data, isLoading } = useVariantValueList({
    variantOptionId: optionId,
    isActive: true,
    limit: 100,
  } as never);
  const values = (data?.items ?? []) as Array<{
    _id: string;
    code: string;
    name: string;
    variantOptionId: string | { _id: string };
  }>;

  const { data: optionsData2 } = useVariantOptionList();
  const option = optionsData2?.items.find((o) => o._id === optionId);

  const valueOptions = useMemo(
    () =>
      values.map((v) => ({
        value: v._id,
        label: `${v.code} · ${v.name}`,
      })),
    [values]
  );

  const currentAll = (form.getFieldValue("variantValues") ?? []) as string[];
  const selectedForThis = currentAll.filter((vid) => {
    const v = values.find((x) => x._id === vid);
    if (!v) return false;
    const vOid =
      typeof v.variantOptionId === "string"
        ? v.variantOptionId
        : v.variantOptionId._id;
    return vOid === optionId;
  });

  const handleChange = (newValueIds: string[]) => {
    const otherValues = currentAll.filter((vid) => {
      const v = values.find((x) => x._id === vid);
      if (!v) return false;
      const vOid =
        typeof v.variantOptionId === "string"
          ? v.variantOptionId
          : v.variantOptionId._id;
      return vOid !== optionId;
    });
    form.setFieldsValue({
      variantValues: [...otherValues, ...newValueIds],
    });
    onChangeMapping?.(newValueIds);
  };

  return (
    <Form.Item
      label={`Giá trị ${option?.name ?? optionId}`}
      extra={
        isLoading
          ? "Đang tải giá trị..."
          : valueOptions.length === 0
            ? "Chưa có giá trị nào"
            : undefined
      }
    >
      <Select
        mode="multiple"
        placeholder={`Chọn giá trị ${option?.name ?? ""}`}
        options={valueOptions}
        loading={isLoading}
        disabled={disabled || valueOptions.length === 0}
        value={selectedForThis}
        onChange={handleChange}
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}
