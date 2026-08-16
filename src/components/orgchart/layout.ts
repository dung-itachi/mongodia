/**
 * Tree layout for the organization chart.
 *
 * Strategy: top-down / horizontal flow.
 *
 *   - One LEVEL = one horizontal row (ADMIN row, MANAGER row, ...).
 *   - Within a level, each leaf branch is given a contiguous horizontal
 *     slot. Siblings share their parent's slot evenly.
 *   - We do a post-order walk to determine each subtree's required
 *     slot count, then a pre-order walk to place nodes.
 *
 * The chart collapses naturally: when a node is collapsed, its subtree
 * is dropped from the laid-out output and its slot is reclaimed by
 * sibling subtrees.
 *
 * Output contract:
 *   `layoutTree(...)` returns `LaidOutNode[]`. The recursive
 *   internal type is intentionally NOT exported — callers should
 *   depend only on `LaidOutNode` so width/height/col/childIds stay
 *   consistent across the public boundary.
 */

import type { LaidOutNode, OrgNode } from "./types";

export type LayoutOptions = {
  /** Card width in pixels. */
  nodeWidth?: number;
  /** Card height in pixels (used for vertical spacing). */
  nodeHeight?: number;
  /** Horizontal gap between sibling cards. */
  colGap?: number;
  /** Vertical gap between rows. */
  rowGap?: number;
  /** Left/top starting offset. */
  startX?: number;
  startY?: number;
};

/**
 * Run the layout, returning the flat list of laid-out nodes.
 *
 * Hidden nodes (collapsed or filtered out) are excluded so their slot
 * re-distributes to siblings — preventing gaps when a branch is closed.
 *
 * Each returned node has the full `LaidOutNode` shape:
 *   - `col`:        horizontal slot index (informational; not used
 *                   for placement — placement uses pre-computed x/y).
 *   - `x`, `y`:     top-left pixel coords of the rendered card.
 *   - `width`,
 *     `height`:     card dimensions (sourced from `LayoutOptions`).
 *   - `childIds`:   ids of *visible* children that were emitted into
 *                   `laid` (post-collapse). The connector layer uses
 *                   this to draw parent → child edges.
 */
export function layoutTree(
  root: OrgNode,
  isExpanded: (id: string) => boolean,
  options: Required<LayoutOptions>,
): {
  laid: LaidOutNode[];
  width: number;
  height: number;
} {
  // Internal recursive shape — only the cols/x/y/children fields are
  // needed to perform the placement walk. Width/height/col/childIds
  // are added when we promote each internal node to a `LaidOutNode`
  // at the exit point below.
  type InternalNode = {
    node: OrgNode;
    cols: number;
    x: number;
    y: number;
    children: InternalNode[];
  };

  // Post-order: compute slot count for each subtree.
  function computeSlots(n: OrgNode): InternalNode {
    const visibleChildren = n.children.filter((c) => isExpanded(c.id));
    const childNodes = visibleChildren.map(computeSlots);
    const ownCols = 1;
    const childCols = childNodes.reduce((sum, c) => sum + c.cols, 0);
    return {
      node: n,
      cols: Math.max(ownCols, childCols),
      x: 0,
      y: 0,
      children: childNodes,
    };
  }

  const rootInternal = computeSlots(root);

  // Pre-order: place each node within its slot.
  function place(n: InternalNode, slotStart: number, level: number) {
    const totalSlotWidth = n.cols * (options.nodeWidth + options.colGap);
    const ownOffset =
      (totalSlotWidth - options.nodeWidth) / 2; // center node in its slot
    n.x =
      options.startX +
      slotStart * (options.nodeWidth + options.colGap) +
      ownOffset;
    n.y = options.startY + level * (options.nodeHeight + options.rowGap);

    let childSlot = slotStart;
    for (const child of n.children) {
      place(child, childSlot, level + 1);
      childSlot += child.cols;
    }
  }

  place(rootInternal, 0, 0);

  // Flatten to a list of LaidOutNode, populating the contract fields
  // (width, height, col, childIds) at this boundary.
  const laid: LaidOutNode[] = [];
  function collect(n: InternalNode) {
    laid.push({
      node: n.node,
      // `col` is informational only (kept for diagnostics / future
      // use). We populate it with the slot index the node was placed
      // into, derived from x relative to the start offset.
      col: Math.max(
        0,
        Math.round(
          (n.x - options.startX) / Math.max(options.nodeWidth + options.colGap, 1),
        ),
      ),
      x: n.x,
      y: n.y,
      width: options.nodeWidth,
      height: options.nodeHeight,
      // Collect only the *visible* children's ids — same set used
      // during the slot pass. Edge layout relies on this being a
      // subset of the parent node's full child list when a branch
      // is collapsed.
      childIds: n.children.map((c) => c.node.id),
    });
    for (const c of n.children) collect(c);
  }
  collect(rootInternal);

  const width =
    rootInternal.cols * (options.nodeWidth + options.colGap) + options.colGap;
  const levels = countLevels(rootInternal);
  const height =
    levels * (options.nodeHeight + options.rowGap) + options.rowGap;

  return { laid, width, height };
}

function countLevels(root: {
  children: { children: unknown[] }[];
}): number {
  let maxLevel = 0;
  function walk(n: { children: { children: unknown[] }[] }, level: number) {
    if (level > maxLevel) maxLevel = level;
    for (const c of n.children) walk(c as never, level + 1);
  }
  walk(root as never, 0);
  return maxLevel + 1;
}

/** Lookup helpers for the rendered chart. */
export function buildIndex(laid: LaidOutNode[]) {
  const map = new Map<string, LaidOutNode>();
  for (const n of laid) map.set(n.node.id, n);
  return map;
}