/**
 * Quick Product + Multiple Combo Creation Drawer (Sprint 8.x)
 *
 * Cho phép thêm nhanh sản phẩm kèm nhiều combo ngay trong trang Marketing
 * mà không cần vào /products.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Divider,
  Alert,
  Button,
  Space,
  Modal,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useCreateProduct } from "@/hooks/useProductCrud";
import {
  useCategoryList,
  useCreateCategory,
} from "@/hooks/useCategories";
import { useCreateCombo } from "@/hooks/useCombos";
import { toast } from "@/components/common/feedback/Toast";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface QuickProductDrawerProps {
  open: boolean;
  /** Product đã chọn trước đó (để suggest category). */
  preselectedCategoryCode?: string;
  onClose: () => void;
  /**
   * Được gọi sau khi tạo thành công sản phẩm + combos.
   * - productId / productName: sản phẩm vừa tạo.
   * - comboIds: danh sách combo đã tạo (để tự chọn combo đầu tiên).
   */
  onSuccess: (
    productId: string,
    productName: string,
    comboIds: string[]
  ) => void;
}

interface ProductFormValues {
  code?: string;
  name: string;
  categoryCode: string;
}

interface ComboFormValues {
  comboName: string;
  packageQuantity: number;
  sellingPrice: number;
}

interface QuickFormValues {
  product: ProductFormValues;
  combos: ComboFormValues[];
}

