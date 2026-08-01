import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),

  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export const createEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(50, "Tên đăng nhập tối đa 50 ký tự"),

  password: z
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự"),

  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên không hợp lệ"),

  email: z
    .email("Email không hợp lệ")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trò là bắt buộc"),

  teamCode: z.string().nullable().optional(),

  bankName: z.string().optional(),

  bankAccountNumber: z.string().optional(),

  bankAccountHolder: z.string().optional(),
});
export const updateEmployeeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(50, "Tên đăng nhập tối đa 50 ký tự"),

  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên không hợp lệ")
    .max(100, "Họ tên tối đa 100 ký tự"),

    email: z
    .email("Email không hợp lệ")
    .trim(),

  phone: z.string().optional(),

  avatar: z.string().optional(),

  roleCode: z
    .string()
    .trim()
    .min(1, "Vai trò là bắt buộc"),

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
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(100, "Mật khẩu tối đa 100 ký tự"),
});

export type ResetPasswordForm = z.infer<
  typeof resetPasswordSchema
>;
export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã vai trò tối thiểu 2 ký tự")
    .max(30, "Mã vai trò tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên vai trò tối thiểu 2 ký tự")
    .max(100, "Tên vai trò tối đa 100 ký tự"),

  description: z.string().trim().optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã vai trò tối thiểu 2 ký tự")
    .max(30, "Mã vai trò tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên vai trò tối thiểu 2 ký tự")
    .max(100, "Tên vai trò tối đa 100 ký tự"),

  description: z.string().trim().optional(),

  isActive: z.boolean(),
});

export type UpdateRoleForm = z.infer<typeof updateRoleSchema>;

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã phòng ban tối thiểu 2 ký tự")
    .max(30),

  name: z
    .string()
    .trim()
    .min(2, "Tên phòng ban tối thiểu 2 ký tự")
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
    .min(2, "Mã khu vực phải có ít nhất 2 ký tự")
    .max(30, "Mã khu vực tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên khu vực phải có ít nhất 2 ký tự")
    .max(100, "Tên khu vực tối đa 100 ký tự"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "Mã quốc gia không hợp lệ")
    .max(5, "Mã quốc gia không hợp lệ"),
});

export const updateAreaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã khu vực phải có ít nhất 2 ký tự")
    .max(30, "Mã khu vực tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên khu vực phải có ít nhất 2 ký tự")
    .max(100, "Tên khu vực tối đa 100 ký tự"),

  address: z.string().optional(),

  countryCode: z
    .string()
    .trim()
    .min(2, "Mã quốc gia không hợp lệ")
    .max(5, "Mã quốc gia không hợp lệ"),

  isActive: z.boolean(),
});

export const createTeamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã nhóm tối thiểu 2 ký tự")
    .max(30, "Mã nhóm tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên nhóm tối thiểu 2 ký tự")
    .max(100, "Tên nhóm tối đa 100 ký tự"),

  departmentCode: z
    .string()
    .trim()
    .min(1, "Phòng ban là bắt buộc"),

  areaCode: z
    .string()
    .trim()
    .min(1, "Khu vực là bắt buộc"),

  leaderCode: z.string().nullable().optional(),

  managerCode: z.string().nullable().optional(),
});

export const updateTeamSchema = createTeamSchema.extend({
  isActive: z.boolean({
    message: "Trạng thái hoạt động không hợp lệ",
  }),
});

export const createCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã danh mục phải có ít nhất 2 ký tự")
    .max(20, "Mã danh mục tối đa 20 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự")
    .max(100, "Tên danh mục tối đa 100 ký tự"),

  parentCode: z
    .string()
    .trim()
    .nullable()
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Mô tả tối đa 500 ký tự")
    .optional(),

  sortOrder: z
    .number({
      error: "Thứ tự phải là số",
    })
    .default(0),
});

