/**
 * Connector overlay for the organization chart.
 *
 * Renders an SVG layer with one path per parent → child edge. The
 * connector starts at the bottom-center of the parent and ends at the
 * top-center of the child, with a small "elbow" so the line is easy
 * to follow visually.
 *
 * Width/height are inherited from CSS — the SVG fills the canvas.
 */

"use client";

import { useMemo } from "react";
import type { LaidOutNode } from "./types";

type ConnectorLayerProps = {
  laid: LaidOutNode[];
  /** Extra spacing used between card bottom and child top. */
  elbow?: number;
  /** When true, draws the line in the highlighted color. */
  highlightedEdgeIds?: Set<string>;
};

type Edge = {
  id: string;
  d: string;
  highlighted: boolean;
};

export default function ConnectorLayer({
  laid,
  elbow = 18,
  highlightedEdgeIds,
}: ConnectorLayerProps) {
  const laidById = useMemo(
    () => new Map<string, LaidOutNode>(laid.map((n) => [n.node.id, n])),
    [laid]
  );

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    for (const n of laid) {
      for (const childId of n.childIds) {
        const child = laidById.get(childId);
        if (!child) continue;
        const px = n.x + n.width / 2;
        const py = n.y + n.height;
        const cx = child.x + child.width / 2;
        const cy = child.y;
        // Vertical drop from parent, horizontal elbow, then vertical drop
        // into the child. The elbow height is half the row gap for a
        // balanced look on dense trees.
        const elbowY = py + elbow;
        const d = [
          `M ${px} ${py}`,
          `L ${px} ${elbowY}`,
          // Horizontal segment only when child is not directly below.
          cx === px ? "" : `L ${cx} ${elbowY}`,
          `L ${cx} ${cy}`,
        ]
          .filter(Boolean)
          .join(" ");
        out.push({
          id: `${n.node.id}->${childId}`,
          d,
          highlighted: highlightedEdgeIds?.has(`${n.node.id}-${childId}`) ?? false,
        });
      }
    }
    return out;
  }, [laid, laidById, elbow, highlightedEdgeIds]);

  return (
    <svg
      className="org-chart-svg"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0 }}
    >
      <g transform={`translate(0,0)`}>
        {edges.map((e) => (
          <path
            key={e.id}
            d={e.d}
            className={e.highlighted ? "is-highlighted" : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
