/**
 * ==================================================
 * QUICK ORDER IMPORT VALIDATION SERVICE
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import (Fixed)
 *
 * Responsible for:
 *   - Loading reference data (Product, Combo, Customer) for matching
 *   - Matching parsed rows to existing entities
 *   - Validating each row INDEPENDENTLY (no shared state)
 *
 * IMPORTANT: Each row is validated independently.
 * No mutable state is shared between rows.
 */

import Product from "@/models/Product";
import Combo from "@/models/Combo";
import Customer from "@/models/Customer";
import { getCurrentExchangeRate } from "@/lib/system-settings";

import type {
  QuickOrderProductRef,
  QuickOrderComboRef,
  QuickOrderCustomerRef,
  QuickOrderImportContext,
  ParsedQuickOrderRow,
  QuickOrderValidationIssue,
  QuickOrderValidationCode,
  QuickOrderComboCandidate,
  EditableQuickOrderRow,
  QuickOrderParsedRowBase,
} from "@/types/quickOrder";

// ==================================================
// Cache (singleton, time-bounded)
// ==================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedContext: QuickOrderImportContext | null = null;
let cacheInflight: Promise<QuickOrderImportContext> | null = null;

function isCacheFresh(ctx: QuickOrderImportContext | null): ctx is QuickOrderImportContext {
  return !!ctx && Date.now() - ctx.loadedAt < CACHE_TTL_MS;
}

// ==================================================
// Batch loaders
// ==================================================

async function loadProducts(): Promise<{
  byCode: Map<string, QuickOrderProductRef>;
  byName: Map<string, QuickOrderProductRef>;
}> {
  const docs = await Product.find({ isActive: true })
    .select("_id code name")
    .lean()
    .exec();

  const byCode = new Map<string, QuickOrderProductRef>();
  const byName = new Map<string, QuickOrderProductRef>();

  for (const d of docs as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
  }>) {
    if (!d.code) continue;
    const ref: QuickOrderProductRef = {
      id: d._id.toString(),
      code: d.code.toUpperCase(),
      name: d.name,
      isActive: true,
    };
    byCode.set(d.code.toUpperCase(), ref);
    byName.set(d.name.toLowerCase().trim(), ref);
  }

  return { byCode, byName };
}

async function loadCombos(): Promise<{
  byCode: Map<string, QuickOrderComboRef>;
  byProductId: Map<string, QuickOrderComboRef[]>;
}> {
  const docs = await Combo.find({ isActive: true })
    .select("_id code name productId sellingPrice giftQuantity")
    .populate("productId", "_id code name")
    .lean()
    .exec();

  const byCode = new Map<string, QuickOrderComboRef>();
  const byProductId = new Map<string, QuickOrderComboRef[]>();

  for (const d of docs as unknown as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
    productId: { _id: { toString: () => string }; code: string; name: string } | string;
    sellingPrice: number;
    giftQuantity: number;
  }>) {
    if (!d.code) continue;

    const productIdStr = typeof d.productId === "string"
      ? d.productId
      : (d.productId as { _id: { toString: () => string } })._id.toString();

    const ref: QuickOrderComboRef = {
      id: d._id.toString(),
      code: d.code.toUpperCase(),
      name: d.name,
      productId: productIdStr,
      sellingPrice: d.sellingPrice,
      giftQuantity: d.giftQuantity,
      isActive: true,
    };
    byCode.set(d.code.toUpperCase(), ref);

    const existing = byProductId.get(productIdStr) || [];
    existing.push(ref);
    byProductId.set(productIdStr, existing);
  }

  return { byCode, byProductId };
}

async function loadCustomers(): Promise<Map<string, QuickOrderCustomerRef>> {
  const docs = await Customer.find({ isActive: true })
    .select("_id customerCode fullName phone address")
    .lean()
    .exec();

  const byPhone = new Map<string, QuickOrderCustomerRef>();

  for (const d of docs as Array<{
    _id: { toString: () => string };
    customerCode: string;
    fullName: string;
    phone: string;
    address?: { street?: string };
  }>) {
    if (!d.phone) continue;
    const phoneKey = d.phone.trim();
    byPhone.set(phoneKey, {
      id: d._id.toString(),
      customerCode: d.customerCode,
      fullName: d.fullName,
      phone: d.phone,
      address: d.address ? d.address.street : undefined,
      isActive: true,
    });
  }

  return byPhone;
}