export const updateCategorySchema =
  createCategorySchema.extend({
    isActive: z.boolean({
      error: "Trạng thái không hợp lệ",
    }),
  });

  export const createProductSchema = z.object({
    code: z
      .string()
      .min(2, "Mã sản phẩm phải có ít nhất 2 ký tự")
      .max(50, "Mã sản phẩm không được quá 50 ký tự"),
  
    name: z
      .string()
      .min(2, "Tên sản phẩm phải có ít nhất 2 ký tự")
      .max(200, "Tên sản phẩm không được quá 200 ký tự"),
  
    categoryCode: z
      .string()
      .min(2, "Mã danh mục không hợp lệ"),
  
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
      message: "Trạng thái không hợp lệ",
    }),
  });

  export const createVariantOptionSchema = z.object({
    code: z
      .string()
      .min(2, "Mã thuộc tính phải có ít nhất 2 ký tự")
      .max(50, "Mã thuộc tính không được quá 50 ký tự"),
  
    name: z
      .string()
      .min(2, "Tên thuộc tính phải có ít nhất 2 ký tự")
      .max(100, "Tên thuộc tính không được quá 100 ký tự"),
  
    sortOrder: z.number().optional().default(0),
  });
  
  export const updateVariantOptionSchema =
  createVariantOptionSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createVariantValueSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã giá trị phải có ít nhất 2 ký tự")
    .max(50, "Mã giá trị không được quá 50 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên giá trị phải có ít nhất 2 ký tự")
    .max(100, "Tên giá trị không được quá 100 ký tự"),

  variantOptionId: z
    .string({
      message: "Thuộc tính biến thể không hợp lệ",
    })
    .min(1, "Thuộc tính biến thể không hợp lệ"),

  sortOrder: z.number().default(0),
});

export const updateVariantValueSchema =
  createVariantValueSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createProductVariantSchema = z.object({
  productId: z
    .string({
      message: "Sản phẩm không hợp lệ",
    })
    .min(1, "Sản phẩm không hợp lệ"),

  sku: z
    .string()
    .trim()
    .min(2, "SKU phải có ít nhất 2 ký tự")
    .max(100, "SKU tối đa 100 ký tự"),

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
    .min(1, "Phải chọn ít nhất một giá trị biến thể"),

  price: z
    .number({
      message: "Giá phải là số",
    })
    .min(0, "Giá không được âm"),

  cost: z.number().default(0),

  weight: z.number().default(0),

  sortOrder: z.number().default(0),
});

export const updateProductVariantSchema =
  createProductVariantSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã nhà cung cấp phải có ít nhất 2 ký tự")
    .max(50, "Mã nhà cung cấp tối đa 50 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên nhà cung cấp phải có ít nhất 2 ký tự")
    .max(100, "Tên nhà cung cấp tối đa 100 ký tự"),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{8,20}$/, "Số điện thoại không hợp lệ"),

  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),

  contactPerson: z.string().default(""),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vực không hợp lệ",
    })
    .min(1, "Khu vực là bắt buộc"),

  note: z.string().default(""),
});

export const updateSupplierSchema =
  createSupplierSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã kho phải có ít nhất 2 ký tự")
    .max(50, "Mã kho tối đa 50 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên kho phải có ít nhất 2 ký tự")
    .max(100, "Tên kho tối đa 100 ký tự"),

  areaId: z
    .string({
      message: "Khu vực không hợp lệ",
    })
    .min(1, "Khu vực là bắt buộc"),

  address: z.string().default(""),

  managerId: z.string().nullable().optional(),

  note: z.string().default(""),
});

export const updateWarehouseSchema =
  createWarehouseSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createInventoryAdjustmentSchema =
  z.object({
    inventoryId: z
      .string({
        message: "ID tồn kho không hợp lệ",
      })
      .min(1, "ID tồn kho là bắt buộc"),

    type: z.enum(["IN", "OUT", "ADJUST"], {
      message: "Loại điều chỉnh không hợp lệ",
    }),

    quantity: z
      .number({
        message: "Số lượng không hợp lệ",
      })
      .min(1, "Số lượng tối thiểu là 1"),

    reason: z
      .string()
      .trim()
      .min(1, "Lý do là bắt buộc"),

    note: z.string().default(""),
  });

