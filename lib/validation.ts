import { z } from "zod";

// ---------------------------------------------------------------------------
// Password rules — shared between the client-side strength meter and the
// server-side registration route so the two never disagree.
// ---------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const passwordRequirements: PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "case",
    label: "Contains uppercase & lowercase letters",
    test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "Contains at least 1 number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "Contains at least 1 special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export type PasswordStrengthLabel = "empty" | "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): {
  passedCount: number;
  percent: number;
  label: PasswordStrengthLabel;
} {
  if (!password) return { passedCount: 0, percent: 0, label: "empty" };

  const passedCount = passwordRequirements.filter((r) => r.test(password)).length;
  const percent = Math.round((passedCount / passwordRequirements.length) * 100);

  let label: PasswordStrengthLabel;
  if (passedCount <= 1) label = "weak";
  else if (passedCount <= 3) label = "medium";
  else label = "strong";

  return { passedCount, percent, label };
}

export function isPasswordValid(password: string): boolean {
  return passwordRequirements.every((r) => r.test(password));
}

// ---------------------------------------------------------------------------
// Register form schema (server-authoritative)
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(100, "Full name is too long."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      .refine(isPasswordValid, {
        message:
          "Password must include uppercase & lowercase letters, a number, and a special character.",
      }),
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const emailCheckSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const loginReasonSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Step 2: Menu, Category, Inventory, Recipe management
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters.").max(60),
  sortOrder: z.coerce.number().int().default(0),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2, "Item name must be at least 2 characters.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().positive("Price must be greater than 0."),
  categoryId: z.string().min(1, "Select a category."),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  isAvailable: z.coerce.boolean().default(true),
  isBestSeller: z.coerce.boolean().default(false),
  isNew: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2, "Item name must be at least 2 characters.").max(120),
  category: z.string().trim().min(1).max(60).default("Uncategorized"),
  unit: z.string().trim().min(1, "Unit is required (e.g. pcs, kg, cup).").max(20),
  quantityOnHand: z.coerce.number().min(0, "Quantity can't be negative.").default(0),
  reorderThreshold: z.coerce.number().min(0, "Threshold can't be negative.").default(0),
  unitCost: z.coerce.number().min(0).optional(),
});

export const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantityUsed: z.coerce.number().positive("Quantity used must be greater than 0."),
});

export const recipeSchema = z.object({
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient."),
});

// ---------------------------------------------------------------------------
// Ordering (kiosk + QR) schemas
// ---------------------------------------------------------------------------

export const addOnSelectionSchema = z.object({
  addOnId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const cartItemSchema = z
  .object({
    menuItemId: z.string().min(1).optional(),
    comboMealId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(50, "Quantity is too high."),
    notes: z.string().trim().max(200, "Note is too long.").optional().or(z.literal("")),
    addOns: z.array(addOnSelectionSchema).max(10, "Too many add-ons.").optional(),
  })
  .refine((v) => Boolean(v.menuItemId) !== Boolean(v.comboMealId), {
    message: "Each cart line must be either a menu item or a combo meal.",
  });

export const createOrderSchema = z.object({
  channel: z.enum(["KIOSK", "QR"]),
  tableToken: z.string().trim().optional(), // QR channel only; resolved to a tableId server-side
  customerName: z.string().trim().max(80, "Name is too long.").optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "GCASH", "MAYA", "CARD"]).optional(),
  notes: z.string().trim().max(300, "Note is too long.").optional().or(z.literal("")),
  items: z.array(cartItemSchema).min(1, "Your cart is empty."),
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

// ---------------------------------------------------------------------------
// Step 4/5: Kitchen queue — staff order status updates
// ---------------------------------------------------------------------------

// Staff only ever drive the queue forward through these three transitions —
// PREPARING isn't offered as a separate staff action; "RECEIVE" (-> CONFIRMED
// + prints the kitchen slip) already means "we're now cooking it".
export const orderStatusUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export type OrderStatusUpdatePayload = z.infer<typeof orderStatusUpdateSchema>;

// ---------------------------------------------------------------------------
// Sales Management — Payment / Void-Refund modules
// ---------------------------------------------------------------------------

export const markOrderPaidSchema = z
  .object({
    paymentMethod: z.enum(["CASH", "GCASH", "MAYA", "CARD"]),
    discountType: z.enum(["NONE", "SENIOR_CITIZEN", "PWD", "PROMO"]).default("NONE"),
    discountReason: z.string().trim().max(200, "Reason is too long.").optional().or(z.literal("")),
    discountAmount: z.coerce.number().min(0).max(100000).optional(),
  })
  .refine(
    (v) => (v.discountType === "SENIOR_CITIZEN" || v.discountType === "PWD" ? Boolean(v.discountReason?.trim()) : true),
    { message: "Please record the senior citizen/PWD ID number as the discount reason.", path: ["discountReason"] }
  )
  .refine((v) => (v.discountType === "PROMO" ? Boolean(v.discountReason?.trim()) : true), {
    message: "Please note the promo code or reason for this discount.",
    path: ["discountReason"],
  })
  .refine((v) => (v.discountType === "PROMO" ? Boolean(v.discountAmount && v.discountAmount > 0) : true), {
    message: "Enter a promo discount amount greater than 0.",
    path: ["discountAmount"],
  });

export type MarkOrderPaidPayload = z.infer<typeof markOrderPaidSchema>;

export const refundOrderSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a reason for the refund.").max(300, "Reason is too long."),
});

