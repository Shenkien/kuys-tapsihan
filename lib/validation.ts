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
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type OrderStatusUpdatePayload = z.infer<typeof orderStatusUpdateSchema>;