export const createCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã khách hàng phải có ít nhất 2 ký tự")
    .max(50, "Mã khách hàng tối đa 50 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên khách hàng phải có ít nhất 2 ký tự")
    .max(100, "Tên khách hàng tối đa 100 ký tự"),

  phone: z
    .string()
    .trim()
    .min(8, "Số điện thoại phải có ít nhất 8 ký tự")
    .max(20, "Số điện thoại tối đa 20 ký tự"),

  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),

  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "Giới tính không hợp lệ",
  }),

  birthday: z.string().optional(),

  address: z.string().default(""),

  areaId: z
    .string({
      message: "Khu vực không hợp lệ",
    })
    .min(1, "Khu vực là bắt buộc"),

  teamId: z
    .string({
      message: "Nhóm không hợp lệ",
    })
    .min(1, "Nhóm là bắt buộc"),

  marketingEmployeeId: z
    .string({
      message: "Nhân viên marketing không hợp lệ",
    })
    .min(1, "Nhân viên marketing phụ trách là bắt buộc"),

  note: z.string().default(""),
});

export const updateCustomerSchema =
  createCustomerSchema.extend({
    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  });

export const createFacebookPageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã page phải có ít nhất 2 ký tự")
    .max(30, "Mã page tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên page phải có ít nhất 2 ký tự")
    .max(100, "Tên page tối đa 100 ký tự"),

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
    .min(2, "Mã page phải có ít nhất 2 ký tự")
    .max(30, "Mã page tối đa 30 ký tự"),

  name: z
    .string()
    .trim()
    .min(2, "Tên page phải có ít nhất 2 ký tự")
    .max(100, "Tên page tối đa 100 ký tự"),

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
    message: "Trạng thái không hợp lệ",
  }),
});

export const createFacebookPageAssignmentSchema = z
  .object({
    facebookPageId: z
      .string({
        message: "Facebook Page không hợp lệ",
      })
      .min(1, "Facebook Page là bắt buộc"),

    marketingEmployeeId: z
      .string({
        message: "Nhân viên marketing không hợp lệ",
      })
      .min(1, "Nhân viên marketing là bắt buộc"),

    startDate: z
      .string({
        message: "Ngày bắt đầu không hợp lệ",
      })
      .min(1, "Ngày bắt đầu là bắt buộc"),

    endDate: z
      .string({
        message: "Ngày kết thúc không hợp lệ",
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
      message: "Ngày bắt đầu không hợp lệ",
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
      message: "Ngày kết thúc không hợp lệ",
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
      message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      path: ["endDate"],
    }
  );

// Lead schemas
const VIETNAMESE_PHONE_REGEX = /^(0[0-9]{9,10})$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const facebookLinkSchema = z
  .string()
  .trim()
  .url("Link Facebook không hợp lệ")
  .refine((value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
    } catch {
      return false;
    }
  }, "Link phải thuộc tên miền Facebook");

const assignedAtSchema = z
  .union([z.iso.datetime(), z.date()])
  .refine(
    (value) => typeof value === "string" || !Number.isNaN(value.getTime()),
    "Ngày phân công không hợp lệ"
  )
  .nullable()
  .optional();

export const createLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "Khách hàng không hợp lệ")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "Tên khách hàng là bắt buộc")
    .max(200, "Tên khách hàng tối đa 200 ký tự"),

  customerNewName: z
    .string()
    .trim()
    .max(200, "Tên mới tối đa 200 ký tự")
    .optional(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),

  phone2: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Số điện thoại 2 không hợp lệ")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(500, "Địa chỉ tối đa 500 ký tự")
    .optional(),

  province: z
    .string()
    .trim()
    .max(100, "Tỉnh/Thành phố tối đa 100 ký tự")
    .optional(),

  district: z
    .string()
    .trim()
    .max(100, "Quận/Huyện tối đa 100 ký tự")
    .optional(),

  ward: z
    .string()
    .trim()
    .max(100, "Phường/Xã tối đa 100 ký tự")
    .optional(),

  sourceType: z.enum([
    "LANDING_PAGE",
    "FACEBOOK_COMMENT",
    "FACEBOOK_INBOX",
    "TIKTOK",
    "ZALO",
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
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "Giá MNT không được âm")
    .optional(),

  unitPriceVND: z
    .number()
    .min(0, "Giá VND không được âm")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "Tỷ giá không được âm")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "Trọng lượng ước tính không được âm")
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
    .max(2000, "Ghi chú xử lý tối đa 2000 ký tự")
    .optional(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chú tối đa 1000 ký tự")
    .optional(),

  isDuplicate: z.boolean().optional().default(false),
});

