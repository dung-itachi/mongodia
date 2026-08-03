/**
 * UploadImage Component (Sprint 3.1 - Complete UI Kit)
 *
 * Image upload with preview support.
 * Types: avatar, product, facebook
 */

import { Upload, Modal } from "antd";
import { useState } from "react";
import type { UploadProps } from "antd";

export type UploadImageType = "avatar" | "product" | "facebook";

export type UploadImageProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  type?: UploadImageType;
  /** Max file size in MB */
  maxSize?: number;
  /** Accept file types */
  accept?: string;
  /** Disabled state */
  disabled?: boolean;
};

const typeConfig: Record<
  UploadImageType,
  { width: number; height: number; shape: "square" | "circle" }
> = {
  avatar: { width: 120, height: 120, shape: "circle" },
  product: { width: 200, height: 200, shape: "square" },
  facebook: { width: 200, height: 200, shape: "square" },
};

export default function UploadImage({
  value,
  onChange,
  type = "product",
  maxSize = 5,
  accept = "image/*",
  disabled = false,
}: UploadImageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const config = typeConfig[type];

  const handleChange: UploadProps["onChange"] = ({ fileList }) => {
    if (fileList.length > 0) {
      const file = fileList[0];
      if (file.response?.url) {
        onChange?.(file.response.url);
      } else if (file.url) {
        onChange?.(file.url);
      } else if (file.originFileObj) {
        // Create local URL for preview
        const url = URL.createObjectURL(file.originFileObj);
        onChange?.(url);
      }
    } else {
      onChange?.(undefined);
    }
  };

  const handlePreview = async (file: unknown) => {
    let url = "";
    const f = file as { url?: string; originFileObj?: Blob };
    if (f.url) {
      url = f.url;
    } else if (f.originFileObj) {
      url = URL.createObjectURL(f.originFileObj);
    }
    setPreviewImage(url);
    setPreviewOpen(true);
  };

  const uploadButton =
    value ? null : (
      <div
        style={{
          width: config.width,
          height: config.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #d9d9d9",
          borderRadius: config.shape === "circle" ? "50%" : 8,
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: "#fafafa",
          color: "#8c8c8c",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 20 }}>+</div>
          <div>Upload</div>
        </div>
      </div>
    );

  const imagePreview =
    value && config.shape === "circle" ? (
      <img
        src={value}
        alt="preview"
        style={{
          width: config.width,
          height: config.height,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    ) : value ? (
      <img
        src={value}
        alt="preview"
        style={{
          width: config.width,
          height: config.height,
          borderRadius: 8,
          objectFit: "cover",
        }}
      />
    ) : null;

  return (
    <div>
      <Upload
        name="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        onPreview={handlePreview}
        showUploadList={false}
        // Customize based on your upload API
        customRequest={({ file, onSuccess }) => {
          setTimeout(() => {
            onSuccess?.({ url: URL.createObjectURL(file as Blob) });
          }, 0);
        }}
      >
        {imagePreview || uploadButton}
      </Upload>
      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img
          alt="preview"
          style={{ width: "100%" }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
}
