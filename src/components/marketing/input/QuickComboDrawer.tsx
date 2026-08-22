/**
 * Quick Combo Drawer (Sprint 8.x)
 *
 * Cho phép thêm combo mới cho sản phẩm đang được chọn trong trang Marketing
 * mà không cần vào /products.
 */

"use client";

import { useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Divider,
  Alert,
  Button,
  Space,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useCreateCombo } from "@/hooks/useCombos";
import { toast } from "@/components/common/feedback/Toast";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface QuickComboDrawerProps {
  open: boolean;
  /** Product ID đang được chọn (bắt buộc). */
  productId: string | null;
  /** Product code đang được chọn (cần cho API). */
  productCode?: string;
  /** Tên sản phẩm (hiển thị trong drawer). */
  productName?: string;
  onClose: () => void;
  /**
   * Được gọi sau khi tạo thành công combo.
   * - comboIds: danh sách combo đã tạo.
   */
  onSuccess: (comboIds: string[]) => void;
}

interface ComboFormValues {
  comboName: string;
  packageQuantity: number;
  sellingPrice: number;
}

interface QuickFormValues {
  combos: ComboFormValues[];
}

export default function QuickComboDrawer({
  open,
  productId,
  productCode,
  productName,
  onClose,
  onSuccess,
}: QuickComboDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm<QuickFormValues>();
  const createComboMutation = useCreateCombo();

  // Reset form khi mở drawer
  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        combos: [{ packageQuantity: 1, sellingPrice: 0 }],
      });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      if (!productId) {
        toast.error(t("Vui lòng chọn sản phẩm trước", lang));
        return;
      }

      const values = await form.validateFields();
      const combosValues = values.combos ?? [];

      if (combosValues.length === 0) {
        toast.warning(t("Vui lòng thêm ít nhất 1 combo", lang));
        return;
      }

      // Validate trùng tên combo trước khi submit
      const namesNormalized = combosValues
        .map((c) => (c.comboName || "").trim().toLowerCase())
        .filter(Boolean);
      const seen = new Set<string>();
      const duplicates = new Set<string>();
      for (const n of namesNormalized) {
        if (seen.has(n)) duplicates.add(n);
        seen.add(n);
      }
      if (duplicates.size > 0) {
        const dupLabels = combosValues
          .map((c) => (c.comboName || "").trim())
          .filter(
            (label, idx) =>
              label &&
              duplicates.has(label.toLowerCase()) &&
              namesNormalized.indexOf(label.toLowerCase()) === idx
          );
        toast.error(
          `${t("Lỗi: đã tồn tại tên combo", lang)} "${dupLabels.join(
            ", "
          )}", ${t("vui lòng chọn tên combo khác", lang)}`,
        );
        return;
      }

      // Tạo tuần tự từng combo
      const createdCombos: string[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < combosValues.length; i++) {
        const comboValues = combosValues[i];
        const comboCode = `C${timestamp}${i}`.slice(-10);
        const combo = await createComboMutation.mutateAsync({
          code: comboCode,
          name:
            comboValues.comboName ||
            (productName ? `${productName} - Combo ${i + 1}` : `Combo ${i + 1}`),
          productId: productId,
          productCode: productCode,
          packageQuantity: comboValues.packageQuantity || 1,
          sellingPrice: comboValues.sellingPrice || 0,
          giftQuantity: 0,
          displayOrder: i,
        });
        createdCombos.push(combo._id);
      }

      toast.success(
        `${t("Đã tạo", lang)} ${createdCombos.length} ${t("combo cho", lang)} "${productName ?? t("sản phẩm", lang)}"`,
      );
      onSuccess(createdCombos);
      onClose();
    } catch {
      // Lỗi đã được useCreateCombo.onError xử lý toast.
      // Catch block chỉ để nuốt lỗi nhằm tránh unhandled promise rejection;
      // và để bảo toàn UI state (không đóng drawer, không gọi onSuccess).
    }
  };

  return (
    <DrawerForm
      open={open}
      title={`${t("Thêm combo cho", lang)} "${productName ?? t("sản phẩm", lang)}"`}
      loading={createComboMutation.isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t("Tạo combo", lang)}
      width={560}
    >
      <Alert
        type="info"
        showIcon
        title={t("Thêm combo mới cho sản phẩm đang chọn. Bấm 'Thêm combo' để thêm dòng combo mới.", lang)}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        {/* === COMBOS (Form.List) === */}
        <Divider plain>{t("Combo(s)", lang)}</Divider>

        <Form.List name="combos">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    border: "1px dashed #d9d9d9",
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                    background: "#fafafa",
                  }}
                >
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <strong>{t("Combo", lang)} #{field.name + 1}</strong>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Space>

                  <Form.Item
                    name={[field.name, "comboName"]}
                    label={t("Tên combo", lang)}
                    rules={[
                      { required: true, message: t("Vui lòng nhập tên combo", lang) },
                    ]}
                    style={{ marginBottom: 8, marginTop: 8 }}
                  >
                    <Input placeholder={t("VD: Combo 3 hộp", lang)} />
                  </Form.Item>

                  <Space.Compact style={{ width: "100%" }}>
                    <Form.Item
                      name={[field.name, "packageQuantity"]}
                      label={t("SL / combo", lang)}
                      rules={[
                        { required: true, message: t("Nhập số lượng", lang) },
                        { type: "number", min: 1, message: t("SL >= 1", lang) },
                      ]}
                      style={{ width: "50%", marginBottom: 0 }}
                    >
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "sellingPrice"]}
                      label={t("Giá bán (₮)", lang)}
                      rules={[
                        { required: true, message: t("Nhập giá", lang) },
                        { type: "number", min: 0, message: t("Giá >= 0", lang) },
                      ]}
                      style={{ width: "50%", marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(value) =>
                          Number((value ?? "").replace(/,/g, "") || 0) as 0
                        }
                      />
                    </Form.Item>
                  </Space.Compact>
                </div>
              ))}

              <Button
                type="dashed"
                onClick={() =>
                  add({ packageQuantity: 1, sellingPrice: 0 })
                }
                icon={<PlusOutlined />}
                block
              >
                {t("Thêm combo", lang)}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </DrawerForm>
  );
}
