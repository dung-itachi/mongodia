import { z } from "zod";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadSource } from "@/constants/leadSource";

export const marketingLeadFormSchema = z.object({
  customerName: z.string().trim().min(1, "Tên khách hàng là bắt buộc"),
  phone: z
    .string()
    .trim()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(/^[0-9+\s().-]{8,20}$/, "Số điện thoại không hợp lệ"),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  source: z.nativeEnum(LeadSource),
  status: z.nativeEnum(LeadStatus),
  note: z.string().trim().max(1000, "Ghi chú tối đa 1000 ký tự").optional(),
});

export type MarketingLeadForm = z.infer<typeof marketingLeadFormSchema>;

export const defaultLeadForm: MarketingLeadForm = {
  customerName: "",
  phone: "",
  email: "",
  source: LeadSource.FACEBOOK_COMMENT,
  status: LeadStatus.NEW,
  note: "",
};
