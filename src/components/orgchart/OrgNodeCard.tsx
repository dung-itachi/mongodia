/**
 * Single node card in the organization chart.
 *
 * The node is positioned absolutely via inline `left`/`top` produced
 * by the layout engine. It renders the role pill, the employee name,
 * their code, team (if any), and the direct/total report counts.
 *
 * Three controls can be overlaid on the card:
 *   - The collapse/expand toggle (`+` / `−`) at the bottom.
 *   - A "Thêm cấp dưới" button on the right edge (ADMIN-only).
 *   - A "Thêm cùng cấp" button on the left edge (ADMIN-only).
 *
 * The two add buttons are hidden by default and fade in when the card
 * is hovered so they don't clutter the chart at rest.
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OrgNode } from "./types";

type OrgNodeCardProps = {
  node: OrgNode;
  x: number;
  y: number;
  width: number;
  /** Card height in pixels. Not used for inline layout (height is
   *  driven by content + CSS) but kept on the contract so the
   *  chart passes through the `LaidOutNode.height` value and stays
   *  shape-compatible with the connector layer. */
  height: number;
  /** True if this branch is the highlight target (search match). */
  isHighlighted?: boolean;
  /** True if any ancestor matches the search → faint outline. */
  isOnSearchPath?: boolean;
  /** Wholly collapsed (descendants hidden) — show count in the toggle. */
  collapsed?: boolean;
  hasChildren: boolean;
  onToggle: (id: string) => void;
  /** Show the "+" (sibling) and "↓" (child) buttons when true. */
  canCreate?: boolean;
  onAddSibling?: (id: string) => void;
  onAddChild?: (id: string) => void;
};

function rolePillClass(role: string) {
  const safe = (role || "UNKNOWN").toUpperCase();
  return `org-node-role role-${safe}`;
}

/**
 * Tooltip popup rendered via React portal into `document.body` so it
 * escapes `.org-chart`'s `overflow: hidden` scroll container.
 *
 * Position is supplied via the inline CSS variables `--tip-x` and
 * `--tip-y` (px), computed by the caller from the trigger button's
 * `getBoundingClientRect()`. The tooltio is always vertically centred
 * against the trigger's vertical midline.
 *
 * The popup body has `pointer-events: none` so the cursor isn't
 * trapped if the user wants to slide off. Visibility is driven by a
 * `data-visible` attribute toggled by JS based on the trigger's
 * hover/focus state.
 */
type AddTooltipProps = {
  side: "sibling" | "child";
  title: string;
  description: React.ReactNode;
  /** Trigger element; the tip is positioned relative to this rect. */
  target: HTMLElement | null;
  open: boolean;
};

function AddTooltip({ side, title, description, target, open }: AddTooltipProps) {
  if (typeof document === "undefined" || !target) return null;

  const rect = target.getBoundingClientRect();
  const cy = rect.top + rect.height / 2;

  // Sibling tip pops out to the RIGHT of the button (button is on the
  // left edge of the card). Child tip pops out to the LEFT.
  const GAP = 8;
  const cx =
    side === "sibling"
      ? rect.right + GAP
      : rect.left - GAP;

  const node = (
    <span
      className="org-node-add-tip"
      data-side={side}
      data-visible={open ? "true" : "false"}
      role="tooltip"
      style={
        {
          // CSS variables consumed by `.org-node-add-tip`.
          ["--tip-x" as never]: `${cx}px`,
          ["--tip-y" as never]: `${cy}px`,
        } as React.CSSProperties
      }
    >
      <span className="org-node-add-tip-title">{title}</span>
      <span className="org-node-add-tip-desc">{description}</span>
    </span>
  );

  return createPortal(node, document.body);
}

