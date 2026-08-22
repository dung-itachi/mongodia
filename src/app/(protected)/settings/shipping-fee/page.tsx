/**
 * Trang Cài đặt Phí ship (Sprint Settings — Phí ship)
 *
 * Admin có thể xem/cập nhật phí ship hệ thống (lưu theo MNT).
 * Setting này sẽ được dùng để cộng vào tổng giá trị combo khi tính
 * doanh số đơn hàng: doanh số = subtotal_combo + shipping_fee.
 *
 * Order snapshot tại thời điểm tạo; thay đổi phí ship KHÔNG ảnh hưởng
 * Order cũ (vì Order đã lưu `summary.shippingFee` / `shipping.shippingFee`).
 */

"use client";

import { useEffect } from "react";
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Descriptions,
  Statistic,
  Row,
  Col,
  Skeleton,
  Tag,
} from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import PermissionGate from "@/components/common/PermissionGate";
import {
  useShippingFee,
  useUpdateShippingFee,
} from "@/hooks/useShippingFee";
import { formatMNT, formatNumber } from "@/lib/format";
import { toast } from "@/components/common/feedback/Toast";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { Text, Title } = Typography;

type FormValues = {
  fee: number;
  currency: "MNT" | "VND" | "USD";
};

export default function ShippingFeeSettingsPage() {
  const lang = useLanguageStore((s) => s.language);
  const { data, isLoading, refetch } = useShippingFee();
  const updateMutation = useUpdateShippingFee();
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (data) {
      form.setFieldsValue({ fee: data.fee, currency: data.currency });
    }
  }, [data, form]);

  // Watch current form values to know whether the user has unsaved changes.
  const watchedFee = Form.useWatch("fee", form);
  const watchedCurrency = Form.useWatch("currency", form);
  const hasChanges = data
    ? Number(watchedFee) !== Number(data.fee) || watchedCurrency !== data.currency
    : false;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        fee: values.fee,
        currency: values.currency,
      });
      toast.success("Đã cập nhật phí ship. Order mới sẽ sử dụng giá trị này.");
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    }
  };

  const handleReset = () => {
    if (data) {
      form.setFieldsValue({ fee: data.fee, currency: data.currency });
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t("Phí ship", lang)} subtitle={t("Phí ship cố định cộng vào tổng giá trị combo để tính doanh số đơn hàng", lang)}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Cài đặt hệ thống", href: "/settings" },
          { label: "Phí ship" },
        ]}
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void refetch()}
            loading={isLoading}
          >
            Tải lại
          </Button>
        }
      />

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <PermissionGate permission="system-settings.manage">
            <Card
              title={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>
                    Cập nhật phí ship
                  </Title>
                  <Tag color="blue">Admin only</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                title="Thay đổi phí ship KHÔNG ảnh hưởng đến đơn hàng đã tạo."
                description={
                  <>
                    Mỗi đơn hàng đã snapshot phí ship tại thời điểm tạo (lưu trong
                    <code> Order.summary.shippingFee</code> và
                    <code> Order.shipping.shippingFee</code>). Chỉ những đơn tạo
                    sau khi cập nhật mới sử dụng giá trị mới.
                  </>
                }
                style={{ marginBottom: 16 }}
              />

              {isLoading && !data ? (
                <Skeleton active />
              ) : (
                <Form
                  form={form}
                  layout="vertical"
                  disabled={updateMutation.isPending}
                  initialValues={{ fee: 0, currency: "MNT" }}
                >
                  <Form.Item
                    name="fee"
                    label="Phí ship"
                    rules={[
                      { required: true, message: "Vui lòng nhật phí ship" },
                      {
                        type: "number",
                        min: 0,
                        message: "Phí ship phải là số không âm",
                      },
                    ]}
                    extra="Phí ship sẽ được cộng vào tổng giá trị combo để ra doanh số đơn hàng."
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="VD: 30000"
                      min={0}
                      step={1000}
                    />
                  </Form.Item>

                  <Form.Item
                    name="currency"
                    label="Loại tiền tệ"
                    extra="Mặc định là MNT (đơn vị tiền hệ thống)."
                  >
                    <Select
                      options={[
                        { value: "MNT", label: "MNT - Mongolian Tugrik" },
                        { value: "VND", label: "VND - Vietnamese Dong" },
                        { value: "USD", label: "USD - US Dollar" },
                      ]}
                    />
                  </Form.Item>

                  <Space>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSubmit}
                      loading={updateMutation.isPending}
                      disabled={!hasChanges}
                    >
                      Lưu phí ship
                    </Button>
                    <Button
                      onClick={handleReset}
                      disabled={!hasChanges || updateMutation.isPending}
                    >
                      Hủy
                    </Button>
                  </Space>
                </Form>
              )}
            </Card>
          </PermissionGate>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Thông tin hiện tại" style={{ marginBottom: 16 }}>
            {isLoading && !data ? (
              <Skeleton active />
            ) : data ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Phí ship hiện tại">
                  <Statistic
                    value={data.fee}
                    suffix={data.currency}
                    styles={{ content: { color: "#1890ff", fontSize: 20 } }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Loại tiền tệ">
                  <Tag color="green">{data.currency}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật lúc">
                  {data.updatedAt
                    ? new Date(data.updatedAt).toLocaleString("vi-VN")
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Người cập nhật">
                  {data.updatedBy ?? (
                    <Text type="secondary">Mặc định từ seed</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Không có dữ liệu</Text>
            )}
          </Card>

          <Card title="Quy tắc snapshot">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>
                Mỗi <strong>đơn hàng mới</strong> sẽ snapshot phí ship hiện tại
                vào <code>Order.summary.shippingFee</code>.
              </li>
              <li>
                Snapshot <strong>không bao giờ</strong> thay đổi kể cả khi Admin cập nhật phí ship sau đó.
              </li>
              <li>
                Phí ship sẽ được <strong>cộng vào tổng giá trị combo</strong> khi
                tính doanh số đơn hàng.
              </li>
              <li>
                Doanh số = <code>subtotal_combo + shipping_fee</code>.
              </li>
            </ul>
          </Card>

          <Card
            title="Ví dụ"
            style={{ marginTop: 16 }}
            styles={{ body: { paddingTop: 0 } }}
          >
            {data ? (
              <Text type="secondary">
                Với phí ship <strong>{formatNumber(data.fee)} {data.currency}</strong>:
              </Text>
            ) : (
              <Text type="secondary">
                Với phí ship mặc định <strong>0 MNT</strong>:
              </Text>
            )}
            <div style={{ marginTop: 8 }}>
              <code>doanh_số = combo_value + {data ? formatNumber(data.fee) : "0"}</code>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">
                Ví dụ: combo 150,000 MNT + phí ship{" "}
                {data ? `${formatMNT(data.fee)}` : "0 ₮"} ={" "}
                <strong>
                  {formatMNT(150000 + (data?.fee ?? 0))}
                </strong>
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}