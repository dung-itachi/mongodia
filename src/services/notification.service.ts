/**
 * Notification service.
 *
 * Pure business logic for the per-user notification feed. Routes delegate
 * to this layer so the same logic can be reused from background jobs,
 * tests, and the SSE stream.
 *
 * Recipient filter (broadcast semantics):
 *   A Notification is visible to employee E when:
 *     - `Notification.recipients` is empty (broadcast), OR
 *     - `Notification.recipients` contains E's id.
 *
 *   This mirrors the existing dashboard activities query in
 *   `src/app/api/dashboard/activities/route.ts` so behaviour stays
 *   consistent with what users already saw.
 *
 * Cursor pagination:
 *   The cursor is the `createdAt` ISO string of the last item on the
 *   previous page. We use `(createdAt, _id)` for tie-breaking — multiple
 *   notifications generated in the same millisecond (e.g. dashboards)
 *   would otherwise skip/duplicate rows.
 */

import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import NotificationRead from "@/models/NotificationRead";

import type {
  NotificationItem,
  NotificationPage,
  NotificationItemType,
} from "@/types/notification";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class NotificationServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "NotificationServiceError";
    this.status = status;
  }
}

function decodeCursor(cursor: string | null | undefined): {
  createdAt: Date | null;
  id: Types.ObjectId | null;
} {
  if (!cursor) return { createdAt: null, id: null };
  // Format: "<isoDate>|<id>"
  const [iso, id] = cursor.split("|");
  if (!iso || !id) {
    throw new NotificationServiceError("Cursor không hợp lệ", 400);
  }
  if (!Types.ObjectId.isValid(id)) {
    throw new NotificationServiceError("Cursor không hợp lệ", 400);
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new NotificationServiceError("Cursor không hợp lệ", 400);
  }
  return { createdAt: date, id: new Types.ObjectId(id) };
}

function encodeCursor(date: Date, id: Types.ObjectId): string {
  return `${date.toISOString()}|${id.toString()}`;
}

function recipientMatch(employeeId: Types.ObjectId) {
  return {
    isActive: true,
    $or: [
      { recipients: employeeId },
      { recipients: { $size: 0 } },
    ],
  };
}

function inferType(createdAt: Date): NotificationItemType {
  const ageMs = Date.now() - createdAt.getTime();
  if (ageMs < 60 * 60 * 1000) return "info";
  if (ageMs < 24 * 60 * 60 * 1000) return "success";
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "warning";
  return "info";
}

function toItem(
  doc: {
    _id: Types.ObjectId;
    title: string;
    message: string;
    createdAt: Date;
  },
  readMap: Map<string, { readAt: Date }>
): NotificationItem {
  const read = readMap.get(doc._id.toString());
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message,
    type: inferType(doc.createdAt),
    link: null,
    createdAt: doc.createdAt.toISOString(),
    read: Boolean(read),
    readAt: read ? read.readAt.toISOString() : null,
  };
}

export async function listForUser(
  employeeId: string,
  options: { cursor?: string | null; limit?: number; onlyUnread?: boolean } = {}
): Promise<NotificationPage> {
  await connectDB();
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new NotificationServiceError("employeeId không hợp lệ", 400);
  }
  const userObjectId = new Types.ObjectId(employeeId);
  const limit = Math.min(
    Math.max(1, options.limit ?? DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const filter: Record<string, unknown> = recipientMatch(userObjectId);

  if (options.onlyUnread) {
    // Filter out anything already read by this user.
    const readDocs = await NotificationRead.find({
      employeeId: userObjectId,
    })
      .select("notificationId")
      .lean();
    const readIds = readDocs.map((r) => r.notificationId);
    if (readIds.length === 0) {
      // No reads yet — nothing to exclude.
    } else {
      filter._id = { $nin: readIds };
    }
  }

  if (options.cursor) {
    const { createdAt, id } = decodeCursor(options.cursor);
    if (createdAt && id) {
      // (createdAt, _id) < (cursorCreatedAt, cursorId) lexically
      filter.$or = [
        { createdAt: { $lt: createdAt } },
        {
          createdAt,
          _id: { $lt: id },
        },
      ];
      filter.$and = [{ isActive: true }];
    }
  }

  const docs = await Notification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .select("_id title message createdAt")
    .lean();

  const hasMore = docs.length > limit;
  const page = docs.slice(0, limit);

  const readMap = await loadReadMap(
    userObjectId,
    page.map((d) => d._id)
  );

  const items = page.map((d) => toItem(d, readMap));

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(
          new Date(items[items.length - 1].createdAt),
          new Types.ObjectId(items[items.length - 1].id)
        )
      : null;

  return { items, nextCursor };
}

export async function unreadCount(employeeId: string): Promise<number> {
  await connectDB();
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new NotificationServiceError("employeeId không hợp lệ", 400);
  }
  const userObjectId = new Types.ObjectId(employeeId);

  // Use aggregation: count of Notification matching recipient filter whose
  // _id is NOT in the user's NotificationRead set.
  const readDocs = await NotificationRead.find({ employeeId: userObjectId })
    .select("notificationId")
    .lean();
  const readIds = readDocs.map((r) => r.notificationId);

  const match: Record<string, unknown> = recipientMatch(userObjectId);
  if (readIds.length > 0) {
    match._id = { $nin: readIds };
  }

  return Notification.countDocuments(match);
}

