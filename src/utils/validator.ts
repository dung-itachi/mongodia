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