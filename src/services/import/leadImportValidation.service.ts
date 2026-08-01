/**
 * ==================================================
 * LEAD IMPORT BUSINESS VALIDATION SERVICE
 * ==================================================
 *
 * Responsible for:
 *   - Loading reference data the lead import pipeline needs
 *     (Product, Combo, Facebook Page, Customer, Employee).
 *   - Building in-memory cache maps keyed by canonical code/id.
 *   - Exposing a single batch-load entry point so callers (e.g. the
 *     import UI) never need to issue per-row DB lookups.
 *
 * Why this exists:
 *   - Parser (`leadParser.ts`) must stay free of any database /
 *     Mongoose imports so it can be unit-tested in isolation.
 *   - With 1,000 pasted leads we must do at most ONE batch query
 *     per reference domain, never N.
 *   - Future phases (duplicate detection, auto-create customer,
 *     auto-assign sale, DB import) plug in here without touching
 *     the parser.
 *
 * Architecture:
 *
 *   LeadImportPreview
 *        |
 *        v
 *   loadLeadImportContext()  ← batch query + build maps
 *        |
 *        v
 *   LeadImportContext (cache maps)
 *        |
 *        v
 *   parseLead(text, context)  ← pure, no DB
 *        |
 *        v
 *   Preview
 * ==================================================
 */

import Product from "@/models/Product";
import Combo from "@/models/Combo";
import FacebookPage from "@/models/FacebookPage";
import Customer from "@/models/Customer";
import Employee from "@/models/Employee";
import { Lead } from "@/models/Lead";

// ==================================================
// Types
// ==================================================

/** Sliding window for the cache to avoid unbounded growth in long sessions. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Minimal projection per domain (kept small for fast batch queries). */
export interface ProductRef {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ComboRef {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface FacebookPageRef {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CustomerRef {
  id: string;
  code: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export interface EmployeeRef {
  id: string;
  employeeCode: string;
  username: string;
  fullName: string;
  isActive: boolean;
}

/**
 * Minimal Customer projection used for duplicate detection.
 * `facebookLink` is intentionally absent — Customer model has no such field;
 * fallback to Lead map for Facebook-level duplicate detection.
 */
export interface CustomerRef {
  id: string;
  code: string;
  name: string;
  phone: string;
  isActive: boolean;
}

/**
 * Minimal Lead projection used for duplicate detection.
 * Only what the parser needs to flag a duplicate row.
 */
export interface LeadRef {
  id: string;
  leadCode: string;
  customerId?: string;
  customerName: string;
  phone?: string;
  facebookLink?: string;
  status: string;
  createdAt?: Date;
}

/**
 * Aggregate context consumed by the parser.
 * Parser only reads from these maps; it never queries the DB.
 */
export interface LeadImportContext {
  productsByCode: Map<string, ProductRef>;
  combosByCode: Map<string, ComboRef>;
  facebookPagesByCode: Map<string, FacebookPageRef>;
  customersByPhone: Map<string, CustomerRef>;
  employeesByCode: Map<string, EmployeeRef>;

  // Phase 3.4 - Duplicate Detection
  customersByFacebookLink: Map<string, CustomerRef>; // empty unless Customer model grows facebookLink
  leadsByPhone: Map<string, LeadRef>;
  leadsByFacebookLink: Map<string, LeadRef>;

  /** When the snapshot was loaded. Used to refresh cache lazily. */
  loadedAt: number;
}

// ==================================================
// Internal cache (singleton, time-bounded)
// ==================================================

let cachedContext: LeadImportContext | null = null;
let cacheInflight: Promise<LeadImportContext> | null = null;

function isCacheFresh(ctx: LeadImportContext | null): ctx is LeadImportContext {
  return !!ctx && Date.now() - ctx.loadedAt < CACHE_TTL_MS;
}

// ==================================================
// Batch loaders (one query per domain)
// ==================================================

async function loadProducts(): Promise<Map<string, ProductRef>> {
  // Single batch query → returns ALL products. Indexed by canonical code.
  const docs = await Product.find({})
    .select("_id code name isActive")
    .lean()
    .exec();

  const map = new Map<string, ProductRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
    isActive?: boolean;
  }>) {
    if (!d.code) continue;
    map.set(d.code.toUpperCase(), {
      id: d._id.toString(),
      code: d.code,
      name: d.name,
      isActive: d.isActive ?? true,
    });
  }
  return map;
}

async function loadCombos(): Promise<Map<string, ComboRef>> {
  const docs = await Combo.find({})
    .select("_id code name isActive")
    .lean()
    .exec();

  const map = new Map<string, ComboRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
    isActive?: boolean;
  }>) {
    if (!d.code) continue;
    map.set(d.code.toUpperCase(), {
      id: d._id.toString(),
      code: d.code,
      name: d.name,
      isActive: d.isActive ?? true,
    });
  }
  return map;
}

async function loadFacebookPages(): Promise<Map<string, FacebookPageRef>> {
  const docs = await FacebookPage.find({})
    .select("_id code name isActive")
    .lean()
    .exec();

  const map = new Map<string, FacebookPageRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
    isActive?: boolean;
  }>) {
    if (!d.code) continue;
    map.set(d.code.toUpperCase(), {
      id: d._id.toString(),
      code: d.code,
      name: d.name,
      isActive: d.isActive ?? true,
    });
  }
  return map;
}