export default function QuickProductDrawer({
  open,
  preselectedCategoryCode,
  onClose,
  onSuccess,
}: QuickProductDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm<QuickFormValues>();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm] = Form.useForm<{
    code: string;
    name: string;
  }>();

  const { data: categoryData } = useCategoryList();
  const categories = categoryData?.items ?? [];

  const createCategoryMutation = useCreateCategory();
  const createProductMutation = useCreateProduct();
  const createComboMutation = useCreateCombo();

  const isLoading =
    createProductMutation.isPending ||
    createComboMutation.isPending ||
    createCategoryMutation.isPending;

  // Reset form khi mở drawer
  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        product: { categoryCode: preselectedCategoryCode },
        combos: [{ packageQuantity: 1, sellingPrice: 0 }],
      });
    }
  }, [open, form, preselectedCategoryCode]);

  // Tự điền category nếu chưa có
  useEffect(() => {
    if (open && preselectedCategoryCode) {
      const current = form.getFieldValue(["product", "categoryCode"]);
      if (!current) {
        form.setFieldValue(["product", "categoryCode"], preselectedCategoryCode);
      }
    }
  }, [open, preselectedCategoryCode, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const productValues = values.product;
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

      // Tạo product
      const timestamp = Date.now();
      const productCode = productValues.code?.trim() || `P${timestamp}`.slice(-8);

      const product = await createProductMutation.mutateAsync({
        code: productCode,
        name: productValues.name,
        categoryCode: productValues.categoryCode,
      });

      // Tạo tuần tự từng combo
      const createdCombos: string[] = [];
      for (let i = 0; i < combosValues.length; i++) {
        const comboValues = combosValues[i];
        const comboCode = `C${timestamp}${i}`.slice(-10);
        const combo = await createComboMutation.mutateAsync({
          code: comboCode,
          name: comboValues.comboName || `${productValues.name} - Combo ${i + 1}`,
          productId: product._id,
          productCode: product.code,
          packageQuantity: comboValues.packageQuantity || 1,
          sellingPrice: comboValues.sellingPrice || 0,
          giftQuantity: 0,
          displayOrder: i,
        });
        createdCombos.push(combo._id);
      }

      toast.success(
        `${t("Đã tạo sản phẩm", lang)} "${product.name}" ${t("và", lang)} ${createdCombos.length} ${t("combo", lang)}`,
      );
      onSuccess(product._id, product.name, createdCombos);
      onClose();
    } catch {
      // Lỗi đã được useCreateProduct / useCreateCombo / useCreateCategory
      // xử lý toast. Catch block chỉ để nuốt lỗi nhằm tránh unhandled promise.
    }
  };

  const categoryOptions = categories.map((c) => ({
    label: `${c.code} - ${c.name}`,
    value: c.code,
  }));

  // Tạo danh mục nhanh
  const handleCreateCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      const created = await createCategoryMutation.mutateAsync({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
      });
      toast.success(`${t("Đã tạo danh mục", lang)} "${created.name}"`);
      // Auto-select category vừa tạo
      form.setFieldValue(["product", "categoryCode"], created.code);
      categoryForm.resetFields();
      setCategoryModalOpen(false);
    } catch {
      // Lỗi đã được useCreateCategory.onError xử lý toast.
    }
  };

  return (
    <DrawerForm
      open={open}
      title={t("Thêm nhanh sản phẩm", lang)}
      loading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t("Tạo sản phẩm & Combo", lang)}
      width={560}
    >
      <Alert
        type="info"
        showIcon
        title={t("Tạo nhanh sản phẩm kèm nhiều combo. Bấm 'Thêm combo' để thêm dòng combo mới.", lang)}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        {/* === PRODUCT === */}
        <Divider plain>{t("Sản phẩm", lang)}</Divider>

        <Form.Item
          name={["product", "name"]}
          label={t("Tên sản phẩm", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tên sản phẩm", lang) },
            { min: 2, message: t("Tên tối thiểu 2 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: Bánh Oreo", lang)} />
        </Form.Item>

        <Form.Item
          name={["product", "categoryCode"]}
          label={t("Danh mục", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn danh mục", lang) }]}
        >
          <Select
            placeholder={t("Chọn danh mục", lang)}
            showSearch
            optionFilterProp="label"
            options={categoryOptions}
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "4px 0" }} />
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => setCategoryModalOpen(true)}
                  block
                  style={{ textAlign: "left" }}
                >
                  {t("Tạo danh mục mới", lang)}
                </Button>
              </>
            )}
          />
        </Form.Item>

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

      {/* Modal tạo danh mục nhanh */}
      <Modal
        title={t("Tạo danh mục mới", lang)}
        open={categoryModalOpen}
        onCancel={() => {
          categoryForm.resetFields();
          setCategoryModalOpen(false);
        }}
        onOk={handleCreateCategory}
        confirmLoading={createCategoryMutation.isPending}
        okText={t("Tạo", lang)}
        cancelText={t("Hủy", lang)}
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label={t("Mã danh mục", lang)}
            rules={[
              { required: true, message: t("Vui lòng nhập mã", lang) },
              { min: 2, message: t("Mã tối thiểu 2 ký tự", lang) },
              {
                pattern: /^[A-Z0-9_-]+$/i,
                message: t("Mã chỉ gồm chữ, số, gạch ngang/underscore", lang),
              },
            ]}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={t("MÃ", lang)}
                disabled
                style={{
                  width: 60,
                  textAlign: "center",
                  background: "#fafafa",
                }}
              />
              <Form.Item
                name="code"
                noStyle
                rules={[
                  { required: true, message: t("Vui lòng nhập mã", lang) },
                  { min: 2, message: t("Mã tối thiểu 2 ký tự", lang) },
                  {
                    pattern: /^[A-Z0-9_-]+$/i,
                    message: t("Mã chỉ gồm chữ, số, gạch ngang/underscore", lang),
                  },
                ]}
              >
                <Input placeholder={t("SNACK", lang)} style={{ width: "calc(100% - 60px)" }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="name"
            label={t("Tên danh mục", lang)}
            rules={[
              { required: true, message: t("Vui lòng nhập tên", lang) },
              { min: 2, message: t("Tên tối thiểu 2 ký tự", lang) },
            ]}
          >
            <Input placeholder={t("VD: Đồ ăn vặt", lang)} />
          </Form.Item>
        </Form>
      </Modal>
    </DrawerForm>
  );
}