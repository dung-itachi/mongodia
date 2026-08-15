/**
 * useColumnMapping — Sprint 8.x
 *
 * Lưu/đọc mapping cột dán vào localStorage theo user_id.
 * Mỗi user có 2 mapping: comment + landing.
 *
 * Storage key: `mongodia:column-mapping:{userId}`
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLUMN_FIELDS,
  getDefaultLayout,
  normalizeLayout,
  type ColumnFieldKey,
} from "./columnLayouts";

export type InputMode = "comment" | "ladi";

export type ColumnMappings = Record<InputMode, ColumnFieldKey[]>;

const STORAGE_PREFIX = "mongodia:column-mapping:";

function readStorage(userId: string | null): ColumnMappings {
  if (typeof window === "undefined") {
    return {
      comment: getDefaultLayout("comment"),
      ladi: getDefaultLayout("ladi"),
    };
  }
  const key = userId ? `${STORAGE_PREFIX}${userId}` : STORAGE_PREFIX + "anon";
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {
        comment: getDefaultLayout("comment"),
        ladi: getDefaultLayout("ladi"),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      comment: normalizeLayout(parsed?.comment, "comment"),
      ladi: normalizeLayout(parsed?.ladi, "ladi"),
    };
  } catch {
    return {
      comment: getDefaultLayout("comment"),
      ladi: getDefaultLayout("ladi"),
    };
  }
}

function writeStorage(userId: string | null, mappings: ColumnMappings) {
  if (typeof window === "undefined") return;
  const key = userId ? `${STORAGE_PREFIX}${userId}` : STORAGE_PREFIX + "anon";
  try {
    window.localStorage.setItem(key, JSON.stringify(mappings));
  } catch {
    // ignore quota errors
  }
}

function readUserIdFromAuth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const emp = parsed?.state?.user ?? parsed?.state?.employee;
    return (
      emp?._id ??
      emp?.id ??
      emp?.employeeId ??
      parsed?.state?.userId ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Hook đọc/ghi mapping cột theo user_id.
 *
 * @param userId - ID user hiện tại (lấy từ session/employee).
 *   Nếu null → thử đọc từ auth-storage, fallback "anon".
 */
export function useColumnMapping(userId?: string | null) {
  const [mappings, setMappings] = useState<ColumnMappings>(() => readStorage(userId ?? readUserIdFromAuth()));

  // Khi userId thay đổi → đọc lại mapping tương ứng
  useEffect(() => {
    setMappings(readStorage(userId));
  }, [userId]);

  const setModeLayout = useCallback(
    (mode: InputMode, layout: ColumnFieldKey[]) => {
      const normalized = normalizeLayout(layout, mode);
      setMappings((prev) => {
        const next = { ...prev, [mode]: normalized };
        writeStorage(userId, next);
        return next;
      });
    },
    [userId]
  );

  const resetMode = useCallback(
    (mode: InputMode) => {
      setModeLayout(mode, getDefaultLayout(mode));
    },
    [setModeLayout]
  );

  return {
    mappings,
    setModeLayout,
    resetMode,
    /** Tất cả field specs (để render dropdown). */
    fields: COLUMN_FIELDS,
    /** Layout hiện tại của mode đang chọn. */
    getLayout: (mode: InputMode) => mappings[mode],
  };
}