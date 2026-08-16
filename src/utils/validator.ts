import { z } from "zod";

import {
  InventoryAction,
  InventoryReason,
  InventorySource,
  InventoryTransactionType,
  InventoryReferenceType,
} from "@/constants/inventoryStatus";
import { LeadStatus } from "@/constants/leadStatus";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "TÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 3 kÃƒÂ½ tÃ¡Â»Â±"),

  password: z
    .string()
    .min(6, "MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 6 kÃƒÂ½ tÃ¡Â»Â±"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export const createEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "TÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 3 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "TÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p tÃ¡Â»â€˜i Ã„â€˜a 50 kÃƒÂ½ tÃ¡Â»Â±"),

  password: z
    .string()
    .min(6, "MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 6 kÃƒÂ½ tÃ¡Â»Â±"),

  fullName: z
    .string()
    .trim()
    .min(2, "HÃ¡Â»Â tÃƒÂªn khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  email: z
    .email("Email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trÃƒÂ² lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  teamCode: z.string().nullable().optional(),

  bankName: z.string().optional(),

  bankAccountNumber: z.string().optional(),

  bankAccountHolder: z.string().optional(),
});
export const updateEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "TÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 3 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "TÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p tÃ¡Â»â€˜i Ã„â€˜a 50 kÃƒÂ½ tÃ¡Â»Â±"),

  fullName: z
    .string()
    .trim()
    .min(2, "HÃ¡Â»Â tÃƒÂªn khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .max(100, "HÃ¡Â»Â tÃƒÂªn tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

    email: z
    .email("Email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trÃƒÂ² lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  teamCode: z.string().nullable().optional(),

  bankName: z.string().optional(),

  bankAccountNumber: z.string().optional(),

  bankAccountHolder: z.string().optional(),

  isActive: z.boolean(),
});
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .trim()
    .min(6, "MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 6 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),
});

export type ResetPasswordForm = z.infer<
  typeof resetPasswordSchema
>;
export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ vai trÃƒÂ² tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ vai trÃƒÂ² tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn vai trÃƒÂ² tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn vai trÃƒÂ² tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  description: z.string().trim().optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ vai trÃƒÂ² tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ vai trÃƒÂ² tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn vai trÃƒÂ² tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn vai trÃƒÂ² tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  description: z.string().trim().optional(),

  isActive: z.boolean(),
});

export type UpdateRoleForm = z.infer<typeof updateRoleSchema>;

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ phÃƒÂ²ng ban tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn phÃƒÂ²ng ban tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100),
});

export const updateDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(30),

  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  isActive: z.boolean(),
});

export const createAreaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ khu vÃ¡Â»Â±c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ khu vÃ¡Â»Â±c tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn khu vÃ¡Â»Â±c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn khu vÃ¡Â»Â±c tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ quÃ¡Â»â€˜c gia khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .max(5, "MÃƒÂ£ quÃ¡Â»â€˜c gia khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),
});

export const updateAreaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ khu vÃ¡Â»Â±c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ khu vÃ¡Â»Â±c tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn khu vÃ¡Â»Â±c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn khu vÃ¡Â»Â±c tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ quÃ¡Â»â€˜c gia khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .max(5, "MÃƒÂ£ quÃ¡Â»â€˜c gia khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  isActive: z.boolean(),
});

export const createTeamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ nhÃƒÂ³m tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ nhÃƒÂ³m tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn nhÃƒÂ³m tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn nhÃƒÂ³m tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  departmentCode: z
    .string()
    .trim()
    .min(1, "PhÃƒÂ²ng ban lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  areaCode: z
    .string()
    .trim()
    .min(1, "Khu vÃ¡Â»Â±c lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  leaderCode: z.string().nullable().optional(),

  managerCode: z.string().nullable().optional(),
});

export const updateTeamSchema = createTeamSchema.extend({
  isActive: z.boolean({
    message: "Trạng thái hoạt động không hợp lệ",
  }),
  areaCode: z.string().nullable().optional(),
});

export const createCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ danh mÃ¡Â»Â¥c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(20, "MÃƒÂ£ danh mÃ¡Â»Â¥c tÃ¡Â»â€˜i Ã„â€˜a 20 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn danh mÃ¡Â»Â¥c phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn danh mÃ¡Â»Â¥c tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  parentCode: z
    .string()
    .trim()
    .nullable()
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "MÃƒÂ´ tÃ¡ÂºÂ£ tÃ¡Â»â€˜i Ã„â€˜a 500 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  sortOrder: z
    .number({
      error: "ThÃ¡Â»Â© tÃ¡Â»Â± phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜",
    })
    .default(0),
});

