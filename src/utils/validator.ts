import { z } from "zod";

import {
  InventoryAction,
  InventoryReason,
  InventorySource,
  InventoryTransactionType,
  InventoryReferenceType,
} from "@/constants/inventoryStatus";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "TÃªn Ä‘Äƒng nháº­p pháº£i cÃ³ Ã­t nháº¥t 3 kÃ½ tá»±"),

  password: z
    .string()
    .min(6, "Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export const createEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "TÃªn Ä‘Äƒng nháº­p tá»‘i thiá»ƒu 3 kÃ½ tá»±")
    .max(50, "TÃªn Ä‘Äƒng nháº­p tá»‘i Ä‘a 50 kÃ½ tá»±"),

  password: z
    .string()
    .min(6, "Máº­t kháº©u tá»‘i thiá»ƒu 6 kÃ½ tá»±"),

  fullName: z
    .string()
    .trim()
    .min(2, "Há» tÃªn khÃ´ng há»£p lá»‡"),

  email: z
    .email("Email khÃ´ng há»£p lá»‡")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trÃ² lÃ  báº¯t buá»™c"),

  teamCode: z.string().nullable().optional(),

  bankName: z.string().optional(),

  bankAccountNumber: z.string().optional(),

  bankAccountHolder: z.string().optional(),
});
export const updateEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "TÃªn Ä‘Äƒng nháº­p tá»‘i thiá»ƒu 3 kÃ½ tá»±")
    .max(50, "TÃªn Ä‘Äƒng nháº­p tá»‘i Ä‘a 50 kÃ½ tá»±"),

  fullName: z
    .string()
    .trim()
    .min(2, "Há» tÃªn khÃ´ng há»£p lá»‡")
    .max(100, "Há» tÃªn tá»‘i Ä‘a 100 kÃ½ tá»±"),

    email: z
    .email("Email khÃ´ng há»£p lá»‡")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trÃ² lÃ  báº¯t buá»™c"),

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
    .min(6, "Máº­t kháº©u tá»‘i thiá»ƒu 6 kÃ½ tá»±")
    .max(100, "Máº­t kháº©u tá»‘i Ä‘a 100 kÃ½ tá»±"),
});

export type ResetPasswordForm = z.infer<
  typeof resetPasswordSchema
>;
export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ vai trÃ² tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(30, "MÃ£ vai trÃ² tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn vai trÃ² tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(100, "TÃªn vai trÃ² tá»‘i Ä‘a 100 kÃ½ tá»±"),

  description: z.string().trim().optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ vai trÃ² tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(30, "MÃ£ vai trÃ² tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn vai trÃ² tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(100, "TÃªn vai trÃ² tá»‘i Ä‘a 100 kÃ½ tá»±"),

  description: z.string().trim().optional(),

  isActive: z.boolean(),
});

export type UpdateRoleForm = z.infer<typeof updateRoleSchema>;

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ phÃ²ng ban tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(30),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn phÃ²ng ban tá»‘i thiá»ƒu 2 kÃ½ tá»±")
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
    .min(2, "MÃ£ khu vá»±c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(30, "MÃ£ khu vá»±c tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn khu vá»±c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn khu vá»±c tá»‘i Ä‘a 100 kÃ½ tá»±"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "MÃ£ quá»‘c gia khÃ´ng há»£p lá»‡")
    .max(5, "MÃ£ quá»‘c gia khÃ´ng há»£p lá»‡"),
});

export const updateAreaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ khu vá»±c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(30, "MÃ£ khu vá»±c tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn khu vá»±c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn khu vá»±c tá»‘i Ä‘a 100 kÃ½ tá»±"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "MÃ£ quá»‘c gia khÃ´ng há»£p lá»‡")
    .max(5, "MÃ£ quá»‘c gia khÃ´ng há»£p lá»‡"),

  isActive: z.boolean(),
});

