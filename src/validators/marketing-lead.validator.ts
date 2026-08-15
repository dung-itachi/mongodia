import { z } from "zod";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadSource } from "@/constants/leadSource";

export const marketingLeadFormSchema = z.object({
  customerName: z.string().trim().min(1, "Tên khách hàng là bắt buộc"),
  phone: z
    .string()
    .trim()
    .min(8, "Số điện thoại tối thiểu 8 ký tự")
    .max(20, "Số điện thoại tối đa 20 ký tự"),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  source: z.nativeEnum(LeadSource),
  status: z.nativeEnum(LeadStatus),
  note: z.string().trim().max(1000, "Ghi chú tối đa 1000 ký tự").optional(),
  /** Facebook Page ID — optional (Sprint 8.6). Empty string is treated as unset. */
  facebookPageId: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  /** Combo ID — optional. Empty string is treated as unset. */
  comboId: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  /** Product ID — optional. Empty string is treated as unset. */
  productId: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  /** Free-text address (Sprint 9.x). */
  address: z
    .string()
    .trim()
    .max(500, "Địa chỉ tối đa 500 ký tự")
    .optional()
    .or(z.literal("")),
});

export type MarketingLeadForm = z.infer<typeof marketingLeadFormSchema>;

export const defaultLeadForm: MarketingLeadForm = {
  customerName: "",
  phone: "",
  email: "",
  source: LeadSource.FACEBOOK_COMMENT,
  status: LeadStatus.NEW,
  note: "",
  facebookPageId: "",
  comboId: "",
  productId: "",
  address: "",
};