export const updateLeadSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX, "Khách hàng không hợp lệ")
    .optional()
    .nullable(),

  customerName: z
    .string()
    .trim()
    .min(1, "Tên khách hàng là bắt buộc")
    .max(200, "Tên khách hàng tối đa 200 ký tự")
    .optional(),

  customerNewName: z
    .string()
    .trim()
    .max(200, "Tên mới tối đa 200 ký tự")
    .optional()
    .nullable(),

  facebookLink: facebookLinkSchema
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),

  phone2: z
    .string()
    .trim()
    .regex(VIETNAMESE_PHONE_REGEX, "Số điện thoại 2 không hợp lệ")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(500, "Địa chỉ tối đa 500 ký tự")
    .optional(),

  province: z
    .string()
    .trim()
    .max(100, "Tỉnh/Thành phố tối đa 100 ký tự")
    .optional(),

  district: z
    .string()
    .trim()
    .max(100, "Quận/Huyện tối đa 100 ký tự")
    .optional(),

  ward: z
    .string()
    .trim()
    .max(100, "Phường/Xã tối đa 100 ký tự")
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
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .optional(),

  unitPriceMNT: z
    .number()
    .min(0, "Giá MNT không được âm")
    .optional(),

  unitPriceVND: z
    .number()
    .min(0, "Giá VND không được âm")
    .optional(),

  exchangeRate: z
    .number()
    .min(0, "Tỷ giá không được âm")
    .optional(),

  estimatedWeight: z
    .number()
    .min(0, "Trọng lượng ước tính không được âm")
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
    .max(2000, "Ghi chú xử lý tối đa 2000 ký tự")
    .optional()
    .nullable(),

  note: z
    .string()
    .trim()
    .max(1000, "Ghi chú tối đa 1000 ký tự")
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
      message: "ProductVariant không hợp lệ",
    })
    .min(1, "ProductVariant là bắt buộc"),

  quantity: z
    .number({
      message: "Số lượng không hợp lệ",
    })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải lớn hơn 0"),

  isGift: z.boolean().default(false),
});

export const createComboSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã combo là bắt buộc")
      .max(50, "Mã combo tối đa 50 ký tự"),

    name: z
      .string()
      .trim()
      .min(1, "Tên combo là bắt buộc")
      .max(200, "Tên combo tối đa 200 ký tự"),

    productCode: z
      .string()
      .trim()
      .nonempty("Sản phẩm là bắt buộc"),

    categoryCode: z
      .string()
      .trim()
      .nonempty("Danh mục là bắt buộc"),

    comboItems: z
      .array(comboItemSchema)
      .min(1, "Combo phải có ít nhất 1 sản phẩm"),

    sellingPrice: z
      .number({
        message: "Giá bán không hợp lệ",
      })
      .min(0, "Giá bán phải lớn hơn hoặc bằng 0"),

    packageSize: z
      .number({
        message: "Số lượng combo không hợp lệ",
      })
      .int("Số lượng combo phải là số nguyên")
      .min(1, "Số lượng combo phải lớn hơn 0"),

    displayOrder: z
      .number()
      .int("Thứ tự hiển thị phải là số nguyên")
      .min(0, "Thứ tự hiển thị không được âm")
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
      message: "ProductVariant bị trùng trong combo",
      path: ["comboItems"],
    }
  );

export const updateComboSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã combo là bắt buộc")
      .max(50, "Mã combo tối đa 50 ký tự"),

    name: z
      .string()
      .trim()
      .min(1, "Tên combo là bắt buộc")
      .max(200, "Tên combo tối đa 200 ký tự"),

    productCode: z
      .string()
      .trim()
      .nonempty("Sản phẩm là bắt buộc"),

    categoryCode: z
      .string()
      .trim()
      .nonempty("Danh mục là bắt buộc"),

    comboItems: z
      .array(comboItemSchema)
      .min(1, "Combo phải có ít nhất 1 sản phẩm"),

    sellingPrice: z
      .number({
        message: "Giá bán không hợp lệ",
      })
      .min(0, "Giá bán phải lớn hơn hoặc bằng 0"),

    packageSize: z
      .number({
        message: "Số lượng combo không hợp lệ",
      })
      .int("Số lượng combo phải là số nguyên")
      .min(1, "Số lượng combo phải lớn hơn 0"),

    displayOrder: z
      .number()
      .int("Thứ tự hiển thị phải là số nguyên")
      .min(0, "Thứ tự hiển thị không được âm")
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
      message: "ProductVariant bị trùng trong combo",
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
    message: "Phương thức thanh toán không hợp lệ",
  }),
  amount: z
    .number({ message: "Số tiền không hợp lệ" })
    .min(0, "Số tiền không được âm"),
  currency: z.enum(CURRENCIES).default("VND"),
  paidAt: z.string().datetime().optional().nullable(),
  transactionId: z.string().default(""),
  note: z.string().default(""),
});