export const createTeamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ nhÃ³m tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(30, "MÃ£ nhÃ³m tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn nhÃ³m tá»‘i thiá»ƒu 2 kÃ½ tá»±")
    .max(100, "TÃªn nhÃ³m tá»‘i Ä‘a 100 kÃ½ tá»±"),

  departmentCode: z
    .string()
    .trim()
    .min(1, "PhÃ²ng ban lÃ  báº¯t buá»™c"),

  areaCode: z
    .string()
    .trim()
    .min(1, "Khu vá»±c lÃ  báº¯t buá»™c"),

  leaderCode: z.string().nullable().optional(),

  managerCode: z.string().nullable().optional(),
});

export const updateTeamSchema = createTeamSchema.extend({
  isActive: z.boolean({
    message: "Tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng khÃ´ng há»£p lá»‡",
  }),
});

export const createCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ danh má»¥c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(20, "MÃ£ danh má»¥c tá»‘i Ä‘a 20 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn danh má»¥c pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn danh má»¥c tá»‘i Ä‘a 100 kÃ½ tá»±"),

  parentCode: z
    .string()
    .trim()
    .nullable()
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "MÃ´ táº£ tá»‘i Ä‘a 500 kÃ½ tá»±")
    .optional(),

  sortOrder: z
    .number({
      error: "Thá»© tá»± pháº£i lÃ  sá»‘",
    })
    .default(0),
});

