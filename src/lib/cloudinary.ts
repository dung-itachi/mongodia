"use client";

import { message as antMessage } from "antd";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1600;
const QUALITY = 0.8;

interface UploadResult {
  secure_url: string;
  public_id: string;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Chỉ chấp nhận file JPG, PNG hoặc WebP";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File vượt quá giới hạn 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB). Hãy nén ảnh trước khi upload tại: https://imagecompressor.com/vi/ | https://www.iloveimg.com/vi/nen-anh | https://www.compress2go.com/vi/compress-image | https://www.img2go.com/vi/compress-image | https://chungdoi.com/vi/giam-dung-luong-anh | https://www.websiteplanet.com/vi/webtools/imagecompressor/ | https://trantienduy.com/giam-dung-luong-hinh-anh/ | https://snapedit.app/vi/compress-image | https://smallpdf.com/blog/compress-jpeg`;
  }
  return null;
}

async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          width = MAX_DIMENSION;
          height = Math.round(width / aspectRatio);
        } else {
          height = MAX_DIMENSION;
          width = Math.round(height * aspectRatio);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg";
            const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const error = validateFile(file);
  if (error) {
    antMessage.error(error);
    throw new Error(error);
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    const envError = "Thiếu cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường.";
    antMessage.error(envError);
    throw new Error(envError);
  }

  const resizedFile = await resizeImage(file);

  if (resizedFile.size < file.size && onProgress) {
    const sizeDiff = ((file.size - resizedFile.size) / file.size * 100).toFixed(0);
    antMessage.info(`Ảnh được nén giảm ${sizeDiff}%`);
  }

  const formData = new FormData();
  formData.append("file", resizedFile);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    if (onProgress) onProgress(10);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (onProgress) onProgress(80);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Upload thất bại");
    }

    const result: UploadResult = await response.json();

    if (onProgress) onProgress(100);

    return result;
  } catch (err) {
    if (err instanceof Error) {
      if (err.antMessage.includes("Failed to fetch")) {
        antMessage.error("Không thể kết nối Cloudinary. Vui lòng kiểm tra kết nối mạng.");
      } else {
        antMessage.error(err.message);
      }
    } else {
      antMessage.error("Upload thất bại");
    }
    throw err;
  }
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

export function getAvatarDisplayUrl(url: string | undefined | null): string | null {
  if (!url || url.trim() === "") return null;
  return url;
}
