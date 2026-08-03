/**
 * SkeletonForm Component (Sprint 3.1 - Complete UI Kit)
 */

import { Skeleton, Button } from "antd";

export type SkeletonFormProps = {
  /** Number of form groups */
  groups?: number;
  /** Number of fields per group */
  fieldsPerGroup?: number;
  /** Show submit button */
  showButton?: boolean;
  /** Active animation */
  active?: boolean;
};

export default function SkeletonForm({
  groups = 2,
  fieldsPerGroup = 3,
  showButton = true,
  active = true,
}: SkeletonFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {Array.from({ length: groups }, (_, gi) => (
        <div key={`group-${gi}`}>
          <Skeleton
            active={active}
            title={{ width: 120 }}
            paragraph={false}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${fieldsPerGroup}, 1fr)`,
              gap: 16,
              marginTop: 12,
            }}
          >
            {Array.from({ length: fieldsPerGroup }, (_, fi) => (
              <Skeleton
                key={`field-${fi}`}
                active={active}
                paragraph={{ rows: 1 }}
                title={false}
              />
            ))}
          </div>
        </div>
      ))}
      {showButton && (
        <div style={{ marginTop: 16 }}>
          <Button type="default" disabled style={{ width: 100, height: 32 }}>
            &nbsp;
          </Button>
        </div>
      )}
    </div>
  );
}