/**
 * Trang Cài đặt Tỷ giá Tiền tệ (MNT sang VND)
 *
 * Admin có thể xem/cập nhật tỷ giá 1 MNT sang VND.
 * Order snapshot tại thời điểm tạo; thay đổi tỷ giá KHÔNG ảnh hưởng Order cũ.
 *
 * Business: Tỷ giá dùng để quy đổi doanh thu MNT sang VND cho báo cáo.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Form,
  InputNumber,
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
  useExchangeRate,
  useUpdateExchangeRate,
} from "@/hooks/useExchangeRate";
import { formatNumber, formatVND, convertMNTtoVND } from "@/lib/format";
import { toast } from "@/components/common/feedback/Toast";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { Text, Title } = Typography;

export default function ExchangeRateSettingsPage() {
  const lang = useLanguageStore((s) => s.language);
  const { data, isLoading, refetch } = useExchangeRate();
  const updateMutation = useUpdateExchangeRate();
  const [form] = Form.useForm<{ rate: number }>();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data) {
      form.setFieldsValue({ rate: data.rate });
      setHasChanges(false);
    }
  }, [data, form]);

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({ rate: values.rate });
      toast.success("Đã cập nhật tỷ giá. Order mới sẽ sử dụng tỷ giá này.");
      setHasChanges(false);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    }
  };

  const handleReset = () => {
    if (data) {
      form.setFieldsValue({ rate: data.rate });
      setHasChanges(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t("Tỷ giá tiền tệ", lang)} subtitle={t("Quản lý tỷ giá quy đổi MNT sang VND", lang)}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Cài đặt hệ thống", lang), href: "/settings" },
          { label: t("Tỷ giá tiền tệ", lang) },
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
                    {t("Cập nhật tỷ giá", lang)}
                  </Title>
                  <Tag color="blue">{t("Admin only", lang)}</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                title={t("Thay đổi tỷ giá KHÔNG ảnh hưởng đến đơn hàng đã tạo.", lang)}
                description={
                  <>
                    {t("Mỗi đơn hàng đã snapshot tỷ giá tại thời điểm tạo (lưu trong", lang)} <code>exchangeRate</code> + <code>exchangeRateDate</code>). {t("Chỉ những đơn tạo sau khi cập nhật mới sử dụng tỷ giá mới.", lang)}
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
                  onValuesChange={handleValuesChange}
                  disabled={updateMutation.isPending}
                >
                  <Form.Item
                    name="rate"
                    label={t("Tỷ giá (1 MNT sang VND)", lang)}
                    rules={[
                      { required: true, message: t("Vui lòng nhập tỷ giá", lang) },
                      {
                        type: "number",
                        min: 0.01,
                        message: t("Tỷ giá phải lớn hơn 0", lang),
                      },
                    ]}
                    extra={t("Nhập số VND tương ứng với 1 MNT. Ví dụ: 7.00", lang)}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder={t("VD: 7.00", lang)}
                      min={0.01}
                      step={0.5}
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
                      {t("Lưu tỷ giá", lang)}
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
                <Descriptions.Item label={t("Tỷ giá hiện tại", lang)}>
                  <Statistic
                    value={data.rate}
                    suffix="VND/MNT"
                    prefix="1 MNT = "
                    styles={{ content: { color: "#1890ff", fontSize: 20 } }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label={t("Đơn vị tiền tệ gốc", lang)}>
                  <Tag color="green">MNT - Mongolian Tugrik</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t("Đơn vị quy đổi", lang)}>
                  <Tag color="orange">VND - Vietnamese Dong</Tag>
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
                {t("Mỗi", lang)} <strong>{t("đơn hàng mới", lang)}</strong> {t("sẽ snapshot tỷ giá hiện tại vào", lang)} <code>Order.exchangeRate</code>.
              </li>
              <li>
                {t("Snapshot", lang)} <strong>{t("không bao giờ", lang)}</strong> {t("thay đổi kể cả khi Admin cập nhật tỷ giá sau đó.", lang)}
              </li>
              <li>
                {t("Đơn vị tiền hiển thị trên UI là", lang)} <strong>MNT</strong> {t("cho tất cả các màn hình bán hàng.", lang)}
              </li>
              <li>
                {t("Tỷ giá dùng để quy đổi", lang)} <strong>{t("doanh thu MNT sang VND", lang)}</strong> {t("trên các báo cáo.", lang)}
              </li>
            </ul>
          </Card>

          <Card
            title={t("Ví dụ", lang)}
            style={{ marginTop: 16 }}
            styles={{ body: { paddingTop: 0 } }}
          >
            {data ? (
              <>
                <Text type="secondary">
                  {t("Với tỷ giá", lang)} <strong>1 MNT = {formatNumber(data.rate)} VND</strong>:
                </Text>
                <div style={{ marginTop: 8 }}>
                  <code>100,000 MNT = {formatVND(convertMNTtoVND(100000, data.rate))}</code>
                </div>
              </>
            ) : (
              <>
                <Text type="secondary">
                  {t("Với tỷ giá mặc định", lang)} <strong>1 MNT = 7.00 VND</strong>:
                </Text>
                <div style={{ marginTop: 8 }}>
                  <code>100,000 MNT = 700,000 VND</code>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}