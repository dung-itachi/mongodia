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

export const COMPRESS_LINKS: { label: string; url: string }[] = [
  { label: "imagecompressor.com", url: "https://imagecompressor.com/vi/" },
  { label: "iloveimg.com", url: "https://www.iloveimg.com/vi/nen-anh" },
  { label: "compress2go.com", url: "https://www.compress2go.com/vi/compress-image" },
  { label: "img2go.com", url: "https://www.img2go.com/vi/compress-image" },
  { label: "chungdoi.com", url: "https://chungdoi.com/vi/giam-dung-luong-anh" },
  { label: "websiteplanet.com", url: "https://www.websiteplanet.com/vi/webtools/imagecompressor/" },
  { label: "trantienduy.com", url: "https://trantienduy.com/giam-dung-luong-hinh-anh/" },
  { label: "snapedit.app", url: "https://snapedit.app/vi/compress-image" },
  { label: "smallpdf.com", url: "https://smallpdf.com/blog/compress-jpeg" },
];

export type ValidationErrorCode = "size" | "type";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  fileSizeMB?: number;
}

function validateFile(file: File): ValidationError | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      code: "type",
      message: "Chỉ chấp nhận file JPG, PNG hoặc WebP",
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: "size",
      message: `File vượt quá giới hạn 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
      fileSizeMB: file.size / (1024 * 1024),
    };
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
    throw error;
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    const envError: ValidationError = {
      code: "type",
      message: "Thiếu cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường.",
    };
    throw envError;
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
    const validationErr = err as ValidationError;
    if (validationErr && typeof validationErr === "object" && validationErr.code) {
      // Validation errors should be displayed by the caller (via modal)
      throw err;
    }
    if (err instanceof Error) {
      if (err.message.includes("Failed to fetch")) {
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

export function getAvatarDisplayUrl(url: string | undefined | null): string | undefined {
  if (!url || url.trim() === "") return undefined;
  return url;
}

/**
 * Extract public_id from a Cloudinary URL.
 * e.g. https://res.cloudinary.com/cloud-name/image/upload/v1234567890/avatars/abc123.jpg
 * returns "avatars/abc123"
 */
export function extractPublicId(url: string | undefined | null): string | null {
  if (!url) return null;

  // Match: res.cloudinary.com/{cloud_name}/image/upload[/v{version}]/{public_id}
  const match = url.match(/res\.cloudinary\.com\/[^/]+\/image\/upload(?:\/v\d+)?\/(.+?)(?:\.jpg|\.png|\.jpeg|\.webp|\.gif)?$/i);
  if (!match) return null;

  return match[1];
}

/**
 * Call the server-side delete endpoint that signs the request with the
 * Cloudinary API secret. Never expose the secret to the client.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  try {
    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
  } catch (err) {
    console.warn("Failed to delete old Cloudinary image:", publicId, err);
  }
}