async function loadExchangeRateData(): Promise<{ rate: number; date: Date }> {
  const setting = await getCurrentExchangeRate();
  return {
    rate: setting.rate,
    date: setting.updatedAt ? new Date(setting.updatedAt) : new Date(),
  };
}

// ==================================================
// Public API
// ==================================================

export async function loadQuickOrderImportContext(
  options: { force?: boolean } = {}
): Promise<QuickOrderImportContext> {
  const { force = false } = options;

  if (!force && isCacheFresh(cachedContext)) {
    return cachedContext;
  }

  if (cacheInflight) {
    return cacheInflight;
  }

  cacheInflight = (async () => {
    const [products, combos, customers, exchangeRate] = await Promise.all([
      loadProducts(),
      loadCombos(),
      loadCustomers(),
      loadExchangeRateData(),
    ]);

    const ctx: QuickOrderImportContext = {
      productsByCode: products.byCode,
      productsByName: products.byName,
      combosByCode: combos.byCode,
      combosByProductId: combos.byProductId,
      customersByPhone: customers,
      exchangeRate: exchangeRate.rate,
      exchangeRateDate: exchangeRate.date,
      loadedAt: Date.now(),
    };

    cachedContext = ctx;
    return ctx;
  })();

  try {
    return await cacheInflight;
  } finally {
    cacheInflight = null;
  }
}

export function clearQuickOrderImportContextCache(): void {
  cachedContext = null;
}

// ==================================================
// Validation helpers
// ==================================================

function err(
  code: QuickOrderValidationCode,
  message: string,
  field: QuickOrderValidationIssue["field"]
): QuickOrderValidationIssue {
  return { code, message, severity: "ERROR", field };
}

function warn(
  code: QuickOrderValidationCode,
  message: string,
  field: QuickOrderValidationIssue["field"]
): QuickOrderValidationIssue {
  return { code, message, severity: "WARNING", field };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "").trim();
}

// ==================================================
// Product matching (EXACT MATCH PRIORITY)
// ==================================================

interface ProductMatchResult {
  product?: QuickOrderProductRef;
  matchScore: number;
  isExactMatch: boolean;
}

/**
 * Match product by text with EXACT MATCH priority.
 *
 * Priority order:
 * 1. EXACT code match (case-insensitive)
 * 2. EXACT name match (case-insensitive)
 * 3. NO match (partial matches are NOT considered valid)
 *
 * CRITICAL: Partial matches like "EYE" matching "EYELASH" are NOT valid.
 * Only exact matches are accepted.
 */
function matchProduct(
  productText: string,
  context: QuickOrderImportContext
): ProductMatchResult {
  if (!productText || !productText.trim()) {
    return { matchScore: 0, isExactMatch: false };
  }

  const normalizedInput = productText.trim();

  // 1. EXACT code match (case-insensitive)
  const byCode = context.productsByCode.get(normalizedInput.toUpperCase());
  if (byCode) {
    return { product: byCode, matchScore: 100, isExactMatch: true };
  }

  // 2. EXACT name match (case-insensitive)
  const byName = context.productsByName.get(normalizedInput.toLowerCase().trim());
  if (byName) {
    return { product: byName, matchScore: 100, isExactMatch: true };
  }

  // NO partial match - partial matches are NOT considered valid
  // Only exact matches are accepted
  return { matchScore: 0, isExactMatch: false };
}

// ==================================================
// Combo matching (MUST BELONG TO PRODUCT)
// ==================================================

interface ComboMatchResult {
  combo?: QuickOrderComboRef;
  candidates: QuickOrderComboCandidate[];
  matchScore: number;
}