export type RefundOrderPayload = z.infer<typeof refundOrderSchema>;

// ---------------------------------------------------------------------------
// Sales Management — Business settings (tax/service charge/discount rates)
// ---------------------------------------------------------------------------

export const businessSettingsSchema = z.object({
  vatRate: z.coerce.number().min(0).max(100).optional(),
  vatInclusive: z.coerce.boolean().optional(),
  serviceChargeRate: z.coerce.number().min(0).max(100).optional(),
  seniorPwdDiscountRate: z.coerce.number().min(0).max(100).optional(),
  receiptPrefix: z.string().trim().min(1).max(10).optional(),
  orderingCost: z.coerce.number().min(0).max(100000).optional(),
  holdingCostRate: z.coerce.number().min(0).max(100).optional(),
});

export type BusinessSettingsPayload = z.infer<typeof businessSettingsSchema>;

// ---------------------------------------------------------------------------
// Ordering (QR + Kiosk) — Table & QR Code Maintenance Module
// ---------------------------------------------------------------------------

export const tableSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, "Table number/label is required.")
    .max(20, "Keep the table number/label short."),
});

export const tableUpdateSchema = z.object({
  tableNumber: tableSchema.shape.tableNumber.optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Ordering (QR + Kiosk) — Add-on Maintenance Module
// ---------------------------------------------------------------------------

export const addOnSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  price: z.coerce.number().min(0, "Price can't be negative.").max(10000),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const addOnUpdateSchema = addOnSchema.partial();

// ---------------------------------------------------------------------------
// Ordering (QR + Kiosk) — Combo Meal Maintenance Module
// ---------------------------------------------------------------------------

export const comboMealItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const comboMealSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price can't be negative.").max(100000),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
  items: z.array(comboMealItemSchema).min(1, "A combo needs at least one menu item."),
});

export const comboMealUpdateSchema = comboMealSchema.partial().extend({
  items: z.array(comboMealItemSchema).min(1, "A combo needs at least one menu item.").optional(),
});

// ---------------------------------------------------------------------------
// Inventory Management — Supplier Maintenance Module
// ---------------------------------------------------------------------------

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required.").max(150),
  contactPerson: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email.").max(150).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const supplierUpdateSchema = supplierSchema.partial();

// ---------------------------------------------------------------------------
// Inventory Management — Purchase Order Maintenance/Transaction Module
// ---------------------------------------------------------------------------

export const purchaseOrderItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantityOrdered: z.coerce.number().positive("Quantity must be greater than 0."),
  unitCost: z.coerce.number().min(0, "Cost can't be negative."),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one item to the purchase order."),
});

// ---------------------------------------------------------------------------
// Inventory Management — Waste/Spoilage Logging Module
// ---------------------------------------------------------------------------

export const wasteLogSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  reason: z.enum(["WASTE", "SPOILAGE", "RECOUNT", "OTHER"]),
  details: z.string().trim().max(300).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Customer Feedback & Rating Module
// ---------------------------------------------------------------------------

export const submitFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Full User Management Module
// ---------------------------------------------------------------------------

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Forgot/Reset Password Module
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