export const updateCategorySchema =
  createCategorySchema.extend({
    isActive: z.boolean({
      error: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

  export const createProductSchema = z.object({
    code: z
      .string()
      .min(2, "MÃ£ sáº£n pháº©m pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
      .max(50, "MÃ£ sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c quÃ¡ 50 kÃ½ tá»±"),
  
    name: z
      .string()
      .min(2, "TÃªn sáº£n pháº©m pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
      .max(200, "TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c quÃ¡ 200 kÃ½ tá»±"),
  
    categoryCode: z
      .string()
      .min(2, "MÃ£ danh má»¥c khÃ´ng há»£p lá»‡"),
  
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
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

  export const createVariantOptionSchema = z.object({
    code: z
      .string()
      .min(2, "MÃ£ thuá»™c tÃ­nh pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
      .max(50, "MÃ£ thuá»™c tÃ­nh khÃ´ng Ä‘Æ°á»£c quÃ¡ 50 kÃ½ tá»±"),
  
    name: z
      .string()
      .min(2, "TÃªn thuá»™c tÃ­nh pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
      .max(100, "TÃªn thuá»™c tÃ­nh khÃ´ng Ä‘Æ°á»£c quÃ¡ 100 kÃ½ tá»±"),
  
    sortOrder: z.number().optional().default(0),
  });
  
  export const updateVariantOptionSchema =
  createVariantOptionSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createVariantValueSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ giÃ¡ trá»‹ pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(50, "MÃ£ giÃ¡ trá»‹ khÃ´ng Ä‘Æ°á»£c quÃ¡ 50 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn giÃ¡ trá»‹ pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn giÃ¡ trá»‹ khÃ´ng Ä‘Æ°á»£c quÃ¡ 100 kÃ½ tá»±"),

  variantOptionId: z
    .string({
      message: "Thuá»™c tÃ­nh biáº¿n thá»ƒ khÃ´ng há»£p lá»‡",
    })
    .min(1, "Thuá»™c tÃ­nh biáº¿n thá»ƒ khÃ´ng há»£p lá»‡"),

  sortOrder: z.number().default(0),
});

export const updateVariantValueSchema =
  createVariantValueSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createProductVariantSchema = z.object({
  productId: z
    .string({
      message: "Sáº£n pháº©m khÃ´ng há»£p lá»‡",
    })
    .min(1, "Sáº£n pháº©m khÃ´ng há»£p lá»‡"),

  sku: z
    .string()
    .trim()
    .min(2, "SKU pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "SKU tá»‘i Ä‘a 100 kÃ½ tá»±"),

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
    .min(1, "Pháº£i chá»n Ã­t nháº¥t má»™t giÃ¡ trá»‹ biáº¿n thá»ƒ"),

  price: z
    .number({
      message: "GiÃ¡ pháº£i lÃ  sá»‘",
    })
    .min(0, "GiÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m"),

  cost: z.number().default(0),

  weight: z.number().default(0),

  sortOrder: z.number().default(0),
});

export const updateProductVariantSchema =
  createProductVariantSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ nhÃ  cung cáº¥p pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(50, "MÃ£ nhÃ  cung cáº¥p tá»‘i Ä‘a 50 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn nhÃ  cung cáº¥p pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn nhÃ  cung cáº¥p tá»‘i Ä‘a 100 kÃ½ tá»±"),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{8,20}$/, "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡"),

  email: z
    .string()
    .trim()
    .email("Email khÃ´ng há»£p lá»‡")
    .optional()
    .or(z.literal("")),

  contactPerson: z.string().default(""),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vá»±c khÃ´ng há»£p lá»‡",
    })
    .min(1, "Khu vá»±c lÃ  báº¯t buá»™c"),

  note: z.string().default(""),
});

export const updateSupplierSchema =
  createSupplierSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ kho pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(50, "MÃ£ kho tá»‘i Ä‘a 50 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn kho pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn kho tá»‘i Ä‘a 100 kÃ½ tá»±"),

  areaId: z
    .string({
      message: "Khu vá»±c khÃ´ng há»£p lá»‡",
    })
    .min(1, "Khu vá»±c lÃ  báº¯t buá»™c"),

  address: z.string().default(""),

  managerId: z.string().nullable().optional(),

  note: z.string().default(""),
});

export const updateWarehouseSchema =
  createWarehouseSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createInventoryAdjustmentSchema =
  z.object({
    inventoryId: z
      .string({
        message: "ID tá»“n kho khÃ´ng há»£p lá»‡",
      })
      .min(1, "ID tá»“n kho lÃ  báº¯t buá»™c"),

    type: z.enum(["IN", "OUT", "ADJUST"], {
      message: "Loáº¡i Ä‘iá»u chá»‰nh khÃ´ng há»£p lá»‡",
    }),

    quantity: z
      .number({
        message: "Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡",
      })
      .min(1, "Sá»‘ lÆ°á»£ng tá»‘i thiá»ƒu lÃ  1"),

    reason: z
      .string()
      .trim()
      .min(1, "LÃ½ do lÃ  báº¯t buá»™c"),

    note: z.string().default(""),
  });

export const createCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ khÃ¡ch hÃ ng pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(50, "MÃ£ khÃ¡ch hÃ ng tá»‘i Ä‘a 50 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn khÃ¡ch hÃ ng pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn khÃ¡ch hÃ ng tá»‘i Ä‘a 100 kÃ½ tá»±"),

  phone: z
    .string()
    .trim()
    .min(8, "Sá»‘ Ä‘iá»‡n thoáº¡i pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±")
    .max(20, "Sá»‘ Ä‘iá»‡n thoáº¡i tá»‘i Ä‘a 20 kÃ½ tá»±"),

  email: z
    .string()
    .trim()
    .email("Email khÃ´ng há»£p lá»‡")
    .optional()
    .or(z.literal("")),

  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "Giá»›i tÃ­nh khÃ´ng há»£p lá»‡",
  }),

  birthday: z.string().optional(),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vá»±c khÃ´ng há»£p lá»‡",
    })
    .min(1, "Khu vá»±c lÃ  báº¯t buá»™c"),

  teamId: z
    .string({
      message: "NhÃ³m khÃ´ng há»£p lá»‡",
    })
    .min(1, "NhÃ³m lÃ  báº¯t buá»™c"),

  marketingEmployeeId: z
    .string({
      message: "NhÃ¢n viÃªn marketing khÃ´ng há»£p lá»‡",
    })
    .min(1, "NhÃ¢n viÃªn marketing phá»¥ trÃ¡ch lÃ  báº¯t buá»™c"),

  note: z.string().default(""),
});

export const updateCustomerSchema =
  createCustomerSchema.extend({
    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  });

export const createFacebookPageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "MÃ£ page pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(30, "MÃ£ page tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn page pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn page tá»‘i Ä‘a 100 kÃ½ tá»±"),

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
    .min(2, "MÃ£ page pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(30, "MÃ£ page tá»‘i Ä‘a 30 kÃ½ tá»±"),

  name: z
    .string()
    .trim()
    .min(2, "TÃªn page pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±")
    .max(100, "TÃªn page tá»‘i Ä‘a 100 kÃ½ tá»±"),

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
    message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
  }),
});

