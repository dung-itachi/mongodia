/**
 * Log Call Modal Component (Module 6 - Nhật ký cuộc gọi)
 *
 * Modal để Sale ghi nhận cuộc gọi cho Lead.
 */

import { memo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
} from "antd";
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useLogCall } from "@/hooks/useLeadCallLog";
import {
  LeadCallStatus,
  LEAD_CALL_STATUS_LABELS,
  NO_ANSWER_STATUSES,
} from "@/constants/leadCallStatus";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { SaleLead } from "@/hooks/useSaleLeads";
import styles from "./log-call-modal.module.css";

const { TextArea } = Input;
const { Text } = Typography;

interface LogCallModalProps {
  open: boolean;
  lead: SaleLead | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Icons cho từng trạng thái */
function getStatusIcon(status: LeadCallStatus) {
  switch (status) {
    case LeadCallStatus.CONVERTED:
      return <SwapOutlined />;
    case LeadCallStatus.POTENTIAL:
      return <CheckCircleOutlined />;
    case LeadCallStatus.CALL_BACK:
      return <FieldTimeOutlined />;
    case LeadCallStatus.NO_ANSWER:
    case LeadCallStatus.BUSY:
      return <CloseCircleOutlined />;
    case LeadCallStatus.WRONG_NUMBER:
    case LeadCallStatus.NOT_INTERESTED:
      return <ExclamationCircleOutlined />;
    default:
      return <PhoneOutlined />;
  }
}

function LogCallModalInner({ open, lead, onClose, onSuccess }: LogCallModalProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm();
  const [selectedStatus, setSelectedStatus] = useState<LeadCallStatus | null>(null);

  const logCallMutation = useLogCall();

  const handleStatusChange = (status: LeadCallStatus) => {
    setSelectedStatus(status);
  };

  const handleSubmit = async (values: { status: LeadCallStatus; note?: string }) => {
    if (!lead) return;

    try {
      await logCallMutation.mutateAsync({
        leadId: lead._id,
        payload: {
          status: values.status,
          note: values.note,
        },
      });

      form.resetFields();
      setSelectedStatus(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to log call:", error);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedStatus(null);
    onClose();
  };

  const isNoAnswerStatus =
    selectedStatus !== null &&
    (NO_ANSWER_STATUSES as readonly LeadCallStatus[]).includes(selectedStatus);

  // Render options cho select
  const statusOptions = Object.values(LeadCallStatus).map((status) => ({
    value: status,
    label: (
      <Space>
        {getStatusIcon(status)}
        {LEAD_CALL_STATUS_LABELS[status]}
      </Space>
    ),
  }));

  return (
    <Modal
      title={
        <Space>
          <PhoneOutlined />
          <span>{t("Ghi nhận cuộc gọi", lang)}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
      destroyOnHidden
    >
      {lead && (
        <div className={styles.leadInfo}>
          <Text strong>{lead.customerName}</Text>
          <Text type="secondary"> | {lead.phone || t("Không có SĐT", lang)}</Text>
          <Divider style={{ margin: "8px 0" }} />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: undefined,
          note: "",
        }}
      >
        <Form.Item
          name="status"
          label={t("Kết quả cuộc gọi", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn kết quả cuộc gọi", lang) }]}
        >
          <Select
            placeholder={t("Chọn kết quả cuộc gọi", lang)}
            options={statusOptions}
            onChange={handleStatusChange}
            size="large"
            showSearch
            filterOption={(input, option) => {
              const labelRaw = (option?.label ?? "") as unknown as
                | { props?: { children?: unknown } }
                | string;
              const nested =
                typeof labelRaw === "string"
                  ? labelRaw
                  : (labelRaw?.props?.children as unknown) ?? "";
              return String(nested)
                .toLowerCase()
                .includes(input.toLowerCase());
            }}
          />
        </Form.Item>

        {isNoAnswerStatus && (
          <Alert
            type="warning"
            title={
              <Text>
                {t("Khách hàng sẽ được chuyển sang trạng thái", lang)} <Text strong>&quot;{t("Không nghe máy", lang)}&quot;</Text>.
                {t("Số lần gọi không nghe sẽ được cập nhật.", lang)}
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.CALL_BACK && (
          <Alert
            type="info"
            title={
              <Text>
                {t("Khách hàng sẽ được chuyển sang trạng thái", lang)} <Text strong>&quot;{t("Đã liên hệ", lang)}&quot;</Text> {t("và được hẹn gọi lại sau.", lang)}
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.POTENTIAL && (
          <Alert
            type="success"
            title={
              <Text>
                {t("Khách hàng sẽ được chuyển sang trạng thái", lang)} <Text strong>&quot;{t("Tiềm năng", lang)}&quot;</Text>.
                {t("Bạn có thể tiến hành chốt đơn.", lang)}
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.CONVERTED && (
          <Alert
            type="success"
            title={
              <Text>
                {t("Khách hàng sẽ được chuyển sang trạng thái", lang)} <Text strong>&quot;{t("Đã chốt", lang)}&quot;</Text>.
                {t("Bạn có thể tiến hành tạo đơn hàng.", lang)}
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="note" label={t("Ghi chú (tùy chọn)", lang)}>
          <TextArea
            rows={3}
            placeholder={t("Nhập ghi chú về cuộc gọi...", lang)}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>{t("Hủy", lang)}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={logCallMutation.isPending}
              icon={<PhoneOutlined />}
            >
              {t("Ghi nhận cuộc gọi", lang)}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

const LogCallModal = memo(LogCallModalInner);
export default LogCallModal;