/**
 * Match combo by text.
 *
 * IMPORTANT:
 * - If productId is provided, ONLY combos belonging to that product are considered
 * - If productId is not provided, no combo can be matched (show as "need selection")
 *
 * Priority:
 * 1. EXACT code match
 * 2. EXACT name match
 * 3. Price match (if combo has exact price)
 */
function matchCombo(
  comboText: string,
  productId: string | undefined,
  context: QuickOrderImportContext
): ComboMatchResult {
  const candidates: QuickOrderComboCandidate[] = [];
  let bestCombo: QuickOrderComboRef | undefined;
  let bestScore = 0;

  // Get combos for this product
  const relevantCombos: QuickOrderComboRef[] = [];

  if (productId) {
    const combosForProduct = context.combosByProductId.get(productId);
    if (combosForProduct) {
      relevantCombos.push(...combosForProduct);
    }
  } else {
    // No product specified - cannot match combo
    return { candidates: [], matchScore: 0 };
  }

  if (relevantCombos.length === 0) {
    return { candidates: [], matchScore: 0 };
  }

  const normalizedComboText = (comboText || "").toLowerCase().trim();

  // Extract price from combo text
  const priceMatch = normalizedComboText.match(/([\d,]+)/);
  const extractedPrice = priceMatch
    ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
    : 0;

  for (const combo of relevantCombos) {
    const comboNameLower = combo.name.toLowerCase();
    let score = 0;

    // 1. EXACT code match
    if (combo.code.toLowerCase() === normalizedComboText) {
      score = 100;
    }
    // 2. EXACT name match
    else if (comboNameLower === normalizedComboText) {
      score = 95;
    }
    // 3. Price match (within same product)
    else if (extractedPrice > 0 && combo.sellingPrice === extractedPrice) {
      score = 60;
    }

    if (score > 0) {
      const productRef = context.productsByCode.get(
        [...context.productsByCode.values()]
          .find((p) => p.id === combo.productId)
          ?.code || ""
      );

      candidates.push({
        id: combo.id,
        code: combo.code,
        name: combo.name,
        productId: combo.productId,
        productName: productRef?.name || "",
        sellingPrice: combo.sellingPrice,
        giftQuantity: combo.giftQuantity,
        matchScore: score,
      });

      if (score > bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
    }
  }

  // Sort candidates by score
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    combo: bestCombo,
    candidates: candidates.slice(0, 10),
    matchScore: bestScore,
  };
}

// ==================================================
// Customer matching
// ==================================================

interface CustomerMatchResult {
  customer?: QuickOrderCustomerRef;
  isNewCustomer: boolean;
}

function matchCustomer(
  phone: string,
  context: QuickOrderImportContext
): CustomerMatchResult {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return { isNewCustomer: true };
  }

  // Try exact phone match
  const customer = context.customersByPhone.get(normalizedPhone);
  if (customer) {
    return { customer, isNewCustomer: false };
  }

  // Try without leading 0
  const phoneWithoutZero = normalizedPhone.startsWith("0")
    ? normalizedPhone.slice(1)
    : normalizedPhone;

  for (const [key, cust] of context.customersByPhone) {
    const keyWithoutZero = key.startsWith("0") ? key.slice(1) : key;
    if (keyWithoutZero === phoneWithoutZero) {
      return { customer: cust, isNewCustomer: false };
    }
  }

  return { isNewCustomer: true };
}

// ==================================================
// Row validation (EACH ROW INDEPENDENT)
// ==================================================

/**
 * Validate a single parsed row.
 *
 * CRITICAL: This function is stateless for each row.
 * No mutable state is shared between rows.
 */