async function loadCustomers(): Promise<Map<string, CustomerRef>> {
  // Indexed by phone (the only stable identifier across re-imports).
  const docs = await Customer.find({})
    .select("_id code name phone isActive")
    .lean()
    .exec();

  const map = new Map<string, CustomerRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    code: string;
    name: string;
    phone: string;
    isActive?: boolean;
  }>) {
    if (!d.phone) continue;
    map.set(d.phone.trim(), {
      id: d._id.toString(),
      code: d.code,
      name: d.name,
      phone: d.phone,
      isActive: d.isActive ?? true,
    });
  }
  return map;
}

async function loadEmployees(): Promise<Map<string, EmployeeRef>> {
  const docs = await Employee.find({})
    .select("_id employeeCode username fullName isActive")
    .lean()
    .exec();

  const map = new Map<string, EmployeeRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    employeeCode: string;
    username: string;
    fullName: string;
    isActive?: boolean;
  }>) {
    if (!d.employeeCode) continue;
    map.set(d.employeeCode.toUpperCase(), {
      id: d._id.toString(),
      employeeCode: d.employeeCode,
      username: d.username,
      fullName: d.fullName,
      isActive: d.isActive ?? true,
    });
  }
  return map;
}

/**
 * Phase 3.4 - Customer.facebookLink map.
 *
 * NOTE: The current Customer model has no `facebookLink` field, so this
 * loader returns an empty map. Once Customer grows that field, the
 * `.select(...)` and Map key below become the canonical source.
 */
async function loadCustomersByFacebookLink(): Promise<Map<string, CustomerRef>> {
  return new Map();
}

/**
 * Phase 3.4 - Lead by phone.
 * Used as Level-1 fallback when phone doesn't match any Customer.
 */
async function loadLeadsByPhone(): Promise<Map<string, LeadRef>> {
  const docs = await Lead.find({ isActive: true, phone: { $exists: true, $ne: "" } })
    .select("_id leadCode customerId customerName phone facebookLink status createdAt")
    .lean()
    .exec();

  const map = new Map<string, LeadRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    leadCode: string;
    customerId?: { toString: () => string };
    customerName: string;
    phone?: string;
    facebookLink?: string;
    status: string;
    createdAt?: Date;
  }>) {
    if (!d.phone) continue;
    map.set(d.phone.trim(), {
      id: d._id.toString(),
      leadCode: d.leadCode,
      customerId: d.customerId ? d.customerId.toString() : undefined,
      customerName: d.customerName,
      phone: d.phone,
      facebookLink: d.facebookLink,
      status: d.status,
      createdAt: d.createdAt,
    });
  }
  return map;
}

/**
 * Phase 3.4 - Lead by Facebook link.
 * Used as Level-2 detection when Facebook link doesn't match any Customer.
 */
async function loadLeadsByFacebookLink(): Promise<Map<string, LeadRef>> {
  const docs = await Lead.find({
    isActive: true,
    facebookLink: { $exists: true, $ne: "" },
  })
    .select("_id leadCode customerId customerName phone facebookLink status createdAt")
    .lean()
    .exec();

  const map = new Map<string, LeadRef>();
  for (const d of docs as Array<{
    _id: { toString: () => string };
    leadCode: string;
    customerId?: { toString: () => string };
    customerName: string;
    phone?: string;
    facebookLink?: string;
    status: string;
    createdAt?: Date;
  }>) {
    if (!d.facebookLink) continue;
    map.set(d.facebookLink.trim(), {
      id: d._id.toString(),
      leadCode: d.leadCode,
      customerId: d.customerId ? d.customerId.toString() : undefined,
      customerName: d.customerName,
      phone: d.phone,
      facebookLink: d.facebookLink,
      status: d.status,
      createdAt: d.createdAt,
    });
  }
  return map;
}

// ==================================================
// Public API
// ==================================================

/**
 * Build a fresh LeadImportContext by issuing ONE batch query per domain.
 *
 * Concurrency-safe (deduplicates parallel calls).
 * Result is cached for `CACHE_TTL_MS`.
 */
export async function loadLeadImportContext(
  options: { force?: boolean } = {}
): Promise<LeadImportContext> {
  const { force = false } = options;

  if (!force && isCacheFresh(cachedContext)) {
    return cachedContext;
  }

  if (cacheInflight) {
    return cacheInflight;
  }

  cacheInflight = (async () => {
    const [
      products,
      combos,
      facebookPages,
      customers,
      employees,
      customersByFacebookLink,
      leadsByPhone,
      leadsByFacebookLink,
    ] = await Promise.all([
      loadProducts(),
      loadCombos(),
      loadFacebookPages(),
      loadCustomers(),
      loadEmployees(),
      loadCustomersByFacebookLink(),
      loadLeadsByPhone(),
      loadLeadsByFacebookLink(),
    ]);

    const ctx: LeadImportContext = {
      productsByCode: products,
      combosByCode: combos,
      facebookPagesByCode: facebookPages,
      customersByPhone: customers,
      employeesByCode: employees,
      customersByFacebookLink,
      leadsByPhone,
      leadsByFacebookLink,
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

/**
 * Manually clear the in-memory cache (e.g. after creating a new
 * Product so the next import sees it).
 */
export function clearLeadImportContextCache(): void {
  cachedContext = null;
}

/**
 * Build an EMPTY context (used when running in environments without
 * DB access — tests, dry-runs, SSR with no Mongo connection).
 */
export function emptyLeadImportContext(): LeadImportContext {
  return {
    productsByCode: new Map(),
    combosByCode: new Map(),
    facebookPagesByCode: new Map(),
    customersByPhone: new Map(),
    employeesByCode: new Map(),
    customersByFacebookLink: new Map(),
    leadsByPhone: new Map(),
    leadsByFacebookLink: new Map(),
    loadedAt: Date.now(),
  };
}