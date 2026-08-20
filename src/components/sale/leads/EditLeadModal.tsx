"use client";

/**
 * ==================================================
 * EDIT LEAD MODAL (Sale Leads)
 * ==================================================
 *
 * Modal cho phép Sale/Admin sửa thông tin của một Lead.
 * Bao gồm:
 * - Thông tin khách hàng (tên, SĐT, địa chỉ)
 * - Sản phẩm và Combo (với chi tiết biến thể)
 * - Giá & số lượng
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Typography,
  Divider,
  message,
  Spin,
  Alert,
} from "antd";
import {
  EditOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  DollarOutlined,
  SwapOutlined,
  ProductOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import type { SaleLead } from "@/hooks/useSaleLeads";
import { useUpdateLead } from "@/hooks/useSaleLeads";
import { useComboList, type ComboListItem } from "@/hooks/useCombos";
import { useProductWithVariants } from "@/hooks/useProductVariants";
import { useProducts } from "@/hooks/useProducts";
import OrderProductDetail, { createOrderItemFromCombo } from "@/components/order/OrderProductDetail";
import { validateOrderItem, type OrderItem } from "@/types/variant";
import { formatMNT } from "@/lib/format";
import styles from "./edit-lead-modal.module.css";

const { Text } = Typography;
const { TextArea } = Input;

export type EditLeadModalProps = {
  open: boolean;
  lead: SaleLead | null;
  onClose: () => void;
  onSuccess?: () => void;
};

interface LeadFormValues {
  customerName: string;
  phone?: string;
  address?: string;
  productId?: string;
  comboId?: string;
  comboQuantity?: number;
  sellingPrice?: number;
  exchangeRate?: number;
}

function productId(combo: ComboListItem): string | null {
  return typeof combo.product === "string" ? combo.product : combo.product._id;
}

function EditLeadModalInner({ open, lead, onClose, onSuccess }: EditLeadModalProps) {
  const [form] = Form.useForm<LeadFormValues>();
  const updateLeadMutation = useUpdateLead();
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [selectedComboId, setSelectedComboId] = useState<string>();
  const [items, setItems] = useState<OrderItem[]>([]);

  // Fetch all products for selection
  const { products, loading: productsLoading } = useProducts();

  // Fetch combos for selected product
  const { data: combosData, isLoading: combosLoading } = useComboList({
    page: 1,
    limit: 100,
    productId: selectedProductId,
    isActive: true,
  });
  const combos = combosData?.items ?? [];
  const selectedCombo = useMemo(() => combos.find((combo) => combo._id === selectedComboId), [combos, selectedComboId]);

  // Fetch product with variants
  const { product, loading: productLoading } = useProductWithVariants(selectedProductId);

  // Initialize form when lead opens
  useEffect(() => {
    if (lead && open) {
      // Set product from lead
      const initialProductId = lead.product?._id;
      if (initialProductId) {
        setSelectedProductId(initialProductId);
        form.setFieldValue("productId", initialProductId);
      }

      form.setFieldsValue({
        customerName: lead.customerName,
        phone: lead.phone,
        address: lead.address,
        comboQuantity: 1,
        sellingPrice: lead.unitPriceMNT,
        exchangeRate: lead.exchangeRate,
      });
    }
  }, [lead, open, form]);

  // Set combo and create order item when combos are loaded or product changes
  useEffect(() => {
    if (!lead || !open) return;

    // If lead has a combo, use it; otherwise use first available
    const targetCombo = combos.find((combo) => combo._id === lead.combo?._id) ?? combos[0];

    if (targetCombo) {
      setSelectedComboId(targetCombo._id);
      form.setFieldValue("comboId", targetCombo._id);

      const price = lead.unitPriceMNT || targetCombo.sellingPrice;
      setItems([createOrderItemFromCombo({
        _id: targetCombo._id,
        code: targetCombo.code,
        name: targetCombo.name,
        packageQuantity: targetCombo.packageQuantity,
        giftQuantity: targetCombo.giftQuantity ?? 0,
        sellingPrice: price,
        productId: productId(targetCombo) ?? "",
      })]);
      form.setFieldValue("sellingPrice", price);
    }
  }, [lead, open, combos, form]);

  const handleProductChange = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setSelectedComboId(undefined);
    setItems([]);
    form.setFieldValue("comboId", undefined);
    form.setFieldValue("sellingPrice", undefined);
  }, [form]);

  const handleComboChange = useCallback((comboId: string) => {
    const combo = combos.find((item) => item._id === comboId);
    if (!combo) return;

    setSelectedComboId(comboId);
    const price = form.getFieldValue("sellingPrice") || combo.sellingPrice;
    const newItem = createOrderItemFromCombo({
      _id: combo._id,
      code: combo.code,
      name: combo.name,
      packageQuantity: combo.packageQuantity,
      giftQuantity: combo.giftQuantity ?? 0,
      sellingPrice: price,
      productId: productId(combo) ?? "",
    });
    setItems([newItem]);
    form.setFieldValue("sellingPrice", price);
  }, [combos, form]);

  const handleItemsChange = useCallback((newItems: OrderItem[]) => {
    setItems(newItems);
  }, []);

  const handleSubmit = async () => {
    if (!lead) return;

    try {
      const values = await form.validateFields();
      const item = items[0];

      if (!selectedProductId) {
        void message.error("Vui lòng chọn sản phẩm");
        return;
      }

      if (!item) {
        void message.error("Vui lòng chọn combo");
        return;
      }

      // Validate order item
      const validation = validateOrderItem(item);
      if (!validation.isValid) {
        void message.error(validation.detailsError || validation.giftsError || "Thông tin combo không hợp lệ");
        return;
      }

      await updateLeadMutation.mutateAsync({
        leadId: lead._id,
        payload: {
          customerName: values.customerName,
          phone: values.phone,
          address: values.address,
          productId: selectedProductId,
          comboId: selectedComboId,
          comboQuantity: item.comboQuantity,
          unitPriceMNT: item.sellingPrice,
          exchangeRate: values.exchangeRate,
          variantDetails: item.details,
          giftMode: item.giftMode,
          giftSelections: item.giftSelections,
        },
      });

      void message.success("Đã cập nhật thông tin lead thành công");
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        void message.error(`Lỗi: ${error.message}`);
      }
      console.error("Failed to update lead:", error);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedProductId(undefined);
    setSelectedComboId(undefined);
    setItems([]);
    onClose();
  };

  const item = items[0];
  const isLoading = productsLoading || combosLoading || productLoading;

  if (!lead) return null;

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>Sửa thông tin Lead</span>
          <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
            {lead.leadCode}
          </Text>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={960}
      destroyOnHidden
      footer={[
        <div key="footer" className={styles.footer}>
          <button key="cancel" onClick={handleClose} className={styles.cancelBtn}>
            Hủy
          </button>
          <button
            key="submit"
            onClick={() => void handleSubmit()}
            className={styles.submitBtn}
            disabled={updateLeadMutation.isPending || isLoading || !item || !selectedProductId}
          >
            {updateLeadMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>,
      ]}
    >
      <div className={styles.body}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            customerName: lead.customerName,
            phone: lead.phone,
            address: lead.address,
            comboQuantity: 1,
            sellingPrice: lead.unitPriceMNT,
            exchangeRate: lead.exchangeRate,
          }}
        >
          <Divider titlePlacement="left" styles={{ content: { marginInlineStart: 0 } }} plain style={{ marginTop: 0 }}>
            <UserOutlined /> Thông tin khách hàng
          </Divider>

          <Form.Item
            name="customerName"
            label="Tên khách hàng"
            rules={[{ required: true, message: "Vui lòng nhập tên khách hàng" }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Nhập tên khách hàng"
              size="large"
            />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input
              prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Nhập số điện thoại"
              size="large"
            />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <TextArea
              rows={2}
              placeholder="Nhập địa chỉ giao hàng"
            />
          </Form.Item>

          <Divider titlePlacement="left" styles={{ content: { marginInlineStart: 0 } }} plain>
            <ShopOutlined /> Sản phẩm & Combo
          </Divider>

          {/* Product Selection */}
          <div className={styles.comboSection}>
            <div className={styles.fieldLabel}>
              <ProductOutlined />
              <Text strong>Chọn Sản phẩm:</Text>
            </div>
            {productsLoading ? (
              <Spin size="small" />
            ) : (
              <Select
                name="productId"
                value={selectedProductId}
                onChange={handleProductChange}
                style={{ width: "100%", marginTop: 8 }}
                placeholder="-- Chọn sản phẩm --"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={products.map((p) => ({
                  value: p._id,
                  label: `${p.name} (${p.code})`,
                }))}
              />
            )}
          </div>

          {/* Combo Selection */}
          {selectedProductId && (
            <div className={styles.comboSection}>
              <div className={styles.fieldLabel}>
                <ShopOutlined />
                <Text strong>Chọn Combo:</Text>
              </div>
              {combosLoading ? (
                <Spin size="small" />
              ) : combos.length === 0 ? (
                <Alert
                  type="warning"
                  title="Sản phẩm này chưa có combo nào"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              ) : (
                <Select
                  name="comboId"
                  value={selectedComboId}
                  onChange={handleComboChange}
                  style={{ width: "100%", marginTop: 8 }}
                  placeholder="-- Chọn combo --"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={combos.map((combo) => ({
                    value: combo._id,
                    label: `${combo.name} (${combo.packageQuantity} SP${combo.giftQuantity > 0 ? ` | ${combo.giftQuantity} quà` : ""}) - ${formatMNT(combo.sellingPrice)} ₮`,
                  }))}
                />
              )}
            </div>
          )}

          {/* Variant Details Section */}
          {selectedCombo && product && (
            <div className={styles.variantSection}>
              <Divider plain style={{ margin: "16px 0" }}>
                <Space>
                  <SwapOutlined />
                  <Text strong>Chi tiết biến thể</Text>
                </Space>
              </Divider>
              {productLoading ? (
                <div className={styles.loading}>
                  <Spin /> Đang tải thông tin sản phẩm...
                </div>
              ) : (
                <OrderProductDetail
                  items={items}
                  product={product}
                  onChange={handleItemsChange}
                  disabled={updateLeadMutation.isPending}
                />
              )}
            </div>
          )}

          <Divider titlePlacement="left" styles={{ content: { marginInlineStart: 0 } }} plain>
            <DollarOutlined /> Giá & Tỷ giá
          </Divider>

          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item
              name="sellingPrice"
              label="Đơn giá (MNT)"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Vui lòng nhập đơn giá" }]}
            >
              <InputNumber<number>
                min={0}
                step={1000}
                style={{ width: "100%" }}
                placeholder="Đơn giá"
                formatter={(value) =>
                  value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                }
                parser={(value) => {
                  const parsed = value?.replace(/,/g, "");
                  return parsed ? Number(parsed) : 0;
                }}
                onChange={(val) => {
                  if (val && item) {
                    const newItem = { ...item, sellingPrice: val, subtotal: val * item.comboQuantity };
                    setItems([newItem]);
                  }
                }}
              />
            </Form.Item>

            <Form.Item name="exchangeRate" label="Tỷ giá (1 ₮ = ? VND)" style={{ flex: 1 }}>
              <InputNumber<number>
                min={0}
                step={1}
                style={{ width: "100%" }}
                placeholder="Ví dụ: 650"
                formatter={(value) =>
                  value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                }
                parser={(value) => {
                  const parsed = value?.replace(/,/g, "");
                  return parsed ? Number(parsed) : 0;
                }}
              />
            </Form.Item>
          </div>

          {/* Total Preview */}
          {item && (
            <Alert
              type="info"
              title={
                <Space>
                  <Text>Thành tiền:</Text>
                  <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
                    {formatMNT(item.subtotal)} ₮
                  </Text>
                  {form.getFieldValue("exchangeRate") && (
                    <Text type="secondary">
                      (= {formatMNT(item.subtotal * (form.getFieldValue("exchangeRate") || 0))} VND)
                    </Text>
                  )}
                </Space>
              }
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </div>
    </Modal>
  );
}

const EditLeadModal = memo(EditLeadModalInner);
export default EditLeadModal;
