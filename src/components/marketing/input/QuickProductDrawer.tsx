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
        toast.warning("Vui lòng thêm ít nhất 1 combo");
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
        `Đã tạo sản phẩm "${product.name}" và ${createdCombos.length} combo`
      );
      onSuccess(product._id, product.name, createdCombos);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
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
      toast.success(`Đã tạo danh mục "${created.name}"`);
      // Auto-select category vừa tạo
      form.setFieldValue(["product", "categoryCode"], created.code);
      categoryForm.resetFields();
      setCategoryModalOpen(false);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    }
  };

  return (
    <DrawerForm
      open={open}
      title="Thêm nhanh sản phẩm"
      loading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="Tạo sản phẩm & Combo"
      width={560}
    >
      <Alert
        type="info"
        showIcon
        title="Tạo nhanh sản phẩm kèm nhiều combo. Bấm 'Thêm combo' để thêm dòng combo mới."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        {/* === PRODUCT === */}
        <Divider plain>Sản phẩm</Divider>

        <Form.Item
          name={["product", "name"]}
          label="Tên sản phẩm"
          rules={[
            { required: true, message: "Vui lòng nhập tên sản phẩm" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
          ]}
        >
          <Input placeholder="VD: Bánh Oreo" />
        </Form.Item>

        <Form.Item
          name={["product", "categoryCode"]}
          label="Danh mục"
          rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
        >
          <Select
            placeholder="Chọn danh mục"
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
                  Tạo danh mục mới
                </Button>
              </>
            )}
          />
        </Form.Item>

        {/* === COMBOS (Form.List) === */}
        <Divider plain>Combo(s)</Divider>

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
                    <strong>Combo #{field.name + 1}</strong>
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
                    label="Tên combo"
                    rules={[
                      { required: true, message: "Vui lòng nhập tên combo" },
                    ]}
                    style={{ marginBottom: 8, marginTop: 8 }}
                  >
                    <Input placeholder="VD: Combo 3 hộp" />
                  </Form.Item>

                  <Space.Compact style={{ width: "100%" }}>
                    <Form.Item
                      name={[field.name, "packageQuantity"]}
                      label="SL / combo"
                      rules={[
                        { required: true, message: "Nhập số lượng" },
                        { type: "number", min: 1, message: "SL >= 1" },
                      ]}
                      style={{ width: "50%", marginBottom: 0 }}
                    >
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "sellingPrice"]}
                      label="Giá bán (₫)"
                      rules={[
                        { required: true, message: "Nhập giá" },
                        { type: "number", min: 0, message: "Giá >= 0" },
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
                Thêm combo
              </Button>
            </>
          )}
        </Form.List>
      </Form>

      {/* Modal tạo danh mục nhanh */}
      <Modal
        title="Tạo danh mục mới"
        open={categoryModalOpen}
        onCancel={() => {
          categoryForm.resetFields();
          setCategoryModalOpen(false);
        }}
        onOk={handleCreateCategory}
        confirmLoading={createCategoryMutation.isPending}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Mã danh mục"
            rules={[
              { required: true, message: "Vui lòng nhập mã" },
              { min: 2, message: "Mã tối thiểu 2 ký tự" },
              {
                pattern: /^[A-Z0-9_-]+$/i,
                message: "Mã chỉ gồm chữ, số, gạch ngang/underscore",
              },
            ]}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value="MÃ"
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
                  { required: true, message: "Vui lòng nhập mã" },
                  { min: 2, message: "Mã tối thiểu 2 ký tự" },
                  {
                    pattern: /^[A-Z0-9_-]+$/i,
                    message: "Mã chỉ gồm chữ, số, gạch ngang/underscore",
                  },
                ]}
              >
                <Input placeholder="SNACK" style={{ width: "calc(100% - 60px)" }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              { required: true, message: "Vui lòng nhập tên" },
              { min: 2, message: "Tên tối thiểu 2 ký tự" },
            ]}
          >
            <Input placeholder="VD: Đồ ăn vặt" />
          </Form.Item>
        </Form>
      </Modal>
    </DrawerForm>
  );
}