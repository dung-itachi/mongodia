/**
 * QuickActions Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays quick action buttons: Customer, Order, Customer, Facebook, Product, Warehouse.
 * UI only — no CRUD wired up.
 * Memoized to avoid re-render when other widgets change.
 */

import { memo } from "react";
import { CardSection } from "@/components/common";
import { Space, Button } from "antd";
import {
  UserAddOutlined,
  FileTextOutlined,
  TeamOutlined,
  FacebookOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { QuickAction } from "@/types/dashboard-activity";

export type QuickActionsProps = {
  data: QuickAction[];
};

const ICON_MAP: Record<string, React.ReactNode> = {
  UserAddOutlined: <UserAddOutlined aria-hidden="true" />,
  FileTextOutlined: <FileTextOutlined aria-hidden="true" />,
  TeamOutlined: <TeamOutlined aria-hidden="true" />,
  FacebookOutlined: <FacebookOutlined aria-hidden="true" />,
  ShoppingOutlined: <ShoppingOutlined aria-hidden="true" />,
  DatabaseOutlined: <DatabaseOutlined aria-hidden="true" />,
};

function QuickActionsInner({ data }: QuickActionsProps) {
  return (
    <CardSection title="Thao tác nhanh">
      <Space
        wrap
        size={[12, 12]}
        role="group"
        aria-label="Các thao tác nhanh"
      >
        {data.map((action) => (
          <Button
            key={action.id}
            icon={ICON_MAP[action.icon] ?? null}
            size="large"
            aria-label={`Tạo mới ${action.label}`}
          >
            {action.label}
          </Button>
        ))}
      </Space>
    </CardSection>
  );
}

const QuickActions = memo(QuickActionsInner);
export default QuickActions;