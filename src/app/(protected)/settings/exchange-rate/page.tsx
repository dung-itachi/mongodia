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

const { Text, Title } = Typography;

export default function ExchangeRateSettingsPage() {
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
      <PageHeader
        title="Tỷ giá tiền tệ"
        subtitle="Quản lý tỷ giá quy đổi MNT sang VND"
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Cài đặt hệ thống", href: "/settings" },
          { label: "Tỷ giá tiền tệ" },
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
                    Cập nhật tỷ giá
                  </Title>
                  <Tag color="blue">Admin only</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                title="Thay đổi tỷ giá KHÔNG ảnh hưởng đến đơn hàng đã tạo."
                description={
                  <>
                    Mỗi đơn hàng đã snapshot tỷ giá tại thời điểm tạo (lưu trong <code>exchangeRate</code> + <code>exchangeRateDate</code>).
                    Chỉ những đơn tạo sau khi cập nhật mới sử dụng tỷ giá mới.
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
                    label="Tỷ giá (1 MNT sang VND)"
                    rules={[
                      { required: true, message: "Vui lòng nhập tỷ giá" },
                      {
                        type: "number",
                        min: 0.01,
                        message: "Tỷ giá phải lớn hơn 0",
                      },
                    ]}
                    extra="Nhập số VND tương ứng với 1 MNT. Ví dụ: 7.00"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="VD: 7.00"
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
                      Lưu tỷ giá
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
                <Descriptions.Item label="Tỷ giá hiện tại">
                  <Statistic
                    value={data.rate}
                    suffix="VND/MNT"
                    prefix="1 MNT = "
                    styles={{ content: { color: "#1890ff", fontSize: 20 } }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị tiền tệ gốc">
                  <Tag color="green">MNT - Mongolian Tugrik</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị quy đổi">
                  <Tag color="orange">VND - Vietnamese Dong</Tag>
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
                Mỗi <strong>đơn hàng mới</strong> sẽ snapshot tỷ giá hiện tại
                vào <code>Order.exchangeRate</code>.
              </li>
              <li>
                Snapshot <strong>không bao giờ</strong> thay đổi kể cả khi Admin cập nhật tỷ giá sau đó.
              </li>
              <li>
                Đơn vị tiền hiển thị trên UI là <strong>MNT</strong> cho tất cả các màn hình bán hàng.
              </li>
              <li>
                Tỷ giá dùng để quy đổi <strong>doanh thu MNT sang VND</strong> trên các báo cáo.
              </li>
            </ul>
          </Card>

          <Card
            title="Ví dụ"
            style={{ marginTop: 16 }}
            styles={{ body: { paddingTop: 0 } }}
          >
            {data ? (
              <>
                <Text type="secondary">
                  Với tỷ giá <strong>1 MNT = {formatNumber(data.rate)} VND</strong>:
                </Text>
                <div style={{ marginTop: 8 }}>
                  <code>100,000 MNT = {formatVND(convertMNTtoVND(100000, data.rate))}</code>
                </div>
              </>
            ) : (
              <>
                <Text type="secondary">
                  Với tỷ giá mặc định <strong>1 MNT = 7.00 VND</strong>:
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