const orderShippingSchema = z.object({
  receiverName: z
    .string()
    .trim()
    .min(1, "Tên người nhận là bắt buộc")
    .max(200),
  receiverPhone: z
    .string()
    .trim()
    .min(1, "SĐT người nhận là bắt buộc")
    .max(20),
  address: z
    .string()
    .trim()
    .min(1, "Địa chỉ giao hàng là bắt buộc")
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
    .regex(OBJECT_ID_REGEX_ORDER, "Customer không hợp lệ")
    .min(1, "Customer là bắt buộc"),

  customerName: z
    .string()
    .trim()
    .min(1, "Tên khách hàng là bắt buộc")
    .max(200),

  customerPhone: z.string().max(20).optional(),

  leadId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Lead không hợp lệ")
    .optional()
    .nullable(),

  productId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Product không hợp lệ")
    .optional()
    .nullable(),

  comboId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Combo không hợp lệ")
    .optional()
    .nullable(),

  quantity: z
    .number({ message: "Số lượng không hợp lệ" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1"),

  unitPrice: z
    .number({ message: "Đơn giá không hợp lệ" })
    .min(0, "Đơn giá không được âm"),

  totalAmount: z
    .number({ message: "Tổng tiền không hợp lệ" })
    .min(0, "Tổng tiền không được âm"),

  currency: z.enum(CURRENCIES).default("VND"),

  estimatedWeight: z
    .number({ message: "Trọng lượng ước tính không hợp lệ" })
    .min(0)
    .optional()
    .nullable(),

  actualWeight: z
    .number({ message: "Trọng lượng thực tế không hợp lệ" })
    .min(0)
    .optional()
    .nullable(),

  warehouseId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Warehouse không hợp lệ")
    .optional()
    .nullable(),

  marketingEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Nhân viên marketing không hợp lệ")
    .optional()
    .nullable(),

  saleEmployeeId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Nhân viên sale không hợp lệ")
    .optional()
    .nullable(),

  status: z.enum(ORDER_STATUSES).default("PENDING"),

  isPrepaid: z.boolean().default(false),

  orderType: z
    .enum(ORDER_TYPES, { message: "Loại đơn không hợp lệ" })
    .default("NORMAL"),

  orderSource: z
    .enum(ORDER_SOURCES, { message: "Nguồn đơn không hợp lệ" })
    .default("MANUAL"),

  payments: z.array(orderPaymentSchema).default([]),

  totalPaid: z
    .number({ message: "Tổng thanh toán không hợp lệ" })
    .min(0, "Tổng thanh toán không được âm")
    .default(0),

  shipping: orderShippingSchema.optional(),

  note: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  customerId: z
    .string()
    .regex(OBJECT_ID_REGEX_ORDER, "Customer không hợp lệ")
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
        message: "Facebook Page không hợp lệ",
      })
      .min(1, "Facebook Page là bắt buộc"),

    marketingEmployeeId: z
      .string({
        message: "Nhân viên marketing không hợp lệ",
      })
      .min(1, "Nhân viên marketing là bắt buộc"),

    startDate: z
      .string({
        message: "Ngày bắt đầu không hợp lệ",
      })
      .min(1, "Ngày bắt đầu là bắt buộc"),

    endDate: z
      .string({
        message: "Ngày kết thúc không hợp lệ",
      })
      .nullable()
      .optional(),

    note: z
      .string()
      .trim()
      .default(""),

    isActive: z.boolean({
      message: "Trạng thái không hợp lệ",
    }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      return !isNaN(start.getTime());
    },
    {
      message: "Ngày bắt đầu không hợp lệ",
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
      message: "Ngày kết thúc không hợp lệ",
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
      message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      path: ["endDate"],
    }
  );

