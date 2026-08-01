/**
 * ==================================================
 * CUSTOMER SERVICE
 * ==================================================
 *
 * Single source of truth for Customer mutations.
 * Every other module that needs to create a Customer MUST go
 * through `createCustomer()` so the CustomerCode counter is
 * incremented exactly once, atomically.
 *
 * Design rules:
 *   - CustomerService owns the CustomerCounter ("CUSTOMER") entirely.
 *     Callers MUST NOT touch `Counter` for "CUSTOMER" directly.
 *   - The function accepts an optional Mongoose session so it can
 *     participate in a larger transaction (used by Lead Import).
 * ==================================================
 */

import mongoose, { ClientSession, Types } from "mongoose";

import Counter from "@/models/Counter";
import Customer, { ICustomer } from "@/models/Customer";

/**
 * Input contract for creating a Customer. Any field that is the
 * caller's responsibility (defaults, references) must be supplied.
 */
export interface CreateCustomerInput {
  name: string;
  phone: string;
  areaId: Types.ObjectId | string;
  teamId: Types.ObjectId | string;
  marketingEmployeeId: Types.ObjectId | string;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  birthday?: Date | null;
  address?: string;
  note?: string;
}

/** Options for `createCustomer`. */
export interface CreateCustomerOptions {
  /**
   * Optional Mongoose session so the create participates in a
   * larger transaction (e.g. Lead Import batch).
   * When omitted, the operation runs without an explicit transaction.
   */
  session?: ClientSession;
  /**
   * Optional pre-generated Customer code. When omitted, the service
   * allocates the next value from the "CUSTOMER" counter.
   * Useful for tests; production code should always omit this.
   */
  codeOverride?: string;
}

/**
 * Atomically allocate the next Customer code (KH000001, KH000002, ...).
 *
 * Internal helper - callers should not invoke this directly. The Counter
 * document key is reserved to this service.
 */
async function nextCustomerCode(session?: ClientSession): Promise<string> {
  const COUNTER_KEY = "CUSTOMER";
  const updated = await Counter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).session(session ?? null).exec();
  const value = updated?.value ?? 1;
  return `KH${String(value).padStart(6, "0")}`;
}

/**
 * Create a Customer document.
 *
 * Responsibilities:
 *   - Allocate CustomerCode via Counter "CUSTOMER" (atomic).
 *   - Persist Customer inside the provided session when given.
 *   - Normalize optional fields (gender default "OTHER", empty strings).
 *   - Surface low-level errors without swallowing them so the caller's
 *     transaction rollback works as expected.
 */
export async function createCustomer(
  input: CreateCustomerInput,
  options: CreateCustomerOptions = {}
): Promise<ICustomer & { _id: Types.ObjectId }> {
  if (!input?.name || !input.phone) {
    throw new Error("CustomerService.createCustomer: name và phone là bắt buộc");
  }
  if (!input.areaId || !input.teamId || !input.marketingEmployeeId) {
    throw new Error(
      "CustomerService.createCustomer: areaId, teamId, marketingEmployeeId là bắt buộc"
    );
  }

  const code =
    options.codeOverride ?? (await nextCustomerCode(options.session));

  const docInput: Partial<ICustomer> & {
    code: string;
    name: string;
    phone: string;
    areaId: Types.ObjectId;
    teamId: Types.ObjectId;
    marketingEmployeeId: Types.ObjectId;
    isActive: boolean;
  } = {
    code,
    name: input.name.trim(),
    phone: input.phone.trim(),
    areaId: new Types.ObjectId(input.areaId.toString()),
    teamId: new Types.ObjectId(input.teamId.toString()),
    marketingEmployeeId: new Types.ObjectId(
      input.marketingEmployeeId.toString()
    ),
    gender: input.gender ?? "OTHER",
    birthday: input.birthday ?? null,
    email: input.email ?? "",
    address: input.address ?? "",
    note: input.note ?? "",
    isActive: true,
  };

  const [doc] = await Customer.create([docInput], {
    session: options.session ?? null,
  });

  return doc as ICustomer & { _id: Types.ObjectId };
}

/**
 * Convenience helper to silence mongoose import warning when bundlers
 * strip unused imports. Not exported otherwise.
 */
export const _internals = { mongoose };
