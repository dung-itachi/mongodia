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
import Employee from "@/models/Employee";

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

function recipientMatch(
  employeeId: Types.ObjectId,
  isActiveOverride?: boolean
) {
  // Dùng flag recipientMode thay cho $size: 0 để có thể dùng index.
  // Đối với broadcast notifications, recipientMode = "broadcast" (default trên schema).
  const base: Record<string, unknown> = {
    $or: [
      { recipients: employeeId },
      { recipientMode: "broadcast" },
    ],
  };
  if (isActiveOverride !== undefined) {
    base.isActive = isActiveOverride;
  }
  return base;
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
    category: string;
    priority: string;
    link?: string | null;
    senderId?: { _id: Types.ObjectId; employeeCode: string; fullName: string } | null;
    createdAt: Date;
  },
  readMap: Map<string, { readAt: Date }>
): NotificationItem {
  const read = readMap.get(doc._id.toString());
  const sender = doc.senderId ?? null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message,
    type: inferType(doc.createdAt),
    category: doc.category,
    priority: doc.priority,
    link: (doc.link as string | null | undefined) ?? null,
    senderId: sender?._id?.toString() ?? "",
    senderName: sender?.fullName ?? sender?.employeeCode ?? "Hệ thống",
    createdAt: doc.createdAt.toISOString(),
    read: Boolean(read),
    readAt: read ? read.readAt.toISOString() : null,
  };
}

export async function listForUser(
  employeeId: string,
  options: { cursor?: string | null; limit?: number; onlyUnread?: boolean; isActive?: boolean } = {}
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

  const filter: Record<string, unknown> = recipientMatch(userObjectId, options.isActive);

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
      if (options.isActive !== undefined) {
        filter.isActive = options.isActive;
      }
    }
  }

  const docs = await Notification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + (options.onlyUnread ? 1 : 0))
    .select("_id title message category priority link senderId createdAt")
    .populate("senderId", "_id employeeCode fullName")
    .lean();

  // Load read state song song (sau khi có page ids).
  // Khi onlyUnread=true: ta load limit+1 row, loại bỏ read, slice limit.
  const pageIds = docs.map((d) => d._id);
  const readMap = await loadReadMap(userObjectId, pageIds);

  const filtered = options.onlyUnread
    ? docs.filter((d) => !readMap.has(d._id.toString()))
    : docs;

  const hasMore = options.onlyUnread
    ? filtered.length > limit
    : docs.length > limit;
  const page = filtered.slice(0, limit);

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

