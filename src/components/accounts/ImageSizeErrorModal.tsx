"use client";

import { useState } from "react";
import { Button, Modal, Space, Typography } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { COMPRESS_LINKS } from "@/lib/cloudinary";

export type ImageSizeErrorModalProps = {
  open: boolean;
  onClose: () => void;
  fileSizeMB?: number;
};

const PREVIEW_COUNT = 4;

export default function ImageSizeErrorModal({
  open,
  onClose,
  fileSizeMB,
}: ImageSizeErrorModalProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleLinks = expanded ? COMPRESS_LINKS : COMPRESS_LINKS.slice(0, PREVIEW_COUNT);
  const hasMore = COMPRESS_LINKS.length > PREVIEW_COUNT;

  return (
    <Modal
      title="Ảnh vượt quá giới hạn cho phép"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="ok" type="primary" onClick={onClose}>
          Đã hiểu
        </Button>,
      ]}
      width={520}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {fileSizeMB != null ? (
            <>
              Ảnh của bạn có dung lượng{" "}
              <Typography.Text strong>{fileSizeMB.toFixed(2)}MB</Typography.Text>,
              vượt quá giới hạn <Typography.Text strong>5MB</Typography.Text>. Vui lòng nén ảnh
              trước khi tải lên bằng một trong các công cụ dưới đây:
            </>
          ) : (
            <>Vui lòng nén ảnh trước khi tải lên bằng một trong các công cụ dưới đây:</>
          )}
        </Typography.Paragraph>

        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {visibleLinks.map((item, index) => (
            <div
              key={item.url}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom:
                  index === visibleLinks.length - 1 ? "none" : "1px solid #f0f0f0",
              }}
            >
              <Typography.Text>
                {index + 1}. {item.label}
              </Typography.Text>
              <Typography.Link href={item.url} target="_blank" rel="noopener noreferrer">
                Mở trang
              </Typography.Link>
            </div>
          ))}
        </div>

        {hasMore && (
          <div style={{ textAlign: "center" }}>
            <Button
              type="link"
              onClick={() => setExpanded((prev) => !prev)}
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
            >
              {expanded
                ? "Thu gọn"
                : `Mở rộng (còn ${COMPRESS_LINKS.length - PREVIEW_COUNT} link khác)`}
            </Button>
          </div>
        )}
      </Space>
    </Modal>
  );
}