export const createFacebookPageAssignmentSchema = z
  .object({
    facebookPageId: z
      .string({
        message: "Facebook Page khÃ´ng há»£p lá»‡",
      })
      .min(1, "Facebook Page lÃ  báº¯t buá»™c"),

    marketingEmployeeId: z
      .string({
        message: "NhÃ¢n viÃªn marketing khÃ´ng há»£p lá»‡",
      })
      .min(1, "NhÃ¢n viÃªn marketing lÃ  báº¯t buá»™c"),

    startDate: z
      .string({
        message: "NgÃ y báº¯t Ä‘áº§u khÃ´ng há»£p lá»‡",
      })
      .min(1, "NgÃ y báº¯t Ä‘áº§u lÃ  báº¯t buá»™c"),

    endDate: z
      .string({
        message: "NgÃ y káº¿t thÃºc khÃ´ng há»£p lá»‡",
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
      message: "NgÃ y báº¯t Ä‘áº§u khÃ´ng há»£p lá»‡",
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
      message: "NgÃ y káº¿t thÃºc khÃ´ng há»£p lá»‡",
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
      message: "NgÃ y káº¿t thÃºc pháº£i lá»›n hÆ¡n hoáº·c báº±ng ngÃ y báº¯t Ä‘áº§u",
      path: ["endDate"],
    }
  );

// Lead schemas
const VIETNAMESE_PHONE_REGEX = /^(0[0-9]{9,10})$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const facebookLinkSchema = z
  .string()
  .trim()
  .url("Link Facebook khÃ´ng há»£p lá»‡")
  .refine((value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
    } catch {
      return false;
    }
  }, "Link pháº£i thuá»™c tÃªn miá»n Facebook");

const assignedAtSchema = z
  .union([z.iso.datetime(), z.date()])
  .refine(
    (value) => typeof value === "string" || !Number.isNaN(value.getTime()),
    "NgÃ y phÃ¢n cÃ´ng khÃ´ng há»£p lá»‡"
  )
  .nullable()
  .optional();

// Phone field: optional
const phoneOptionalSchema = z.string().trim().optional().nullable();
const phone2OptionalSchema = z.string().trim().optional().nullable();

export const createLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "KhÃ¡ch hÃ ng khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "TÃªn khÃ¡ch hÃ ng lÃ  báº¯t buá»™c")
    .max(200, "TÃªn khÃ¡ch hÃ ng tá»‘i Ä‘a 200 kÃ½ tá»±"),

  customerNewName: z
    .string()
    .trim()
    .max(200, "TÃªn má»›i tá»‘i Ä‘a 200 kÃ½ tá»±")
    .optional(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: phoneOptionalSchema,

  phone2: phone2OptionalSchema,

  address: z
    .string()
    .trim()
    .max(500, "Äá»‹a chá»‰ tá»‘i Ä‘a 500 kÃ½ tá»±")
    .optional(),

  province: z
    .string()
    .trim()
    .max(100, "Tá»‰nh/ThÃ nh phá»‘ tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  district: z
    .string()
    .trim()
    .max(100, "Quáº­n/Huyá»‡n tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  ward: z
    .string()
    .trim()
    .max(100, "PhÆ°á»ng/XÃ£ tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  sourceType: z.enum([
    "LANDING_PAGE",
    "FACEBOOK_COMMENT",
    "FACEBOOK_INBOX",
    "TIKTOK",
    "ZALO",
    "OTHER",
  ], {
    message: "Nguá»“n khÃ´ng há»£p lá»‡",
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
    .int("Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘ nguyÃªn")
    .min(1, "Sá»‘ lÆ°á»£ng tá»‘i thiá»ƒu lÃ  1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "GiÃ¡ MNT khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  unitPriceVND: z
    .number()
    .min(0, "GiÃ¡ VND khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "Tá»· giÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "Trá»ng lÆ°á»£ng Æ°á»›c tÃ­nh khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  status: z.enum([
    "NEW",
    "ASSIGNED",
    "PROCESSING",
    "NO_ANSWER",
    "POTENTIAL",
    "REJECTED",
    "ORDER_CREATED",
    "CANCELLED",
  ]).optional().default("NEW"),

  latestRemark: z
    .string()
    .trim()
    .max(2000, "Ghi chÃº xá»­ lÃ½ tá»‘i Ä‘a 2000 kÃ½ tá»±")
    .optional(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chÃº tá»‘i Ä‘a 1000 kÃ½ tá»±")
    .optional(),

  isDuplicate: z.boolean().optional().default(false),
});

export const updateLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "KhÃ¡ch hÃ ng khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "TÃªn khÃ¡ch hÃ ng lÃ  báº¯t buá»™c")
    .max(200, "TÃªn khÃ¡ch hÃ ng tá»‘i Ä‘a 200 kÃ½ tá»±")
    .optional(),

  customerNewName: z
    .string()
    .trim()
    .max(200, "TÃªn má»›i tá»‘i Ä‘a 200 kÃ½ tá»±")
    .optional()
    .nullable(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡")
    .optional()
    .or(z.literal("")),

  phone2: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Sá»‘ Ä‘iá»‡n thoáº¡i 2 khÃ´ng há»£p lá»‡")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(500, "Äá»‹a chá»‰ tá»‘i Ä‘a 500 kÃ½ tá»±")
    .optional(),

  province: z
    .string()
    .trim()
    .max(100, "Tá»‰nh/ThÃ nh phá»‘ tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  district: z
    .string()
    .trim()
    .max(100, "Quáº­n/Huyá»‡n tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  ward: z
    .string()
    .trim()
    .max(100, "PhÆ°á»ng/XÃ£ tá»‘i Ä‘a 100 kÃ½ tá»±")
    .optional(),

  sourceType: z.enum([
    "LANDING_PAGE",
    "FACEBOOK_COMMENT",
    "FACEBOOK_INBOX",
    "TIKTOK",
    "ZALO",
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
    .int("Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘ nguyÃªn")
    .min(1, "Sá»‘ lÆ°á»£ng tá»‘i thiá»ƒu lÃ  1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "GiÃ¡ MNT khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  unitPriceVND: z
    .number()
    .min(0, "GiÃ¡ VND khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "Tá»· giÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "Trá»ng lÆ°á»£ng Æ°á»›c tÃ­nh khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .optional(),

  status: z.enum([
    "NEW",
    "ASSIGNED",
    "PROCESSING",
    "NO_ANSWER",
    "POTENTIAL",
    "REJECTED",
    "ORDER_CREATED",
    "CANCELLED",
  ]).optional(),

  latestRemark: z
    .string()
    .trim()
    .max(2000, "Ghi chÃº xá»­ lÃ½ tá»‘i Ä‘a 2000 kÃ½ tá»±")
    .optional()
    .nullable(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chÃº tá»‘i Ä‘a 1000 kÃ½ tá»±")
    .optional()
    .nullable(),

  isDuplicate: z.boolean().optional(),

  isActive: z.boolean().optional(),
});

export type CreateLeadForm = z.infer<typeof createLeadSchema>;
export type UpdateLeadForm = z.infer<typeof updateLeadSchema>;

// Combo schemas
const comboItemSchema = z.object({
  productVariantId: z
    .string({
      message: "ProductVariant khÃ´ng há»£p lá»‡",
    })
    .min(1, "ProductVariant lÃ  báº¯t buá»™c"),

  quantity: z
    .number({
      message: "Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡",
    })
    .int("Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘ nguyÃªn")
    .min(1, "Sá»‘ lÆ°á»£ng pháº£i lá»›n hÆ¡n 0"),

  isGift: z.boolean().default(false),
});

export const createComboSchema = z
  .object({
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

    productCode: z
      .string()
      .trim()
      .nonempty("Sáº£n pháº©m lÃ  báº¯t buá»™c"),

    categoryCode: z
      .string()
      .trim()
      .nonempty("Danh má»¥c lÃ  báº¯t buá»™c"),

    comboItems: z
      .array(comboItemSchema)
      .min(1, "Combo pháº£i cÃ³ Ã­t nháº¥t 1 sáº£n pháº©m"),

    sellingPrice: z
      .number({
        message: "GiÃ¡ bÃ¡n khÃ´ng há»£p lá»‡",
      })
      .min(0, "GiÃ¡ bÃ¡n pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0"),

    packageSize: z
      .number({
        message: "Sá»‘ lÆ°á»£ng combo khÃ´ng há»£p lá»‡",
      })
      .int("Sá»‘ lÆ°á»£ng combo pháº£i lÃ  sá»‘ nguyÃªn")
      .min(1, "Sá»‘ lÆ°á»£ng combo pháº£i lá»›n hÆ¡n 0"),

    displayOrder: z
      .number()
      .int("Thá»© tá»± hiá»ƒn thá»‹ pháº£i lÃ  sá»‘ nguyÃªn")
      .min(0, "Thá»© tá»± hiá»ƒn thá»‹ khÃ´ng Ä‘Æ°á»£c Ã¢m")
      .optional()
      .default(0),

    image: z.string().optional(),

    description: z.string().optional(),
  })
  .refine(
    (data) => {
      const variantIds = data.comboItems.map((item) => item.productVariantId);
      const uniqueIds = new Set(variantIds);
      return uniqueIds.size === variantIds.length;
    },
    {
      message: "ProductVariant bá»‹ trÃ¹ng trong combo",
      path: ["comboItems"],
    }
  );

export const updateComboSchema = z
  .object({
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

    productCode: z
      .string()
      .trim()
      .nonempty("Sáº£n pháº©m lÃ  báº¯t buá»™c"),

    categoryCode: z
      .string()
      .trim()
      .nonempty("Danh má»¥c lÃ  báº¯t buá»™c"),

    comboItems: z
      .array(comboItemSchema)
      .min(0)
      .optional()
      .default([]),

    sellingPrice: z
      .number({
        message: "GiÃ¡ bÃ¡n khÃ´ng há»£p lá»‡",
      })
      .min(0, "GiÃ¡ bÃ¡n pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0"),

    packageSize: z
      .number({
        message: "Sá»‘ lÆ°á»£ng combo khÃ´ng há»£p lá»‡",
      })
      .int("Sá»‘ lÆ°á»£ng combo pháº£i lÃ  sá»‘ nguyÃªn")
      .min(1, "Sá»‘ lÆ°á»£ng combo pháº£i lá»›n hÆ¡n 0"),

    displayOrder: z
      .number()
      .int("Thá»© tá»± hiá»ƒn thá»‹ pháº£i lÃ  sá»‘ nguyÃªn")
      .min(0, "Thá»© tá»± hiá»ƒn thá»‹ khÃ´ng Ä‘Æ°á»£c Ã¢m")
      .optional()
      .default(0),

    image: z.string().optional(),

    description: z.string().optional(),

    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      const variantIds = data.comboItems.map((item) => item.productVariantId);
      const uniqueIds = new Set(variantIds);
      return uniqueIds.size === variantIds.length;
    },
    {
      message: "ProductVariant bá»‹ trÃ¹ng trong combo",
      path: ["comboItems"],
    }
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
    message: "PhÆ°Æ¡ng thá»©c thanh toÃ¡n khÃ´ng há»£p lá»‡",
  }),
  amount: z
    .number({ message: "Sá»‘ tiá»n khÃ´ng há»£p lá»‡" })
    .min(0, "Sá»‘ tiá»n khÃ´ng Ä‘Æ°á»£c Ã¢m"),
  currency: z.enum(CURRENCIES).default("VND"),
  paidAt: z.string().datetime().optional().nullable(),
  transactionId: z.string().default(""),
  note: z.string().default(""),
});

const orderShippingSchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(1, "TÃªn ngÆ°á»i nháº­n lÃ  báº¯t buá»™c")
    .max(200),
  receiverPhone: z
    .string()
    .trim()
    .min(1, "SÄT ngÆ°á»i nháº­n lÃ  báº¯t buá»™c")
    .max(20),
  address: z
    .string()
    .trim()
    .min(1, "Äá»‹a chá»‰ giao hÃ ng lÃ  báº¯t buá»™c")
    .max(500),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(100).optional(),
  estimatedDelivery: z.string().datetime().optional().nullable(),
  actualDelivery: z.string().datetime().optional().nullable(),
  shippingFee: z.number().min(0).default(0),
  shippingFeeCurrency: z.enum(CURRENCIES).default("VND"),
});

const OBJECT_ID_REGEX_ORDER = /^[a-f\d]{24}$/i;

export const createOrderSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Customer khÃ´ng há»£p lá»‡")
    .min(1, "Customer lÃ  báº¯t buá»™c"),

  customerName: z
    .string()
    .trim()
    .min(1, "TÃªn khÃ¡ch hÃ ng lÃ  báº¯t buá»™c")
    .max(200),

  customerPhone: z.string().max(20).optional(),

  leadId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Lead khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  productId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Product khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  productVariantId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "ProductVariant khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Combo khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  quantity: z
    .number({ message: "Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡" })
    .int("Sá»‘ lÆ°á»£ng pháº£i lÃ  sá»‘ nguyÃªn")
    .min(1, "Sá»‘ lÆ°á»£ng tá»‘i thiá»ƒu lÃ  1"),

  unitPrice: z
    .number({ message: "ÄÆ¡n giÃ¡ khÃ´ng há»£p lá»‡" })
    .min(0, "ÄÆ¡n giÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m"),

  totalAmount: z
    .number({ message: "Tá»•ng tiá»n khÃ´ng há»£p lá»‡" })
    .min(0, "Tá»•ng tiá»n khÃ´ng Ä‘Æ°á»£c Ã¢m"),

  currency: z.enum(CURRENCIES).default("VND"),

  estimatedWeight: z
    .number({ message: "Trá»ng lÆ°á»£ng Æ°á»›c tÃ­nh khÃ´ng há»£p lá»‡" })
    .min(0)
    .optional()
    .nullable(),

  actualWeight: z
    .number({ message: "Trá»ng lÆ°á»£ng thá»±c táº¿ khÃ´ng há»£p lá»‡" })
    .min(0)
    .optional()
    .nullable(),

  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Warehouse khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  marketingEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "NhÃ¢n viÃªn marketing khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  saleEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "NhÃ¢n viÃªn sale khÃ´ng há»£p lá»‡")
    .optional()
    .nullable(),

  status: z.enum(ORDER_STATUSES).default("PENDING"),

  isPrepaid: z.boolean().default(false),

  orderType: z
    .enum(ORDER_TYPES, { message: "Loáº¡i Ä‘Æ¡n khÃ´ng há»£p lá»‡" })
    .default("NORMAL"),

  orderSource: z
    .enum(ORDER_SOURCES, { message: "Nguá»“n Ä‘Æ¡n khÃ´ng há»£p lá»‡" })
    .default("MANUAL"),

  payments: z.array(orderPaymentSchema).default([]),

  totalPaid: z
    .number({ message: "Tá»•ng thanh toÃ¡n khÃ´ng há»£p lá»‡" })
    .min(0, "Tá»•ng thanh toÃ¡n khÃ´ng Ä‘Æ°á»£c Ã¢m")
    .default(0),

  shipping: orderShippingSchema.optional(),

  note: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Customer khÃ´ng há»£p lá»‡")
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
        message: "Facebook Page khÃ´ng há»£p lá»‡",
      })
      .min(1, "Facebook Page lÃ  báº¯t buá»™c"),

    marketingEmployeeId: z
      .string({
        message: "NhÃ¢n viÃªn marketing khÃ´ng há»£p lá»‡",
      })
      .min(1, "NhÃ¢n viÃªn marketing lÃ  báº¯t buá»™c"),

    startDate: z
      .string({
        message: "NgÃ y báº¯t Ä‘áº§u khÃ´ng há»£p lá»‡",
      })
      .min(1, "NgÃ y báº¯t Ä‘áº§u lÃ  báº¯t buá»™c"),

    endDate: z
      .string({
        message: "NgÃ y káº¿t thÃºc khÃ´ng há»£p lá»‡",
      })
      .nullable()
      .optional(),

    note: z
      .string()
      .trim()
      .default(""),

    isActive: z.boolean({
      message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
    }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      return !isNaN(start.getTime());
    },
    {
      message: "NgÃ y báº¯t Ä‘áº§u khÃ´ng há»£p lá»‡",
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
      message: "NgÃ y káº¿t thÃºc khÃ´ng há»£p lá»‡",
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
      message: "NgÃ y káº¿t thÃºc pháº£i lá»›n hÆ¡n hoáº·c báº±ng ngÃ y báº¯t Ä‘áº§u",
      path: ["endDate"],
    }
  );


// ================================================================
// Inventory History schemas
// ================================================================

const OBJECT_ID_REGEX_INVENTORY = /^[a-f\d]{24}$/i;

/**
 * Schema táº¡o má»›i 1 InventoryHistory.
 * Foundation (Phase 4.1) chá»‰ validate input shape. CÃ¡c field `beforeQuantity`
 * / `afterQuantity` sáº½ do Stock Engine (Phase 4.2) tÃ­nh tá»± Ä‘á»™ng â€” nhÆ°ng váº«n
 * cho phÃ©p caller truyá»n vÃ o Ä‘á»ƒ há»— trá»£ test / seed / migration.
 */
export const createInventoryHistorySchema = z.object({
  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Kho khÃ´ng há»£p lá»‡"),

  productVariantId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "ProductVariant khÃ´ng há»£p lá»‡")
    .optional(),

  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Combo khÃ´ng há»£p lá»‡")
    .optional(),

  orderId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "Order khÃ´ng há»£p lá»‡")
    .optional(),

  employeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_INVENTORY, "NhÃ¢n viÃªn khÃ´ng há»£p lá»‡"),

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

  beforeQuantity: z.number().int("TrÆ°á»›c pháº£i lÃ  sá»‘ nguyÃªn").default(0),

  changeQuantity: z
    .number()
    .int("LÆ°á»£ng thay Ä‘á»•i pháº£i lÃ  sá»‘ nguyÃªn")
    .refine((n) => n !== 0, {
      message: "LÆ°á»£ng thay Ä‘á»•i khÃ´ng Ä‘Æ°á»£c báº±ng 0",
    }),

  afterQuantity: z.number().int("Sau pháº£i lÃ  sá»‘ nguyÃªn"),

  note: z.string().trim().default(""),
});

