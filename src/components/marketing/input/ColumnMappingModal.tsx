"use client";

/**
 * ColumnMappingModal — Sprint 8.x
 *
 * Modal cho phép MKT cấu hình thứ tự các cột khi dán dữ liệu TAB-separated
 * vào textarea. Mỗi hàng trong modal là 1 dropdown chọn field ứng với cột đó.
 *
 * - Click nút "+ Thêm cột" → thêm hàng
 * - Click icon 🗑 → xóa hàng
 * - Mỗi hàng có dropdown để chọn field (Tên / SĐT / Địa chỉ / Combo / SP / Ngày / FB Page)
 * - SĐT là bắt buộc — không thể xóa nếu là hàng duy nhất, và luôn có mặt trong normalize.
 * - "Khôi phục mặc định" → reset theo mode (Comment / Landing).
 */

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { Modal, Button, Select, Space, App, Tabs } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  HolderOutlined,
  MessageOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import {
  COLUMN_FIELDS,
  getDefaultLayout,
  type ColumnFieldKey,
  type ColumnFieldSpec,
} from "./columnLayouts";
import type { ColumnMappings, InputMode } from "./useColumnMapping";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./ColumnMappingModal.module.css";

export interface ColumnMappingModalProps {
  open: boolean;
  /**
   * Mode hiện đang được chỉnh (controlled bởi parent).
   * User có thể switch giữa Comment/Landing ngay trong modal qua Tabs.
   */
  activeMode: InputMode;
  onActiveModeChange: (mode: InputMode) => void;
  /**
   * Draft layout cho CẢ 2 mode (đã được init từ parent khi mở modal).
   * Modal sẽ update đúng field ứng với activeMode khi người dùng chỉnh.
   */
  mappings: ColumnMappings;
  onChange: (mode: InputMode, next: ColumnFieldKey[]) => void;
  onClose: () => void;
}