export async function unreadCount(employeeId: string, isActive?: boolean): Promise<number> {
  await connectDB();
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new NotificationServiceError("employeeId không hợp lệ", 400);
  }
  const userObjectId = new Types.ObjectId(employeeId);

  // Dùng aggregation + $lookup thay cho load-all-read-IDs + $nin.
  // Giảm từ 2 round-trips + O(N) in-memory xuống 1 pipeline + IXSCAN trên NotificationRead index.
  const match: Record<string, unknown> = recipientMatch(userObjectId, isActive);
  if (isActive === undefined) match.isActive = { $ne: false };

  const result = await Notification.aggregate<{ count: number }>([
    { $match: match },
    {
      $lookup: {
        from: "notificationreads",
        let: { nid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$notificationId", "$$nid"] },
                  { $eq: ["$employeeId", userObjectId] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "read",
      },
    },
    { $match: { read: { $size: 0 } } },
    { $count: "count" },
  ]);

  return result[0]?.count ?? 0;
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
  isActive?: boolean;
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
  if (typeof options.isActive === "boolean") {
    filter.isActive = options.isActive;
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
      .populate("senderId", "_id employeeCode fullName")
      .lean(),
    Notification.countDocuments(filter),
  ]);

  const notificationIds = docs.map((d) => d._id);

  // Build a map: notificationId → read count via NotificationRead
  const readCountMap = new Map<string, number>();
  if (notificationIds.length > 0) {
    const readCounts = await NotificationRead.aggregate([
      { $match: { notificationId: { $in: notificationIds } } },
      { $group: { _id: "$notificationId", count: { $sum: 1 } } },
    ]);
    for (const rc of readCounts) {
      readCountMap.set(rc._id.toString(), rc.count);
    }
  }

  const items = docs.map((d) => {
    const sender = d.senderId as unknown as { _id: { toString: () => string }; employeeCode: string; fullName: string } | null;
    return ({
      id: d._id.toString(),
      title: d.title,
      message: d.message,
      type: d.type,
      category: d.category,
      priority: d.priority,
      isPinned: Boolean(d.isPinned),
      isActive: Boolean(d.isActive),
      link: (d.link as string | null | undefined) ?? null,
      senderId: sender?._id?.toString() ?? "",
      senderName: sender?.fullName ?? sender?.employeeCode ?? "Hệ thống",
      recipientsCount: Array.isArray(d.recipients) ? d.recipients.length : 0,
      readCount: readCountMap.get(d._id.toString()) ?? 0,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    });
  });

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
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
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

  // Determine recipient mode and resolve recipients
  const isBroadcast = input.broadcast || (
    !input.recipientIds?.length &&
    !input.teamIds?.length &&
    !input.leaderIds?.length &&
    !input.roleFilters?.length
  );

  const recipientMode: "broadcast" | "individual" | "team" | "leader" | "role" =
    isBroadcast
      ? "broadcast"
      : input.teamIds?.length
        ? "team"
        : input.leaderIds?.length
          ? "leader"
          : input.roleFilters?.length
            ? "role"
            : "individual";

  // Validate and convert IDs to ObjectIds
  const recipientIds = isBroadcast
    ? []
    : (input.recipientIds ?? []).map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new NotificationServiceError(`recipientId không hợp lệ: ${id}`, 400);
        }
        return new Types.ObjectId(id);
      });

  const teamIds = input.teamIds?.map((id) => {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotificationServiceError(`teamId không hợp lệ: ${id}`, 400);
    }
    return new Types.ObjectId(id);
  }) ?? [];

  const leaderIds = input.leaderIds?.map((id) => {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotificationServiceError(`leaderId không hợp lệ: ${id}`, 400);
    }
    return new Types.ObjectId(id);
  }) ?? [];

  // For team/leader/role modes, resolve actual recipients
  let resolvedRecipients: Types.ObjectId[] = [...recipientIds];
  if (recipientMode === "team" && teamIds.length > 0) {
    const teamMembers = await Employee.find({
      isActive: true,
      teamId: { $in: teamIds },
    })
      .select("_id")
      .lean();
    const teamMemberIds = teamMembers.map((e) => e._id);
    resolvedRecipients = [...new Set([...resolvedRecipients, ...teamMemberIds])];
  }

  if (recipientMode === "leader" && leaderIds.length > 0) {
    // Get leader + all employees under each leader
    for (const leaderId of leaderIds) {
      resolvedRecipients.push(leaderId);
      const directReports = await Employee.find({
        isActive: true,
        leaderId: leaderId,
      })
        .select("_id")
        .lean();
      const reportIds = directReports.map((e) => e._id);

      // Recursively get nested reports
      const allReportIds = new Set<string>(reportIds.map((id) => id.toString()));
      const toProcess = [...reportIds.map((id) => id.toString())];

      while (toProcess.length > 0) {
        const currentId = toProcess.pop()!;
        const nestedReports = await Employee.find({
          isActive: true,
          leaderId: currentId,
        })
          .select("_id")
          .lean();

        for (const nr of nestedReports) {
          const nrStr = nr._id.toString();
          if (!allReportIds.has(nrStr)) {
            allReportIds.add(nrStr);
            toProcess.push(nrStr);
          }
        }
      }

      allReportIds.forEach((id) => {
        resolvedRecipients.push(new Types.ObjectId(id));
      });
    }
    resolvedRecipients = [...new Set(resolvedRecipients)];
  }

  if (recipientMode === "role" && input.roleFilters?.length) {
    const roleEmployees = await Employee.find({
      isActive: true,
      "roleId.code": { $in: input.roleFilters },
    })
      .select("_id")
      .lean();
    const roleEmployeeIds = roleEmployees.map((e) => e._id);
    resolvedRecipients = [...new Set([...resolvedRecipients, ...roleEmployeeIds])];
  }

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
    recipients: resolvedRecipients,
    readBy: [],
    recipientMode,
    teamIds: recipientMode === "team" ? teamIds : [],
    leaderIds: recipientMode === "leader" ? leaderIds : [],
    roleFilters: recipientMode === "role" ? input.roleFilters : [],
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
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
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

  if (input.broadcast !== undefined || input.recipientIds !== undefined ||
      input.teamIds !== undefined || input.leaderIds !== undefined ||
      input.roleFilters !== undefined) {

    const isBroadcast = input.broadcast || (
      !input.recipientIds?.length &&
      !input.teamIds?.length &&
      !input.leaderIds?.length &&
      !input.roleFilters?.length
    );

    const recipientMode: "broadcast" | "individual" | "team" | "leader" | "role" =
      isBroadcast
        ? "broadcast"
        : input.teamIds?.length
          ? "team"
          : input.leaderIds?.length
            ? "leader"
            : input.roleFilters?.length
              ? "role"
              : "individual";

    update.recipientMode = recipientMode;

    if (isBroadcast) {
      update.recipients = [];
      update.teamIds = [];
      update.leaderIds = [];
      update.roleFilters = [];
    } else {
      // Convert and validate IDs
      const recipientIds = (input.recipientIds ?? []).map((rid) => {
        if (!Types.ObjectId.isValid(rid)) {
          throw new NotificationServiceError(
            `recipientId không hợp lệ: ${rid}`,
            400
          );
        }
        return new Types.ObjectId(rid);
      });

      const teamIds = (input.teamIds ?? []).map((tid) => {
        if (!Types.ObjectId.isValid(tid)) {
          throw new NotificationServiceError(`teamId không hợp lệ: ${tid}`, 400);
        }
        return new Types.ObjectId(tid);
      });

      const leaderIds = (input.leaderIds ?? []).map((lid) => {
        if (!Types.ObjectId.isValid(lid)) {
          throw new NotificationServiceError(`leaderId không hợp lệ: ${lid}`, 400);
        }
        return new Types.ObjectId(lid);
      });

      // Resolve recipients based on mode
      let resolvedRecipients = [...recipientIds];

      if (recipientMode === "team" && teamIds.length > 0) {
        const teamMembers = await Employee.find({
          isActive: true,
          teamId: { $in: teamIds },
        })
          .select("_id")
          .lean();
        const teamMemberIds = teamMembers.map((e) => e._id);
        resolvedRecipients = [...new Set([...resolvedRecipients, ...teamMemberIds])];
      }

      if (recipientMode === "leader" && leaderIds.length > 0) {
        for (const leaderId of leaderIds) {
          resolvedRecipients.push(leaderId);
          const directReports = await Employee.find({
            isActive: true,
            leaderId: leaderId,
          })
            .select("_id")
            .lean();

          const allReportIds = new Set<string>();
          allReportIds.add(leaderId.toString());
          directReports.forEach((e) => allReportIds.add(e._id.toString()));

          // Recursive for nested reports
          const toProcess = directReports.map((e) => e._id.toString());
          while (toProcess.length > 0) {
            const currentId = toProcess.pop()!;
            const nestedReports = await Employee.find({
              isActive: true,
              leaderId: currentId,
            })
              .select("_id")
              .lean();

            for (const nr of nestedReports) {
              const nrStr = nr._id.toString();
              if (!allReportIds.has(nrStr)) {
                allReportIds.add(nrStr);
                toProcess.push(nrStr);
              }
            }
          }

          allReportIds.forEach((sid) => {
            resolvedRecipients.push(new Types.ObjectId(sid));
          });
        }
        resolvedRecipients = [...new Set(resolvedRecipients)];
      }

      if (recipientMode === "role" && input.roleFilters?.length) {
        const roleEmployees = await Employee.find({
          isActive: true,
          "roleId.code": { $in: input.roleFilters },
        })
          .select("_id")
          .lean();
        const roleEmployeeIds = roleEmployees.map((e) => e._id);
        resolvedRecipients = [...new Set([...resolvedRecipients, ...roleEmployeeIds])];
      }

      update.recipients = resolvedRecipients;
      update.teamIds = recipientMode === "team" ? teamIds : [];
      update.leaderIds = recipientMode === "leader" ? leaderIds : [];
      update.roleFilters = recipientMode === "role" ? input.roleFilters : [];
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
