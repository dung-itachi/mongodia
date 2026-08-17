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

  const isNoAnswerStatus = selectedStatus && NO_ANSWER_STATUSES.includes(selectedStatus);

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
          <span>Ghi nhận cuộc gọi</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
      destroyOnClose
    >
      {lead && (
        <div className={styles.leadInfo}>
          <Text strong>{lead.customerName}</Text>
          <Text type="secondary"> | {lead.phone || "Không có SĐT"}</Text>
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
          label="Kết quả cuộc gọi"
          rules={[{ required: true, message: "Vui lòng chọn kết quả cuộc gọi" }]}
        >
          <Select
            placeholder="Chọn kết quả cuộc gọi"
            options={statusOptions}
            onChange={handleStatusChange}
            size="large"
            showSearch
            filterOption={(input, option) =>
              (option?.label as unknown as { props: { children: SpaceProps } })
                ?.props?.children?.props?.children
                ?.toLowerCase()
                .includes(input.toLowerCase()) ?? false
            }
          />
        </Form.Item>

        {isNoAnswerStatus && (
          <Alert
            type="warning"
            message={
              <Text>
                Lead sẽ được chuyển sang trạng thái <Text strong>"Không nghe máy"</Text>.
                Số lần gọi không nghe sẽ được cập nhật.
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.CALL_BACK && (
          <Alert
            type="info"
            message={
              <Text>
                Lead sẽ được chuyển sang trạng thái <Text strong>"Đã liên hệ"</Text> và
                được hẹn gọi lại sau.
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.POTENTIAL && (
          <Alert
            type="success"
            message={
              <Text>
                Lead sẽ được chuyển sang trạng thái <Text strong>"Tiềm năng"</Text>.
                Bạn có thể tiến hành chốt đơn.
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedStatus === LeadCallStatus.CONVERTED && (
          <Alert
            type="success"
            message={
              <Text>
                Lead sẽ được chuyển sang trạng thái <Text strong>"Đã chốt"</Text>.
                Bạn có thể tiến hành tạo đơn hàng.
              </Text>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="note" label="Ghi chú (tùy chọn)">
          <TextArea
            rows={3}
            placeholder="Nhập ghi chú về cuộc gọi..."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={logCallMutation.isPending}
              icon={<PhoneOutlined />}
            >
              Ghi nhận cuộc gọi
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

const LogCallModal = memo(LogCallModalInner);
export default LogCallModal;
