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
      toast.success(t("Đã cập nhật phí ship. Order mới sẽ sử dụng giá trị này.", lang));
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
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Cài đặt hệ thống", lang), href: "/settings" },
          { label: t("Phí ship", lang) },
        ]}
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void refetch()}
            loading={isLoading}
          >
            {t("Tải lại", lang)}
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
                    {t("Cập nhật phí ship", lang)}
                  </Title>
                  <Tag color="blue">{t("Admin only", lang)}</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                title={t("Thay đổi phí ship KHÔNG ảnh hưởng đến đơn hàng đã tạo.", lang)}
                description={
                  <>
                    {t("Mỗi đơn hàng đã snapshot phí ship tại thời điểm tạo (lưu trong", lang)}
                    <code> Order.summary.shippingFee</code> {t("và", lang)}
                    <code> Order.shipping.shippingFee</code>). {t("Chỉ những đơn tạo sau khi cập nhật mới sử dụng giá trị mới.", lang)}
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
                    label={t("Phí ship", lang)}
                    rules={[
                      { required: true, message: t("Vui lòng nhật phí ship", lang) },
                      {
                        type: "number",
                        min: 0,
                        message: t("Phí ship phải là số không âm", lang),
                      },
                    ]}
                    extra={t("Phí ship sẽ được cộng vào tổng giá trị combo để ra doanh số đơn hàng.", lang)}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder={t("VD: 30000", lang)}
                      min={0}
                      step={1000}
                    />
                  </Form.Item>

                  <Form.Item
                    name="currency"
                    label={t("Loại tiền tệ", lang)}
                    extra={t("Mặc định là MNT (đơn vị tiền hệ thống).", lang)}
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
                      {t("Lưu phí ship", lang)}
                    </Button>
                    <Button
                      onClick={handleReset}
                      disabled={!hasChanges || updateMutation.isPending}
                    >
                      {t("Hủy", lang)}
                    </Button>
                  </Space>
                </Form>
              )}
            </Card>
          </PermissionGate>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={t("Thông tin hiện tại", lang)} style={{ marginBottom: 16 }}>
            {isLoading && !data ? (
              <Skeleton active />
            ) : data ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={t("Phí ship hiện tại", lang)}>
                  <Statistic
                    value={data.fee}
                    suffix={data.currency}
                    styles={{ content: { color: "#1890ff", fontSize: 20 } }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label={t("Loại tiền tệ", lang)}>
                  <Tag color="green">{data.currency}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t("Cập nhật lúc", lang)}>
                  {data.updatedAt
                    ? new Date(data.updatedAt).toLocaleString("vi-VN")
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label={t("Người cập nhật", lang)}>
                  {data.updatedBy ?? (
                    <Text type="secondary">{t("Mặc định từ seed", lang)}</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">{t("Không có dữ liệu", lang)}</Text>
            )}
          </Card>

          <Card title={t("Quy tắc snapshot", lang)}>
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>
                {t("Mỗi", lang)} <strong>{t("đơn hàng mới", lang)}</strong> {t("sẽ snapshot phí ship hiện tại vào", lang)} <code>Order.summary.shippingFee</code>.
              </li>
              <li>
                {t("Snapshot", lang)} <strong>{t("không bao giờ", lang)}</strong> {t("thay đổi kể cả khi Admin cập nhật phí ship sau đó.", lang)}
              </li>
              <li>
                {t("Phí ship sẽ được", lang)} <strong>{t("cộng vào tổng giá trị combo", lang)}</strong> {t("khi tính doanh số đơn hàng.", lang)}
              </li>
              <li>
                {t("Doanh số =", lang)} <code>subtotal_combo + shipping_fee</code>.
              </li>
            </ul>
          </Card>

          <Card
            title={t("Ví dụ", lang)}
            style={{ marginTop: 16 }}
            styles={{ body: { paddingTop: 0 } }}
          >
            {data ? (
              <Text type="secondary">
                {t("Với phí ship", lang)} <strong>{formatNumber(data.fee)} {data.currency}</strong>:
              </Text>
            ) : (
              <Text type="secondary">
                {t("Với phí ship mặc định", lang)} <strong>0 MNT</strong>:
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