export function validateQuickOrderRow(
  row: QuickOrderParsedRowBase,
  context: QuickOrderImportContext
): ParsedQuickOrderRow {
  const issues: QuickOrderValidationIssue[] = [];

  // --- Customer validation ---
  const customerMatch = matchCustomer(row.phone, context);
  const customerId = customerMatch.customer?.id;
  const isNewCustomer = customerMatch.isNewCustomer;

  // Required: customer name (if new customer)
  if (isNewCustomer && !row.customerName?.trim()) {
    issues.push(err("MISSING_CUSTOMER_NAME", "Thiếu tên khách hàng", "customerName"));
  }

  // Required: phone
  if (!row.phone?.trim()) {
    issues.push(err("MISSING_PHONE", "Thiếu số điện thoại", "phone"));
  } else if (!/^[0]?[0-9]{8}$/.test(normalizePhone(row.phone))) {
    issues.push(err("PHONE_INVALID", "Số điện thoại không hợp lệ", "phone"));
  }

  // --- Product matching (EXACT MATCH ONLY) ---
  const productMatch = matchProduct(row.productText, context);
  const productId = productMatch.product?.id;
  const productCode = productMatch.product?.code;
  const productName = productMatch.product?.name;

  // --- Combo matching (MUST BELONG TO PRODUCT) ---
  const comboMatch = matchCombo(row.comboText, productId, context);
  const comboId = comboMatch.combo?.id;
  const comboCode = comboMatch.combo?.code;
  const comboName = comboMatch.combo?.name;
  const comboPrice = comboMatch.combo?.sellingPrice;

  // If we have product but combo not matched
  if (productId && !comboId && row.comboText?.trim()) {
    if (comboMatch.candidates.length > 0) {
      issues.push(
        warn(
          "COMBO_NOT_FOUND",
          "⚠ Combo chưa xác định - vui lòng chọn",
          "combo"
        )
      );
    } else {
      issues.push(
        warn(
          "COMBO_NOT_FOUND",
          "⚠ Combo không tìm thấy cho sản phẩm này",
          "combo"
        )
      );
    }
  }

  // If we have combo but product not determined
  if (comboId && !productId) {
    issues.push(
      err(
        "PRODUCT_NOT_FOUND",
        "Cần xác định sản phẩm trước khi chọn combo",
        "product"
      )
    );
  }

  // --- Price validation ---
  // Price comes from parsed combo text OR combo database
  const priceValue = parseInt(row.priceText || "0", 10) || (comboPrice || 0);

  if (priceValue < 0) {
    issues.push(err("PRICE_INVALID", "Giá không hợp lệ", "price"));
  }

  const hasError = issues.some((i) => i.severity === "ERROR");

  return {
    rowNumber: row.rowNumber,
    timestamp: row.timestamp,
    customerName: row.customerName,
    phone: row.phone,
    address: row.address,
    comboText: row.comboText,
    productText: row.productText,
    priceText: row.priceText || (comboPrice ? String(comboPrice) : ""),
    raw: row.raw,
    productId,
    productCode,
    productName,
    comboId,
    comboCode,
    comboName,
    comboPrice,
    customerId,
    isNewCustomer,
    status: hasError ? "INVALID" : "VALID",
    errors: issues,
    isDuplicate: false,
    exchangeRate: context.exchangeRate,
    exchangeRateDate: context.exchangeRateDate,
  };
}

/**
 * Convert validated row to editable row for UI.
 */
export function toEditableRow(row: ParsedQuickOrderRow): EditableQuickOrderRow {
  return {
    ...row,
    editableCustomerName: row.customerName,
    editablePhone: row.phone,
    editableAddress: row.address || "",
    editableProductId: row.productId,
    editableComboId: row.comboId,
    editableQuantity: 1,
    editablePrice: row.comboPrice || parseInt(row.priceText || "0", 10) || 0,
    editableNote: "",
    comboCandidates: [],
  };
}

/**
 * Get combo candidates for a specific product.
 */
export function getComboCandidatesForProduct(
  productId: string,
  context: QuickOrderImportContext
): QuickOrderComboCandidate[] {
  const combos = context.combosByProductId.get(productId) || [];

  return combos.map((combo) => {
    const productRef = [...context.productsByCode.values()].find(
      (p) => p.id === combo.productId
    );
    return {
      id: combo.id,
      code: combo.code,
      name: combo.name,
      productId: combo.productId,
      productName: productRef?.name || "",
      sellingPrice: combo.sellingPrice,
      giftQuantity: combo.giftQuantity,
      matchScore: 100,
    };
  });
}
