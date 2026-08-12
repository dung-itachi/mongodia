import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i, "ID không hợp lệ");
const optionalId = id.nullable().optional();

const bankFields = {
  bankName: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().max(50).optional(),
  bankAccountHolder: z.string().trim().max(200).optional(),
};

const identity = {
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  avatar: z.string().trim().max(500).optional(),
  ...bankFields,
};

export const createAccountSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
  ...identity,
  roleCode: z.string().trim().min(1).max(30),
  teamId: optionalId,
  leaderId: optionalId,
}).strict();

export const updateAccountSchema = z.object({
  ...identity,
  roleCode: z.string().trim().min(1).max(30).optional(),
  teamId: optionalId,
  leaderId: optionalId,
  isActive: z.boolean().optional(),
}).strict();

export const updateMyProfileSchema = z.object(identity).strict();

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
}).strict();

export const resetAccountPasswordSchema = z.object({
  newPassword: z.string().min(6).max(100),
}).strict();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
