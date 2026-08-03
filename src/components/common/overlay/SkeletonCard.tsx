/**
 * SkeletonCard Component (Sprint 3.1 - Complete UI Kit)
 */

import { Skeleton } from "antd";

export type SkeletonCardProps = {
  /** Number of lines to show */
  rows?: number;
  /** Show avatar */
  avatar?: boolean;
  /** Show title */
  title?: boolean;
  /** Active animation */
  active?: boolean;
};

export default function SkeletonCard({
  rows = 3,
  avatar = false,
  title = true,
  active = true,
}: SkeletonCardProps) {
  return (
    <div className="card">
      <Skeleton
        active={active}
        avatar={avatar}
        title={title}
        paragraph={{ rows }}
      />
    </div>
  );
}