export type CreateInventoryHistoryForm = z.infer<
  typeof createInventoryHistorySchema
>;

/**
 * Schema cáº­p nháº­t 1 InventoryHistory.
 *
 * Foundation (Phase 4.1): lá»‹ch sá»­ kho lÃ  báº¥t biáº¿n (append-only).
 * NÃªn update chá»‰ cho phÃ©p sá»­a `note` â€” má»i field khÃ¡c sáº½ do Stock Engine
 * (Phase 4.2) reverse transaction báº±ng cÃ¡ch táº¡o row má»›i.
 *
 * Náº¿u sau nÃ y cho phÃ©p admin sá»­a thÃªm, má»Ÿ rá»™ng schema táº¡i Ä‘Ã¢y.
 */
export const updateInventoryHistorySchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Ghi chÃº khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    .max(2000, "Ghi chÃº tá»‘i Ä‘a 2000 kÃ½ tá»±"),
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
    .min(2, "Tên quà tặng phải có ít nhất 2 ký tự")
    .max(100, "Tên quà tặng tối đa 100 ký tự"),

  stockQuantity: z
    .number({
      message: "Số lượng tồn kho phải là số",
    })
    .int("Số lượng tồn kho phải là số nguyên")
    .min(0, "Số lượng tồn kho không được âm")
    .default(0),

  isActive: z
    .boolean()
    .default(true),
});

export const updateGiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên quà tặng phải có ít nhất 2 ký tự")
    .max(100, "Tên quà tặng tối đa 100 ký tự"),

  stockQuantity: z
    .number({
      message: "Số lượng tồn kho phải là số",
    })
    .int("Số lượng tồn kho phải là số nguyên")
    .min(0, "Số lượng tồn kho không được âm"),

  isActive: z.boolean({
    message: "Trạng thái không hợp lệ",
  }),
});

export type CreateGiftForm = z.infer<typeof createGiftSchema>;
export type UpdateGiftForm = z.infer<typeof updateGiftSchema>;