function OrgNodeCardImpl({
  node,
  x,
  y,
  width,
  height: _height,
  isHighlighted,
  isOnSearchPath,
  collapsed,
  hasChildren,
  onToggle,
  canCreate,
  onAddSibling,
  onAddChild,
}: OrgNodeCardProps) {
  const role = node.role.toUpperCase();
  const totalReports = node.meta.totalReports;
  const directReports = node.meta.directReports;
  const showMeta = totalReports > 0;

  // For ADMIN-style synthetic roots we still render the toggle only
  // when there are real children to collapse.
  const toggleVisible = hasChildren;
  const showAddButtons = Boolean(canCreate && (onAddSibling || onAddChild));

  // Hover-driven tooltip state. We keep the trigger element in a ref
  // so the portal knows exactly which button to position against, and
  // we share the visibility logic across sibling + child slots.
  const siblingBtnRef = useRef<HTMLButtonElement | null>(null);
  const childBtnRef = useRef<HTMLButtonElement | null>(null);
  const [hoveredSide, setHoveredSide] = useState<"sibling" | "child" | null>(
    null,
  );

  // Mount the tooltip only after first hover so SSR markup stays
  // cheap; afterwards keep it mounted to avoid remount flicker.
  const [tooltipArmed, setTooltipArmed] = useState(false);

  const showSiblingTip = useCallback(() => {
    setTooltipArmed(true);
    setHoveredSide("sibling");
  }, []);
  const showChildTip = useCallback(() => {
    setTooltipArmed(true);
    setHoveredSide("child");
  }, []);
  const clearTip = useCallback(() => setHoveredSide(null), []);

  // Hide tooltip on Escape so keyboard users can dismiss it cleanly.
  useEffect(() => {
    if (!hoveredSide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearTip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hoveredSide, clearTip]);

  return (
    <div
      className={`org-node${isHighlighted ? " is-highlighted" : ""}${
        showAddButtons ? " org-node--can-create" : ""
      }`}
      style={{
        left: x,
        top: y,
        width,
      }}
      data-org-node-id={node.id}
      data-org-role={role}
      onClick={(e) => {
        // Avoid swallowing click on the toggle.
        const target = e.target as HTMLElement;
        if (target.closest(".org-node-toggle")) return;
        if (target.closest(".org-node-add")) return;
      }}
    >
      {showAddButtons && onAddSibling ? (
        <span className="org-node-add-slot org-node-add-slot--sibling">
          <button
            ref={siblingBtnRef}
            type="button"
            className="org-node-add org-node-add--sibling"
            aria-label="Thêm tài khoản cùng cấp"
            onMouseEnter={showSiblingTip}
            onMouseLeave={clearTip}
            onFocus={showSiblingTip}
            onBlur={clearTip}
            onClick={(e) => {
              e.stopPropagation();
              onAddSibling(node.id);
            }}
          >
            +
          </button>
        </span>
      ) : null}

      {showAddButtons && onAddChild ? (
        <span className="org-node-add-slot org-node-add-slot--child">
          <button
            ref={childBtnRef}
            type="button"
            className="org-node-add org-node-add--child"
            aria-label="Thêm tài khoản cấp dưới"
            onMouseEnter={showChildTip}
            onMouseLeave={clearTip}
            onFocus={showChildTip}
            onBlur={clearTip}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
          >
            ↓
          </button>
        </span>
      ) : null}

      <span className={rolePillClass(role)}>
        {role}
        {collapsed && hasChildren ? ` · ${totalReports}` : ""}
      </span>
      <div className="org-node-name">{node.fullName}</div>
      <div className="org-node-code">{node.employeeCode}</div>
      {node.teamName ? (
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {node.teamName}
        </div>
      ) : null}
      {showMeta ? (
        <div className="org-node-meta">
          <span className="org-node-meta-tag">
            {directReports} trực tiếp
          </span>
          <span className="org-node-meta-tag">{totalReports} tổng</span>
        </div>
      ) : null}
      {toggleVisible ? (
        <button
          type="button"
          className="org-node-toggle"
          aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          style={
            isOnSearchPath && !isHighlighted
              ? { boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.18)" }
              : undefined
          }
        >
          {collapsed ? "+" : "−"}
        </button>
      ) : null}

      {tooltipArmed && hoveredSide === "sibling" ? (
        <AddTooltip
          side="sibling"
          title="Thêm cùng cấp"
          description={
            <>
              Tạo tài khoản ngang hàng với <b>{node.fullName}</b>.
            </>
          }
          target={siblingBtnRef.current}
          open={true}
        />
      ) : null}
      {tooltipArmed && hoveredSide === "child" ? (
        <AddTooltip
          side="child"
          title="Thêm cấp dưới"
          description={
            <>
              Tạo tài khoản báo cáo cho <b>{node.fullName}</b>.
            </>
          }
          target={childBtnRef.current}
          open={true}
        />
      ) : null}
    </div>
  );
}

export default memo(OrgNodeCardImpl);