export const updateCategorySchema =
  createCategorySchema.extend({
    isActive: z.boolean({
      error: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

  export const createProductSchema = z.object({
    code: z
      .string()
      .min(2, "MÃƒÂ£ sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
      .max(50, "MÃƒÂ£ sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 50 kÃƒÂ½ tÃ¡Â»Â±"),
  
    name: z
      .string()
      .min(2, "TÃƒÂªn sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
      .max(200, "TÃƒÂªn sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 200 kÃƒÂ½ tÃ¡Â»Â±"),
  
    categoryCode: z
      .string()
      .min(2, "MÃƒÂ£ danh mÃ¡Â»Â¥c khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),
  
    image: z
      .string()
      .optional()
      .default(""),
  
    description: z
      .string()
      .optional()
      .default(""),
  });

  export const updateProductSchema =
  createProductSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

  export const createVariantOptionSchema = z.object({
    code: z
      .string()
      .min(2, "MÃƒÂ£ thuÃ¡Â»â„¢c tÃƒÂ­nh phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
      .max(50, "MÃƒÂ£ thuÃ¡Â»â„¢c tÃƒÂ­nh khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 50 kÃƒÂ½ tÃ¡Â»Â±"),
  
    name: z
      .string()
      .min(2, "TÃƒÂªn thuÃ¡Â»â„¢c tÃƒÂ­nh phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
      .max(100, "TÃƒÂªn thuÃ¡Â»â„¢c tÃƒÂ­nh khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 100 kÃƒÂ½ tÃ¡Â»Â±"),
  
    sortOrder: z.number().optional().default(0),
  });
  
  export const updateVariantOptionSchema =
  createVariantOptionSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createVariantValueSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ giÃƒÂ¡ trÃ¡Â»â€¹ phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "MÃƒÂ£ giÃƒÂ¡ trÃ¡Â»â€¹ khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 50 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn giÃƒÂ¡ trÃ¡Â»â€¹ phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn giÃƒÂ¡ trÃ¡Â»â€¹ khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ¡ 100 kÃƒÂ½ tÃ¡Â»Â±"),

  variantOptionId: z
    .string({
      message: "ThuÃ¡Â»â„¢c tÃƒÂ­nh biÃ¡ÂºÂ¿n thÃ¡Â»Æ’ khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "ThuÃ¡Â»â„¢c tÃƒÂ­nh biÃ¡ÂºÂ¿n thÃ¡Â»Æ’ khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  sortOrder: z.number().default(0),
});

export const updateVariantValueSchema =
  createVariantValueSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createProductVariantSchema = z.object({
  productId: z
    .string({
      message: "SÃ¡ÂºÂ£n phÃ¡ÂºÂ©m khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "SÃ¡ÂºÂ£n phÃ¡ÂºÂ©m khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  sku: z
    .string()
    .trim()
    .min(2, "SKU phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "SKU tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  barcode: z
    .string()
    .trim()
    .default(""),

  image: z
    .string()
    .trim()
    .default(""),

  variantValues: z
    .array(z.string())
    .min(1, "Vui long chon it nhat mot gia tri bien the"), // fixed-line-403

  // Sprint 8.x: Variant KHÔNG có giá bán — giá nằm ở Combo.
  // Field price bị bỏ khỏi validator; backend luôn set price=0 khi tạo/sửa.
  // Giữ comment để trace lý do nếu sau này cần khôi phục.

  cost: z.number().default(0),

  weight: z.number().default(0),

  sortOrder: z.number().default(0),
});

export const updateProductVariantSchema =
  createProductVariantSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ nhÃƒÂ  cung cÃ¡ÂºÂ¥p phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "MÃƒÂ£ nhÃƒÂ  cung cÃ¡ÂºÂ¥p tÃ¡Â»â€˜i Ã„â€˜a 50 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn nhÃƒÂ  cung cÃ¡ÂºÂ¥p phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn nhÃƒÂ  cung cÃ¡ÂºÂ¥p tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{8,20}$/, "SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  email: z
    .string()
    .trim()
    .email("Email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .or(z.literal("")),

  contactPerson: z.string().default(""),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vÃ¡Â»Â±c khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "Khu vÃ¡Â»Â±c lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  note: z.string().default(""),
});

export const updateSupplierSchema =
  createSupplierSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ kho phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "MÃƒÂ£ kho tÃ¡Â»â€˜i Ã„â€˜a 50 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn kho phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn kho tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  areaId: z
    .string({
      message: "Khu vÃ¡Â»Â±c khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "Khu vÃ¡Â»Â±c lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  address: z.string().default(""),

  managerId: z.string().nullable().optional(),

  note: z.string().default(""),
});

export const updateWarehouseSchema =
  createWarehouseSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createInventoryAdjustmentSchema =
  z.object({
    inventoryId: z
      .string({
        message: "ID tÃ¡Â»â€œn kho khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "ID tÃ¡Â»â€œn kho lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    type: z.enum(["IN", "OUT", "ADJUST"], {
      message: "LoÃ¡ÂºÂ¡i Ã„â€˜iÃ¡Â»Âu chÃ¡Â»â€°nh khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),

    quantity: z
      .number({
        message: "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng tÃ¡Â»â€˜i thiÃ¡Â»Æ’u lÃƒÂ  1"),

    reason: z
      .string()
      .trim()
      .min(1, "LÃƒÂ½ do lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    note: z.string().default(""),
  });

export const createCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(50, "MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng tÃ¡Â»â€˜i Ã„â€˜a 50 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  phone: z
    .string()
    .trim()
    .min(8, "SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 8 kÃƒÂ½ tÃ¡Â»Â±")
    .max(20, "SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»â€¡n thoÃ¡ÂºÂ¡i tÃ¡Â»â€˜i Ã„â€˜a 20 kÃƒÂ½ tÃ¡Â»Â±"),

  email: z
    .string()
    .trim()
    .email("Email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .or(z.literal("")),

  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "GiÃ¡Â»â€ºi tÃƒÂ­nh khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
  }),

  birthday: z.string().optional(),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vÃ¡Â»Â±c khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "Khu vÃ¡Â»Â±c lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  teamId: z
    .string({
      message: "NhÃƒÂ³m khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "NhÃƒÂ³m lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  marketingEmployeeId: z
    .string({
      message: "NhÃƒÂ¢n viÃƒÂªn marketing khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    })
    .min(1, "NhÃƒÂ¢n viÃƒÂªn marketing phÃ¡Â»Â¥ trÃƒÂ¡ch lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

  note: z.string().default(""),
});

export const updateCustomerSchema =
  createCustomerSchema.extend({
    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  });

export const createFacebookPageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ page phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ page tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn page phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn page tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  pageUrl: z
    .string()
    .trim()
    .default(""),

  facebookPageId: z
    .string()
    .trim()
    .default(""),

  description: z
    .string()
    .trim()
    .default(""),
});

export const updateFacebookPageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃƒÂ£ page phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(30, "MÃƒÂ£ page tÃ¡Â»â€˜i Ã„â€˜a 30 kÃƒÂ½ tÃ¡Â»Â±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃƒÂªn page phÃ¡ÂºÂ£i cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±")
    .max(100, "TÃƒÂªn page tÃ¡Â»â€˜i Ã„â€˜a 100 kÃƒÂ½ tÃ¡Â»Â±"),

  pageUrl: z
    .string()
    .trim()
    .default(""),

  facebookPageId: z
    .string()
    .trim()
    .default(""),

  description: z
    .string()
    .trim()
    .default(""),

  isActive: z.boolean({
    message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
  }),
});

export const createFacebookPageAssignmentSchema = z
  .object({
    facebookPageId: z
      .string({
        message: "Facebook Page khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "Facebook Page lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    marketingEmployeeId: z
      .string({
        message: "NhÃƒÂ¢n viÃƒÂªn marketing khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "NhÃƒÂ¢n viÃƒÂªn marketing lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    startDate: z
      .string({
        message: "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    endDate: z
      .string({
        message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .nullable()
      .optional(),

    note: z
      .string()
      .trim()
      .default(""),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      return !isNaN(start.getTime());
    },
    {
      message: "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      if (data.endDate === null || data.endDate === undefined || data.endDate === "") {
        return true;
      }
      const end = new Date(data.endDate);
      return !isNaN(end.getTime());
    },
    {
      message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.endDate === null || data.endDate === undefined || data.endDate === "") {
        return true;
      }
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc phÃ¡ÂºÂ£i lÃ¡Â»â€ºn hÃ†Â¡n hoÃ¡ÂºÂ·c bÃ¡ÂºÂ±ng ngÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u",
      path: ["endDate"],
    }
  );

// Lead schemas
const VIETNAMESE_PHONE_REGEX = /^(0[0-9]{9,10})$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const FLEXIBLE_PHONE_REGEX = /^[0-9+\s().-]{8,20}$/;

const facebookLinkSchema = z
  .string()
  .trim()
  .url("Link Facebook khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
  .refine((value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
    } catch {
      return false;
    }
  }, "Link phÃ¡ÂºÂ£i thuÃ¡Â»â„¢c tÃƒÂªn miÃ¡Â»Ân Facebook");

const assignedAtSchema = z
  .union([z.iso.datetime(), z.date()])
  .refine(
    (value) => typeof value === "string" || !Number.isNaN(value.getTime()),
    "NgÃƒÂ y phÃƒÂ¢n cÃƒÂ´ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"
  )
  .nullable()
  .optional();

// Phone field: optional
const phoneOptionalSchema = z.string().trim().optional().nullable();
const phone2OptionalSchema = z.string().trim().optional().nullable();

export const createLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "KhÃƒÂ¡ch hÃƒÂ ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c")
    .max(200, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±"),

  customerNewName: z
    .string()
    .trim()
    .max(200, "TÃƒÂªn mÃ¡Â»â€ºi tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: phoneOptionalSchema,

  phone2: phone2OptionalSchema,

  address: z
    .string()
    .trim()
    .max(500, "Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€° tÃ¡Â»â€˜i Ã„â€˜a 500 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  sourceType: z.enum([
    "LANDING_PAGE",
    "FACEBOOK_COMMENT",
    "FACEBOOK_INBOX",
    "OTHER",
  ], {
    message: "Nguồn không hợp lệ",
  }),

  facebookPageId: z
    .string()
    .optional(),

  facebookPageAssignmentId: z
    .string()
    .optional(),

  marketingEmployeeId: z
    .string()
    .optional(),

  saleEmployeeId: z
    .string()
    .nullable()
    .optional(),

  assignmentType: z.enum(["AUTO", "MANUAL"]).optional(),

  assignedAt: assignedAtSchema,

  categoryId: z
    .string()
    .optional(),

  productId: z
    .string()
    .optional(),

  comboId: z
    .string()
    .optional(),

  quantity: z
    .number()
    .int("SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn")
    .min(1, "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng tÃ¡Â»â€˜i thiÃ¡Â»Æ’u lÃƒÂ  1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "GiÃƒÂ¡ MNT khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "TÃ¡Â»Â· giÃƒÂ¡ khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "TrÃ¡Â»Âng lÃ†Â°Ã¡Â»Â£ng Ã†Â°Ã¡Â»â€ºc tÃƒÂ­nh khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  status: z.nativeEnum(LeadStatus).optional().default(LeadStatus.NEW),

  latestRemark: z
    .string()
    .trim()
    .max(2000, "Ghi chÃƒÂº xÃ¡Â»Â­ lÃƒÂ½ tÃ¡Â»â€˜i Ã„â€˜a 2000 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chÃƒÂº tÃ¡Â»â€˜i Ã„â€˜a 1000 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  isDuplicate: z.boolean().optional().default(false),
});

export const updateLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "KhÃƒÂ¡ch hÃƒÂ ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c")
    .max(200, "TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±")
    .optional(),

  customerNewName: z
    .string()
    .trim()
    .max(200, "TÃƒÂªn mÃ¡Â»â€ºi tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±")
    .optional()
    .nullable(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(FLEXIBLE_PHONE_REGEX, "Phone invalid 1")
    .optional()
    .or(z.literal("")),

  phone2: z
    .string()
    .trim()
    .regex(FLEXIBLE_PHONE_REGEX, "Phone invalid 2")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(500, "Address max 500 chars")
    .optional(),

  sourceType: z.enum([
    "LANDING_PAGE",
    "FACEBOOK_COMMENT",
    "FACEBOOK_INBOX",
    "OTHER",
  ]).optional(),

  facebookPageId: z
    .string()
    .optional()
    .nullable(),

  facebookPageAssignmentId: z
    .string()
    .optional()
    .nullable(),

  marketingEmployeeId: z
    .string()
    .optional()
    .nullable(),

  saleEmployeeId: z
    .string()
    .nullable()
    .optional(),

  assignmentType: z.enum(["AUTO", "MANUAL"])
    .optional()
    .nullable(),

  assignedAt: assignedAtSchema,

  categoryId: z
    .string()
    .optional()
    .nullable(),

  productId: z
    .string()
    .optional()
    .nullable(),

  comboId: z
    .string()
    .optional()
    .nullable(),

  quantity: z
    .number()
    .int("SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn")
    .min(1, "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng tÃ¡Â»â€˜i thiÃ¡Â»Æ’u lÃƒÂ  1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "GiÃƒÂ¡ MNT khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "TÃ¡Â»Â· giÃƒÂ¡ khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "TrÃ¡Â»Âng lÃ†Â°Ã¡Â»Â£ng Ã†Â°Ã¡Â»â€ºc tÃƒÂ­nh khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .optional(),

  status: z.nativeEnum(LeadStatus).optional(),

  latestRemark: z
    .string()
    .trim()
    .max(2000, "Ghi chÃƒÂº xÃ¡Â»Â­ lÃƒÂ½ tÃ¡Â»â€˜i Ã„â€˜a 2000 kÃƒÂ½ tÃ¡Â»Â±")
    .optional()
    .nullable(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chÃƒÂº tÃ¡Â»â€˜i Ã„â€˜a 1000 kÃƒÂ½ tÃ¡Â»Â±")
    .optional()
    .nullable(),

  isDuplicate: z.boolean().optional(),

  isActive: z.boolean().optional(),
});

export type CreateLeadForm = z.infer<typeof createLeadSchema>;
export type UpdateLeadForm = z.infer<typeof updateLeadSchema>;

// Combo schemas (Sprint 8.x - Combo theo Product, khÃ´ng lÆ°u variant)
//
// Combo chá»‰ cáº§n:
//   - productId (ObjectId) hoáº·c productCode (string) tuá»³ client gá»­i
//   - packageQuantity (sá»‘ SP / combo)
//   - sellingPrice
//   - giftQuantity (sá»‘ quÃ  / combo)
//
// Category láº¥y tá»« Product, khÃ´ng cáº§n truyá»n tá»« client.

const productIdOrCodeSchema = z
  .union([
    z.string().regex(/^[a-fA-F0-9]{24}$/, "ProductId khÃ´ng há»£p lá»‡"),
    z.string().trim().min(1, "Sáº£n pháº©m lÃ  báº¯t buá»™c"),
  ], { message: "Sáº£n pháº©m lÃ  báº¯t buá»™c" });

const packageQuantitySchema = z
  .number({ message: "Sá»‘ lÆ°á»£ng sáº£n pháº©m / combo khÃ´ng há»£p lá»‡" })
  .int("Sá»‘ lÆ°á»£ng sáº£n pháº©m / combo pháº£i lÃ  sá»‘ nguyÃªn")
  .min(1, "Sá»‘ lÆ°á»£ng sáº£n pháº©m / combo pháº£i lá»›n hÆ¡n 0");

const sellingPriceSchema = z
  .number({ message: "GiÃ¡ bÃ¡n khÃ´ng há»£p lá»‡" })
  .min(0, "GiÃ¡ bÃ¡n pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0");

const giftQuantitySchema = z
  .number()
  .int("Sá»‘ quÃ  / combo pháº£i lÃ  sá»‘ nguyÃªn")
  .min(0, "Sá»‘ quÃ  / combo khÃ´ng Ä‘Æ°á»£c Ã¢m");

const displayOrderSchema = z
  .number()
  .int("Thá»© tá»± hiá»ƒn thá»‹ pháº£i lÃ  sá»‘ nguyÃªn")
  .min(0, "Thá»© tá»± hiá»ƒn thá»‹ khÃ´ng Ä‘Æ°á»£c Ã¢m");

const comboCoreShape = {
  code: z
    .string()
    .trim()
    .min(1, "MÃ£ combo lÃ  báº¯t buá»™c")
    .max(50, "MÃ£ combo tá»‘i Ä‘a 50 kÃ½ tá»±"),
  name: z
    .string()
    .trim()
    .min(1, "TÃªn combo lÃ  báº¯t buá»™c")
    .max(200, "TÃªn combo tá»‘i Ä‘a 200 kÃ½ tá»±"),
  productId: productIdOrCodeSchema.optional(),
  productCode: z.string().trim().nonempty("Sáº£n pháº©m lÃ  báº¯t buá»™c").optional(),
  packageQuantity: packageQuantitySchema,
  sellingPrice: sellingPriceSchema,
  giftQuantity: giftQuantitySchema.default(0),
  displayOrder: displayOrderSchema.default(0),
  image: z.string().optional(),
  description: z.string().optional(),
};

export const createComboSchema = z.object({
  ...comboCoreShape,
}).refine(
  (data) => Boolean(data.productId) || Boolean(data.productCode),
  { message: "Sáº£n pháº©m lÃ  báº¯t buá»™c", path: ["productCode"] }
);

export const updateComboSchema = z.object({
  ...comboCoreShape,
  isActive: z.boolean(),
}).refine(
  (data) => Boolean(data.productId) || Boolean(data.productCode),
  { message: "Sáº£n pháº©m lÃ  báº¯t buá»™c", path: ["productCode"] }
);
// ================================================================
// Order schemas
// ================================================================

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MOMO", "ZALO_PAY", "VNPAY", "OTHER"] as const;
const CURRENCIES = ["VND", "MNT", "USD"] as const;
const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "PREPAID",
  "SHIPPING", "COMPLETED", "CANCELLED",
  "REJECTED", "FAILED",
] as const;
const ORDER_TYPES = [
  "NORMAL", "COMBO", "GIFT", "EXCHANGE", "REPLACEMENT",
] as const;
const ORDER_SOURCES = [
  "FACEBOOK", "IMPORT", "PHONE", "WEBSITE", "MANUAL",
] as const;

const orderPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS, {
    message: "PhÃ†Â°Ã†Â¡ng thÃ¡Â»Â©c thanh toÃƒÂ¡n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
  }),
  amount: z
    .number({ message: "SÃ¡Â»â€˜ tiÃ¡Â»Ân khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0, "SÃ¡Â»â€˜ tiÃ¡Â»Ân khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m"),
  currency: z.enum(CURRENCIES).default("MNT"),
  paidAt: z.string().datetime().optional().nullable(),
  transactionId: z.string().default(""),
  note: z.string().default(""),
});

const orderShippingSchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(1, "TÃƒÂªn ngÃ†Â°Ã¡Â»Âi nhÃ¡ÂºÂ­n lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c")
    .max(200),
  receiverPhone: z
    .string()
    .trim()
    .min(1, "SÃ„ÂT ngÃ†Â°Ã¡Â»Âi nhÃ¡ÂºÂ­n lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c")
    .max(20),
  address: z
    .string()
    .trim()
    .min(1, "Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€° giao hÃƒÂ ng lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c")
    .max(500),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(100).optional(),
  estimatedDelivery: z.string().datetime().optional().nullable(),
  actualDelivery: z.string().datetime().optional().nullable(),
  shippingFee: z.number().min(0).default(0),
  shippingFeeCurrency: z.enum(CURRENCIES).default("MNT"),
});

const OBJECT_ID_REGEX_ORDER = /^[a-f\d]{24}$/i;

const orderAttributeSchema = z.object({
  optionId: z.string().regex(OBJECT_ID_REGEX_ORDER, "VariantOption khÃ´ng há»£p lá»‡"),
  valueId: z.string().regex(OBJECT_ID_REGEX_ORDER, "VariantValue khÃ´ng há»£p lá»‡"),
});

const orderDetailSchema = z.object({
  variantId: z.string().regex(OBJECT_ID_REGEX_ORDER, "ProductVariant khÃ´ng há»£p lá»‡").optional(),
  attributes: z.array(orderAttributeSchema).default([]),
  quantity: z.number().int().min(1, "Sá»‘ lÆ°á»£ng pháº£i lá»›n hÆ¡n 0"),
});

const giftSelectionSchema = z.object({
  giftProductId: z.string().regex(OBJECT_ID_REGEX_ORDER, "Gift khÃ´ng há»£p lá»‡"),
  giftProductName: z.string().max(100).optional(),
  quantity: z.number().int().min(1, "Sá»‘ lÆ°á»£ng quÃ  pháº£i lá»›n hÆ¡n 0"),
});

const orderItemSchema = z.object({
  comboId: z.string().regex(OBJECT_ID_REGEX_ORDER).optional(),
  productId: z.string().regex(OBJECT_ID_REGEX_ORDER).optional(),
  comboName: z.string().max(200).optional(),
  comboCode: z.string().max(50).optional(),
  comboQuantity: z.number().int().min(1).default(1),
  packageQuantity: z.number().int().min(1).default(1),
  giftQuantity: z.number().int().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  subtotal: z.number().min(0).optional(),
  details: z.array(orderDetailSchema).default([]),
  giftMode: z.enum(["RANDOM", "CUSTOMER_SELECTED"]).default("RANDOM"),
  giftSelections: z.array(giftSelectionSchema).default([]),
  sku: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
}).superRefine((item, ctx) => {
  const requiredProducts = item.comboQuantity * item.packageQuantity;
  const selectedProducts = item.details.reduce((sum, detail) => sum + detail.quantity, 0);
  if (item.details.length > 0 && selectedProducts !== requiredProducts) {
    ctx.addIssue({ code: "custom", path: ["details"], message: `Chi tiáº¿t sáº£n pháº©m pháº£i Ä‘á»§ ${requiredProducts} sáº£n pháº©m.` });
  }

  const requiredGifts = item.comboQuantity * item.giftQuantity;
  const selectedGifts = item.giftSelections.reduce((sum, gift) => sum + gift.quantity, 0);
  if (item.giftMode === "CUSTOMER_SELECTED" && selectedGifts !== requiredGifts) {
    ctx.addIssue({ code: "custom", path: ["giftSelections"], message: `Chi tiáº¿t quÃ  pháº£i Ä‘á»§ ${requiredGifts} quÃ .` });
  }
  if (item.giftMode === "RANDOM" && item.giftSelections.length > 0) {
    ctx.addIssue({ code: "custom", path: ["giftSelections"], message: "QuÃ  ngáº«u nhiÃªn khÃ´ng cáº§n chá»n quÃ  cá»¥ thá»ƒ." });
  }
});

export const createOrderSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Customer không hợp lệ")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "Tên khách hàng là bắt buộc")
    .max(200),

  customerPhone: z.string().max(20).optional(),

  leadId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Lead khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  productId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Product khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  productVariantId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "ProductVariant khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Combo khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  quantity: z
    .number({ message: "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .int("SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn")
    .min(1, "SÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng tÃ¡Â»â€˜i thiÃ¡Â»Æ’u lÃƒÂ  1"),

  unitPrice: z
    .number({ message: "Ã„ÂÃ†Â¡n giÃƒÂ¡ khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0, "Ã„ÂÃ†Â¡n giÃƒÂ¡ khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m"),

  totalAmount: z
    .number({ message: "TÃ¡Â»â€¢ng tiÃ¡Â»Ân khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0, "TÃ¡Â»â€¢ng tiÃ¡Â»Ân khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m"),

  currency: z.enum(CURRENCIES).default("MNT"),

  estimatedWeight: z
    .number({ message: "TrÃ¡Â»Âng lÃ†Â°Ã¡Â»Â£ng Ã†Â°Ã¡Â»â€ºc tÃƒÂ­nh khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0)
    .optional()
    .nullable(),

  actualWeight: z
    .number({ message: "TrÃ¡Â»Âng lÃ†Â°Ã¡Â»Â£ng thÃ¡Â»Â±c tÃ¡ÂºÂ¿ khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0)
    .optional()
    .nullable(),

  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Warehouse khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  marketingEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "NhÃƒÂ¢n viÃƒÂªn marketing khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  saleEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "NhÃƒÂ¢n viÃƒÂªn sale khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional()
    .nullable(),

  status: z.enum(ORDER_STATUSES).default("PENDING"),

  isPrepaid: z.boolean().default(false),

  orderType: z
    .enum(ORDER_TYPES, { message: "LoÃ¡ÂºÂ¡i Ã„â€˜Ã†Â¡n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .default("NORMAL"),

  orderSource: z
    .enum(ORDER_SOURCES, { message: "NguÃ¡Â»â€œn Ã„â€˜Ã†Â¡n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .default("MANUAL"),

  orderItems: z.array(orderItemSchema).optional(),

  payments: z.array(orderPaymentSchema).default([]),

  totalPaid: z
    .number({ message: "TÃ¡Â»â€¢ng thanh toÃƒÂ¡n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡" })
    .min(0, "TÃ¡Â»â€¢ng thanh toÃƒÂ¡n khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c ÃƒÂ¢m")
    .default(0),

  shipping: orderShippingSchema.optional(),

  note: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Customer khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional(),
  customerName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),
  customerPhone: z.string().max(20).optional(),
  leadId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  productId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  productVariantId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  quantity: z
    .number()
    .int()
    .min(1)
    .optional(),
  unitPrice: z
    .number()
    .min(0)
    .optional(),
  totalAmount: z
    .number()
    .min(0)
    .optional(),
  currency: z.enum(CURRENCIES).optional(),
  estimatedWeight: z.number().min(0).optional().nullable(),
  actualWeight: z.number().min(0).optional().nullable(),
  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  marketingEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  saleEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER)
    .optional()
    .nullable(),
  status: z.enum(ORDER_STATUSES).optional(),
  isPrepaid: z.boolean().optional(),
  orderType: z.enum(ORDER_TYPES).optional(),
  orderSource: z.enum(ORDER_SOURCES).optional(),
  orderItems: z.array(orderItemSchema).optional(),
  payments: z.array(orderPaymentSchema).optional(),
  totalPaid: z.number().min(0).optional(),
  shipping: orderShippingSchema.optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateOrderForm = z.infer<typeof createOrderSchema>;
export type UpdateOrderForm = z.infer<typeof updateOrderSchema>;

// ================================================================
// Facebook Page Assignment schemas (original order preserved)
// ================================================================

export const updateFacebookPageAssignmentSchema = z
  .object({
    facebookPageId: z
      .string({
        message: "Facebook Page khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "Facebook Page lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    marketingEmployeeId: z
      .string({
        message: "NhÃƒÂ¢n viÃƒÂªn marketing khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "NhÃƒÂ¢n viÃƒÂªn marketing lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    startDate: z
      .string({
        message: "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .min(1, "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u lÃƒÂ  bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c"),

    endDate: z
      .string({
        message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      })
      .nullable()
      .optional(),

    note: z
      .string()
      .trim()
      .default(""),

    isActive: z.boolean({
      message: "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
    }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      return !isNaN(start.getTime());
    },
    {
      message: "NgÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      if (data.endDate === null || data.endDate === undefined || data.endDate === "") {
        return true;
      }
      const end = new Date(data.endDate);
      return !isNaN(end.getTime());
    },
    {
      message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.endDate === null || data.endDate === undefined || data.endDate === "") {
        return true;
      }
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: "NgÃƒÂ y kÃ¡ÂºÂ¿t thÃƒÂºc phÃ¡ÂºÂ£i lÃ¡Â»â€ºn hÃ†Â¡n hoÃ¡ÂºÂ·c bÃ¡ÂºÂ±ng ngÃƒÂ y bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u",
      path: ["endDate"],
    }
  );


// ================================================================
// Inventory History schemas
// ================================================================

const OBJECT_ID_REGEX_INVENTORY = /^[a-f\d]{24}$/i;

/**
 * Schema tÃ¡ÂºÂ¡o mÃ¡Â»â€ºi 1 InventoryHistory.
 * Foundation (Phase 4.1) chÃ¡Â»â€° validate input shape. CÃƒÂ¡c field `beforeQuantity`
 * / `afterQuantity` sÃ¡ÂºÂ½ do Stock Engine (Phase 4.2) tÃƒÂ­nh tÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng Ã¢â‚¬â€ nhÃ†Â°ng vÃ¡ÂºÂ«n
 * cho phÃƒÂ©p caller truyÃ¡Â»Ân vÃƒÂ o Ã„â€˜Ã¡Â»Æ’ hÃ¡Â»â€” trÃ¡Â»Â£ test / seed / migration.
 */
export const createInventoryHistorySchema = z.object({
  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Kho khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  productVariantId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "ProductVariant khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional(),

  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Combo khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional(),

  orderId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Order khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡")
    .optional(),

  employeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "NhÃƒÂ¢n viÃƒÂªn khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡"),

  transactionType: z.enum([
    InventoryTransactionType.INBOUND,
    InventoryTransactionType.OUTBOUND,
    InventoryTransactionType.TRANSFER,
    InventoryTransactionType.ADJUST,
  ]),

  action: z.enum([
    InventoryAction.RESERVE,
    InventoryAction.UNRESERVE,
    InventoryAction.OUT,
    InventoryAction.RETURN,
    InventoryAction.INBOUND,
    InventoryAction.ADJUST,
    InventoryAction.TRANSFER_OUT,
    InventoryAction.TRANSFER_IN,
  ]),

  reason: z.enum([
    InventoryReason.ORDER_RESERVED,
    InventoryReason.ORDER_UNRESERVED,
    InventoryReason.ORDER_OUT,
    InventoryReason.ORDER_CANCELLED,
    InventoryReason.ORDER_RETURNED,
    InventoryReason.SUPPLIER_RECEIVED,
    InventoryReason.SUPPLIER_RETURNED,
    InventoryReason.WAREHOUSE_TRANSFER,
    InventoryReason.WAREHOUSE_AUDIT,
    InventoryReason.WAREHOUSE_DAMAGED,
    InventoryReason.WAREHOUSE_LOST,
    InventoryReason.WAREHOUSE_FOUND,
    InventoryReason.SYSTEM_ADJUST,
    InventoryReason.SYSTEM_MIGRATION,
  ]),

  source: z
    .enum([
      InventorySource.MANUAL,
      InventorySource.ORDER,
      InventorySource.SUPPLIER_RECEIPT,
      InventorySource.STOCKTAKE,
      InventorySource.SYSTEM,
    ])
    .default(InventorySource.SYSTEM),

  referenceType: z
    .enum([
      InventoryReferenceType.ORDER,
      InventoryReferenceType.LEAD,
      InventoryReferenceType.PURCHASE,
      InventoryReferenceType.TRANSFER,
      InventoryReferenceType.ADJUSTMENT,
      InventoryReferenceType.SUPPLIER,
      InventoryReferenceType.MANUAL,
      InventoryReferenceType.SYSTEM,
    ])
    .optional(),

  referenceCode: z
    .string()
    .trim()
    .min(3, "Ma tham chieu qua ngan (toi thieu 3 ky tu)")
    .max(64, "Ma tham chieu toi da 64 ky tu")
    .optional(),

  beforeQuantity: z.number().int("TrÃ†Â°Ã¡Â»â€ºc phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn").default(0),

  changeQuantity: z
    .number()
    .int("LÃ†Â°Ã¡Â»Â£ng thay Ã„â€˜Ã¡Â»â€¢i phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn")
    .refine((n) => n !== 0, {
      message: "LÃ†Â°Ã¡Â»Â£ng thay Ã„â€˜Ã¡Â»â€¢i khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c bÃ¡ÂºÂ±ng 0",
    }),

  afterQuantity: z.number().int("Sau phÃ¡ÂºÂ£i lÃƒÂ  sÃ¡Â»â€˜ nguyÃƒÂªn"),

  note: z.string().trim().default(""),
});

export type CreateInventoryHistoryForm = z.infer<
  typeof createInventoryHistorySchema
>;

/**
 * Schema cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t 1 InventoryHistory.
 *
 * Foundation (Phase 4.1): lÃ¡Â»â€¹ch sÃ¡Â»Â­ kho lÃƒÂ  bÃ¡ÂºÂ¥t biÃ¡ÂºÂ¿n (append-only).
 * NÃƒÂªn update chÃ¡Â»â€° cho phÃƒÂ©p sÃ¡Â»Â­a `note` Ã¢â‚¬â€ mÃ¡Â»Âi field khÃƒÂ¡c sÃ¡ÂºÂ½ do Stock Engine
 * (Phase 4.2) reverse transaction bÃ¡ÂºÂ±ng cÃƒÂ¡ch tÃ¡ÂºÂ¡o row mÃ¡Â»â€ºi.
 *
 * NÃ¡ÂºÂ¿u sau nÃƒÂ y cho phÃƒÂ©p admin sÃ¡Â»Â­a thÃƒÂªm, mÃ¡Â»Å¸ rÃ¡Â»â„¢ng schema tÃ¡ÂºÂ¡i Ã„â€˜ÃƒÂ¢y.
 */
export const updateInventoryHistorySchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Ghi chÃƒÂº khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã„â€˜Ã¡Â»Æ’ trÃ¡Â»â€˜ng")
    .max(2000, "Ghi chÃƒÂº tÃ¡Â»â€˜i Ã„â€˜a 2000 kÃƒÂ½ tÃ¡Â»Â±"),
});

export type UpdateInventoryHistoryForm = z.infer<
  typeof updateInventoryHistorySchema
>;

// ================================================================
// Gift schemas (Sprint 8.x)
// ================================================================

export const createGiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "TÃªn quÃ  táº·ng pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn quÃ  táº·ng tá»‘i Ä‘a 100 kÃ½ tá»±"),

  stockQuantity: z
    .number({
      message: "Sá»‘ lÆ°á»£ng tá»“n kho pháº£i lÃ  sá»‘",
    })
    .int("Sá»‘ lÆ°á»£ng tá»“n kho pháº£i lÃ  sá»‘ nguyÃªn")
    .min(0, "Sá»‘ lÆ°á»£ng tá»“n kho khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .default(0),

  isActive: z
    .boolean()
    .default(true),
});

export const updateGiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "TÃªn quÃ  táº·ng pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn quÃ  táº·ng tá»‘i Ä‘a 100 kÃ½ tá»±"),

  isActive: z.boolean({
    message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
  }),
});

const giftInventoryChangeSchema = z.object({
  quantity: z
    .number({ message: "Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘" })
    .int("Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘ nguyÃªn")
    .positive("Sá»‘ lÆ°á»£ng pháº£i lá»›n hÆ¡n 0"),
  note: z
    .string()
    .trim()
    .min(1, "Ghi chÃº lÃ  báº¯t buá»™c")
    .max(1000, "Ghi chÃº tá»‘i Ä‘a 1000 kÃ½ tá»±"),
});

export const importGiftInventorySchema = giftInventoryChangeSchema;

export const adjustGiftInventorySchema = giftInventoryChangeSchema.extend({
  direction: z.enum(["INCREASE", "DECREASE"], {
    message: "Loáº¡i Ä‘iá»u chá»‰nh khÃ´ng há»£p lá»‡",
  }),
});

export type CreateGiftForm = z.infer<typeof createGiftSchema>;
export type UpdateGiftForm = z.infer<typeof updateGiftSchema>;
export type ImportGiftInventoryForm = z.infer<typeof importGiftInventorySchema>;
export type AdjustGiftInventoryForm = z.infer<typeof adjustGiftInventorySchema>;

