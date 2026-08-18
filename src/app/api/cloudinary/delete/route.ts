import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { error as errorResponse, success } from "@/utils/response";
import { createHash } from "crypto";
import { hasAccountPermission } from "@/lib/account-scope";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function generateSignature(paramsToSign: string): string {
  return createHash("sha256").update(paramsToSign).digest("hex");
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    // Only authenticated users may trigger image deletion. Staff users
    // deleting their own avatar go through the standard profile update
    // endpoint which calls this server-side hook separately (or relies
    // on Cloudinary's lifecycle policy for unused assets).
    const canDelete =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("cloudinary.delete") ||
      currentUser.permissions.includes("self-account.update") ||
      currentUser.permissions.includes("account.update");

    if (!canDelete) {
      return errorResponse("Bạn không có quyền xóa ảnh", 403);
    }

    if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.warn("Missing Cloudinary credentials for delete — skipping");
      return success({ skipped: true }, "Skipped: missing credentials");
    }

    const body = await request.json().catch(() => null);
    const publicId = body?.publicId;
    if (typeof publicId !== "string" || !publicId.trim()) {
      return errorResponse("Thiếu publicId", 400);
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = generateSignature(paramsToSign);

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Cloudinary delete failed:", errText);
      return errorResponse("Xóa ảnh trên Cloudinary thất bại", 500);
    }

    return success({ publicId }, "Đã xóa ảnh");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    return errorResponse("Không thể xóa ảnh", 500);
  }
}