export async function markRead(
  employeeId: string,
  notificationId: string
): Promise<{ ok: true; alreadyRead: boolean }> {
  await connectDB();
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new NotificationServiceError("employeeId không hợp lệ", 400);
  }
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new NotificationServiceError("notificationId không hợp lệ", 400);
  }

  const exists = await Notification.exists({
    _id: new Types.ObjectId(notificationId),
    isActive: true,
  });
  if (!exists) {
    throw new NotificationServiceError("Notification không tồn tại", 404);
  }

  const result = await NotificationRead.findOneAndUpdate(
    {
      notificationId: new Types.ObjectId(notificationId),
      employeeId: new Types.ObjectId(employeeId),
    },
    {
      $setOnInsert: {
        notificationId: new Types.ObjectId(notificationId),
        employeeId: new Types.ObjectId(employeeId),
        readAt: new Date(),
      },
    },
    { upsert: true, new: false, includeResultMetadata: true }
  );

  // Mongoose 9 returns `{ value, lastErrorObject, ok }` from `findOneAndUpdate`
  // with `includeResultMetadata`.  We use upsert + `new: false` so the
  // doc returned is the *previous* one — null means we just inserted.
  const alreadyRead = Boolean(result?.value);
  return { ok: true, alreadyRead };
}

export async function markAllRead(employeeId: string): Promise<{ updated: number }> {
  await connectDB();
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new NotificationServiceError("employeeId không hợp lệ", 400);
  }
  const userObjectId = new Types.ObjectId(employeeId);

  const candidates = await Notification.find(recipientMatch(userObjectId))
    .select("_id")
    .lean();

  if (candidates.length === 0) return { updated: 0 };

  const ops = candidates.map((doc) => ({
    updateOne: {
      filter: {
        notificationId: doc._id,
        employeeId: userObjectId,
      },
      update: {
        $setOnInsert: {
          notificationId: doc._id,
          employeeId: userObjectId,
          readAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const res = await NotificationRead.bulkWrite(ops, { ordered: false });
  return { updated: res.upsertedCount ?? 0 };
}

async function loadReadMap(
  employeeId: Types.ObjectId,
  notificationIds: Types.ObjectId[]
): Promise<Map<string, { readAt: Date }>> {
  const map = new Map<string, { readAt: Date }>();
  if (notificationIds.length === 0) return map;
  const docs = await NotificationRead.find({
    employeeId,
    notificationId: { $in: notificationIds },
  })
    .select("notificationId readAt")
    .lean();
  for (const doc of docs) {
    map.set(doc.notificationId.toString(), { readAt: doc.readAt });
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/* Admin CRUD — used by /settings/notifications                                */
/* -------------------------------------------------------------------------- */

export interface AdminListOptions {
  search?: string;
  category?: string;
  type?: string;
  isPinned?: boolean;
  page?: number;
  pageSize?: number;
}

const ADMIN_PAGE_SIZE_MAX = 100;

export async function listAllForAdmin(
  options: AdminListOptions = {}
): Promise<{
  items: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    category: string;
    priority: string;
    isPinned: boolean;
    isActive: boolean;
    link: string | null;
    recipientsCount: number;
    readCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}> {
  await connectDB();
  const pageSize = Math.min(
    Math.max(1, options.pageSize ?? 20),
    ADMIN_PAGE_SIZE_MAX
  );
  const page = Math.max(1, options.page ?? 1);

  const filter: Record<string, unknown> = {};
  if (options.category) filter.category = options.category;
  if (options.type) filter.type = options.type;
  if (typeof options.isPinned === "boolean") {
    filter.isPinned = options.isPinned;
  }
  if (options.search) {
    const re = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [{ title: re }, { message: re }];
  }

  const [docs, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  const items = docs.map((d) => ({
    id: d._id.toString(),
    title: d.title,
    message: d.message,
    type: d.type,
    category: d.category,
    priority: d.priority,
    isPinned: Boolean(d.isPinned),
    isActive: Boolean(d.isActive),
    link: (d.link as string | null | undefined) ?? null,
    recipientsCount: Array.isArray(d.recipients) ? d.recipients.length : 0,
    readCount: Array.isArray(d.readBy) ? d.readBy.length : 0,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return { items, total };
}

export async function getByIdForAdmin(id: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) {
    throw new NotificationServiceError("notificationId không hợp lệ", 400);
  }
  const doc = await Notification.findById(id).lean();
  if (!doc) {
    throw new NotificationServiceError("Notification không tồn tại", 404);
  }
  return doc;
}

export interface CreateInput {
  title: string;
  message: string;
  type?: string;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  link?: string | null;
  recipientIds?: string[];
  broadcast?: boolean;
  senderId: string;
}

export async function createOne(input: CreateInput): Promise<{ id: string }> {
  await connectDB();
  if (!input.title || input.title.trim().length === 0) {
    throw new NotificationServiceError("Tiêu đề không được để trống", 400);
  }
  if (!input.message || input.message.trim().length === 0) {
    throw new NotificationServiceError("Nội dung không được để trống", 400);
  }
  if (!Types.ObjectId.isValid(input.senderId)) {
    throw new NotificationServiceError("senderId không hợp lệ", 400);
  }

  const recipients = input.broadcast
    ? []
    : (input.recipientIds ?? []).map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new NotificationServiceError(`recipientId không hợp lệ: ${id}`, 400);
        }
        return new Types.ObjectId(id);
      });

  const created = await Notification.create({
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type ?? "info",
    category: input.category ?? "general",
    priority: input.priority ?? "normal",
    isPinned: Boolean(input.isPinned),
    isActive: true,
    link: input.link ?? null,
    senderId: new Types.ObjectId(input.senderId),
    recipients,
    readBy: [],
  });

  return { id: created._id.toString() };
}

export interface UpdateInput {
  title?: string;
  message?: string;
  type?: string;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  isActive?: boolean;
  link?: string | null;
  recipientIds?: string[];
  broadcast?: boolean;
}

export async function updateOne(
  id: string,
  input: UpdateInput
): Promise<{ id: string }> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) {
    throw new NotificationServiceError("notificationId không hợp lệ", 400);
  }

  const update: Record<string, unknown> = {};
  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      throw new NotificationServiceError("Tiêu đề không được để trống", 400);
    }
    update.title = input.title.trim();
  }
  if (input.message !== undefined) {
    if (input.message.trim().length === 0) {
      throw new NotificationServiceError("Nội dung không được để trống", 400);
    }
    update.message = input.message.trim();
  }
  if (input.type !== undefined) update.type = input.type;
  if (input.category !== undefined) update.category = input.category;
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.isPinned !== undefined) update.isPinned = input.isPinned;
  if (input.isActive !== undefined) update.isActive = input.isActive;
  if (input.link !== undefined) update.link = input.link;

  if (input.broadcast !== undefined || input.recipientIds !== undefined) {
    if (input.broadcast) {
      update.recipients = [];
    } else if (input.recipientIds) {
      update.recipients = input.recipientIds.map((rid) => {
        if (!Types.ObjectId.isValid(rid)) {
          throw new NotificationServiceError(
            `recipientId không hợp lệ: ${rid}`,
            400
          );
        }
        return new Types.ObjectId(rid);
      });
    }
  }

  const updated = await Notification.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  );
  if (!updated) {
    throw new NotificationServiceError("Notification không tồn tại", 404);
  }
  return { id: updated._id.toString() };
}

export async function togglePin(
  id: string,
  isPinned: boolean
): Promise<{ id: string; isPinned: boolean }> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) {
    throw new NotificationServiceError("notificationId không hợp lệ", 400);
  }
  const updated = await Notification.findByIdAndUpdate(
    id,
    { $set: { isPinned } },
    { new: true }
  );
  if (!updated) {
    throw new NotificationServiceError("Notification không tồn tại", 404);
  }
  return { id: updated._id.toString(), isPinned: Boolean(updated.isPinned) };
}

export async function softDelete(id: string): Promise<{ id: string }> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) {
    throw new NotificationServiceError("notificationId không hợp lệ", 400);
  }
  const updated = await Notification.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );
  if (!updated) {
    throw new NotificationServiceError("Notification không tồn tại", 404);
  }
  return { id: updated._id.toString() };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