export default function ColumnMappingModal({
  open,
  activeMode,
  onActiveModeChange,
  mappings,
  onChange,
  onClose,
}: ColumnMappingModalProps) {
  const { message } = App.useApp();
  const lang = useLanguageStore((s) => s.language);

  // Layout đang sửa = layout của mode đang active
  const layout = mappings[activeMode];

  // Drag & drop state
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  /** "top" = chèn vào trước row, "bottom" = chèn vào sau row. */
  const [dropPosition, setDropPosition] = useState<"top" | "bottom">("top");

  // FLIP animation refs & bookkeeping
  /**
   * Map idx hiện tại (sau khi reorder xong) → DOM element của row.
   * Sau mỗi lần layout đổi, ta so sánh vị trí cũ → animate translate.
   */
  const rowRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  /**
   * Snapshot vị trí cũ (top) của từng idx TRƯỚC khi layout đổi.
   * Key = idx tại thời điểm snapshot.
   */
  const prevRectsRef = useRef<Map<number, DOMRect>>(new Map());
  /** Tắt FLIP khi đang drag (chỉ chạy khi reorder xong). */
  const isDraggingRef = useRef(false);
  /**
   * Id của row đã bị drag (theo layout cũ) — để track animation đúng phần tử.
   * Vì layout đổi nên idx không cố định, ta dùng field key.
   */
  const draggedKeyRef = useRef<ColumnFieldKey | null>(null);

  // Field specs cho dropdown
  const fieldOptions = useMemo(
    () =>
      COLUMN_FIELDS.map((f) => ({
        value: f.key,
        label: t(f.label, lang),
        disabled: false,
      })),
    [lang]
  );

  // Các field đã dùng → disable option tương ứng trong dropdown (trừ hàng hiện tại)
  const usedKeys = useMemo(() => new Set(layout), [layout]);

  // Đảm bảo luôn có ít nhất 1 hàng trong mode đang active
  useEffect(() => {
    if (open && layout.length === 0) {
      onChange(activeMode, getDefaultLayout(activeMode));
    }
  }, [open, layout.length, activeMode, onChange]);

  const handleAdd = () => {
    // Tìm field chưa dùng để gợi ý
    const unused = COLUMN_FIELDS.find((f) => !usedKeys.has(f.key));
    onChange(activeMode, [...layout, unused?.key ?? "address"]);
  };

  const handleRemove = (idx: number) => {
    if (layout.length <= 1) {
      message.warning(t("Phải có ít nhất 1 cột", lang));
      return;
    }
    const next = layout.filter((_, i) => i !== idx);
    onChange(activeMode, next);
  };

  const handleSelect = (idx: number, value: ColumnFieldKey) => {
    const next = [...layout];
    next[idx] = value;
    onChange(activeMode, next);
  };

  /**
   * FLIP: Sau khi layout reorder, animate các row từ vị trí cũ → vị trí mới.
   *
   * Chạy SAU khi DOM đã render ở vị trí mới (useLayoutEffect).
   *   - First: prevRectsRef (đã chụp trước lúc reorder)
   *   - Last: vị trí hiện tại của rowRefs
   *   - Invert: set transform = (old - new) → row nhìn như chưa dịch
   *   - Play: bỏ transform + transition → animate về vị trí mới
   */
  useLayoutEffect(() => {
    if (isDraggingRef.current) return; // đang kéo → không animate
    const prev = prevRectsRef.current;
    if (prev.size === 0) return; // lần render đầu (mount) → bỏ qua

    let animated = 0;
    rowRefs.current.forEach((el, idx) => {
      if (!el) return;
      const oldRect = prev.get(idx);
      if (!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      // Invert: dịch về vị trí cũ ngay lập tức
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      // Force reflow để browser ghi nhận transform trước khi bật transition
      void el.offsetHeight;

      // Play: bỏ transform → animate về vị trí mới
      el.style.transition = "transform 220ms cubic-bezier(0.2, 0, 0, 1)";
      el.style.transform = "";

      animated++;
      const onEnd = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    });

    if (animated > 0) {
      // Reset snapshot để không animate 2 lần liên tiếp
      prevRectsRef.current = new Map();
    }
  }, [layout]);

  // Cleanup refs khi đóng modal
  useEffect(() => {
    if (!open) {
      rowRefs.current.clear();
      prevRectsRef.current.clear();
      isDraggingRef.current = false;
      draggedKeyRef.current = null;
    }
  }, [open]);

  // Khi switch tab (Comment ↔ Landing), reset drag/FLIP state để tránh
  // animate nhầm hoặc animation chạy 2 lần liên tiếp.
  useEffect(() => {
    rowRefs.current.clear();
    prevRectsRef.current.clear();
    setDraggingIdx(null);
    setDragOverIdx(null);
    setDropPosition("top");
  }, [activeMode]);

  /**
   * Sắp xếp lại layout bằng cách chuyển phần tử từ `from` đến `to`.
   * Trước khi reorder → chụp snapshot vị trí hiện tại của từng row.
   */
  const reorderLayout = (from: number, to: number) => {
    if (from === to) return;
    // Snapshot trước khi đổi
    const snapshot = new Map<number, DOMRect>();
    rowRefs.current.forEach((el, idx) => {
      if (el) snapshot.set(idx, el.getBoundingClientRect());
    });
    prevRectsRef.current = snapshot;

    const next = [...layout];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    draggedKeyRef.current = moved;
    onChange(activeMode, next);
  };

  // Drag & drop handlers (HTML5 native)
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggingIdx(idx);
    isDraggingRef.current = true;
    draggedKeyRef.current = layout[idx] ?? null;
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to start drag
    e.dataTransfer.setData("text/plain", String(idx));
    // Tắt transition trên row đang kéo để tránh giật
    const el = rowRefs.current.get(idx);
    if (el) el.style.transition = "none";
  };

  /**
   * Xác định vị trí drop dựa vào vị trí con trỏ:
   * - Nửa trên của row → chèn vào TRƯỚC row này
   * - Nửa dưới của row → chèn vào SAU row này
   * Nếu đang kéo row X qua row Y:
   *   - drop vào nửa trên Y → row X nằm trước Y
   *   - drop vào nửa dưới Y → row X nằm sau Y
   * Logic reorder phải tính đến việc X đã bị splice ra khỏi mảng.
   */
  const handleDragOver =
    (idx: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position: "top" | "bottom" = e.clientY < midpoint ? "top" : "bottom";

      if (idx !== dragOverIdx || position !== dropPosition) {
        setDragOverIdx(idx);
        setDropPosition(position);
      }
    };

  const handleDragLeave = (idx: number) => (e: React.DragEvent) => {
    // Chỉ clear khi thực sự rời row (không phải vào child element)
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverIdx(null);
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData("text/plain");
    const from = Number(fromStr);
    if (!Number.isNaN(from)) {
      // Tính toán vị trí đích dựa trên dropPosition
      // Khi kéo từ trên xuống dưới: nếu drop vào nửa dưới của row Y → insert sau Y
      // Khi kéo từ dưới lên trên: nếu drop vào nửa trên của row Y → insert trước Y
      let to = idx;
      if (dropPosition === "bottom") to = idx + 1;
      // Sau khi splice(from, 1), chỉ số của các phần tử sau `from` giảm 1.
      if (from < to) to -= 1;
      reorderLayout(from, to);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
    isDraggingRef.current = false;
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
    isDraggingRef.current = false;
  };

  const handleReset = () => {
    onChange(activeMode, getDefaultLayout(activeMode));
    message.success(
      t("Đã khôi phục layout mặc định cho", lang) +
        ` ${activeMode === "comment" ? "Comment" : "Landing"}`,
    );
  };

  // Tính preview: Tên · SĐT · Đ/c · ...
  const previewText = useMemo(() => {
    return layout
      .map((key) => {
        const field = COLUMN_FIELDS.find((f) => f.key === key);
        return field ? t(field.label, lang) : key;
      })
      .join(" · ");
  }, [layout, lang]);

  // Validate phone luôn có mặt
  const hasPhone = layout.includes("phone");

  return (
    <Modal
      title={
        <Tabs
          activeKey={activeMode}
          onChange={(k) => onActiveModeChange(k as InputMode)}
          size="small"
          className={styles.modeTabs}
          items={[
            {
              key: "comment",
              label: (
                <span>
                  <MessageOutlined /> Comment
                </span>
              ),
            },
            {
              key: "ladi",
              label: (
                <span>
                  <GlobalOutlined /> {t("Landing", lang)}
                </span>
              ),
            },
          ]}
        />
      }
      open={open}
      onCancel={onClose}
      width={620}
      destroyOnHidden={false}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={handleReset}>
          {t("Khôi phục mặc định", lang)}
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          {t("Xong", lang)}
        </Button>,
      ]}
    >
      <div className={styles.help}>
        {t("Sắp xếp thứ tự các cột", lang)}{" "}
        <strong>{t("theo đúng thứ tự bạn dán", lang)}</strong> {t("cho tab", lang)}{" "}
        <strong>{activeMode === "comment" ? "Comment" : t("Landing", lang)}</strong>.
        {t("Mỗi hàng tương ứng với 1 cột TAB-separated trong textarea.", lang)}
        <br />
        💡 <strong>{t("Kéo thả", lang)}</strong> {t("icon", lang)}{" "}
        <span className={styles.handleHint}>⋮⋮</span> {t("để đổi thứ tự nhanh.", lang)}
        <br />
        🔄 {t("Có thể chuyển sang tab khác để sửa layout của tab đó.", lang)}
        {!hasPhone && (
          <div className={styles.warning}>
            ⚠ {t("Thiếu cột", lang)} <strong>{t("SĐT", lang)}</strong> —{" "}
            {t("hệ thống sẽ tự thêm khi lưu.", lang)}
          </div>
        )}
      </div>

      <Space orientation="vertical" style={{ width: "100%" }} size="small">
        {layout.map((key, idx) => {
          // Disable các field đã được dùng ở hàng khác
          const opts = fieldOptions.map((o) => ({
            ...o,
            disabled:
              o.value !== "phone" && // phone không bao giờ disable (nếu thiếu vẫn cho chọn)
              usedKeys.has(o.value as ColumnFieldKey) &&
              o.value !== key,
          }));
          const isDragging = draggingIdx === idx;
          const isDropTarget = dragOverIdx === idx && draggingIdx !== null && draggingIdx !== idx;
          const indicatorClass =
            isDropTarget && dropPosition === "top"
              ? styles.dropIndicatorTop
              : isDropTarget && dropPosition === "bottom"
                ? styles.dropIndicatorBottom
                : "";
          return (
            <div
              key={`${key}-${idx}`}
              ref={(el) => {
                rowRefs.current.set(idx, el);
              }}
              className={`${styles.row} ${isDragging ? styles.rowDragging : ""} ${indicatorClass}`}
              draggable={false /* chỉ handle mới draggable */}
              onDragOver={handleDragOver(idx)}
              onDragLeave={handleDragLeave(idx)}
              onDrop={handleDrop(idx)}
            >
              <span
                className={styles.dragHandle}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragEnd={handleDragEnd}
                title={t("Kéo để đổi thứ tự", lang)}
                aria-label={t("Kéo để đổi thứ tự", lang)}
                role="button"
                tabIndex={0}
              >
                <HolderOutlined />
              </span>
              <div className={styles.colIndex}>{t("Cột", lang)} {idx + 1}</div>
              <Select
                value={key}
                onChange={(v) => handleSelect(idx, v as ColumnFieldKey)}
                options={opts}
                style={{ flex: 1 }}
                placeholder={t("Chọn trường", lang)}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(idx)}
                disabled={layout.length <= 1}
                title={t("Xóa cột", lang)}
              />
            </div>
          );
        })}
      </Space>

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        block
        style={{ marginTop: 12 }}
      >
        {t("Thêm cột", lang)}
      </Button>

      <div className={styles.preview}>
        <span className={styles.previewLabel}>{t("Preview thứ tự", lang)}:</span>
        <code className={styles.previewValue}>{previewText}</code>
      </div>

      <div className={styles.example}>
        <div className={styles.exampleLabel}>{t("Ví dụ dán đúng cấu hình trên", lang)}:</div>
        <code className={styles.exampleValue}>
          {layout
            .map((k) => exampleFor(k as ColumnFieldSpec["key"]))
            .join("\t")}
        </code>
      </div>
    </Modal>
  );
}

function exampleFor(key: ColumnFieldSpec["key"]): string {
  switch (key) {
    case "name":
      return "Гантуяа Толя";
    case "phone":
      return "96621013";
    case "address":
      return "Баянчандман";
    case "combo":
      return "✅99,000₮-өөр 4 нь 10 нь үнэгүй";
    case "product":
      return "EYE";
    case "date":
      return "2026-08-15";
    case "facebookPage":
      return "Page A";
    default:
      return "?";
  }
}