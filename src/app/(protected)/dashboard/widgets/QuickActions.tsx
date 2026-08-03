/**
 * QuickActions Widget (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Displays quick action buttons: Lead, Order, Customer, Facebook, Product, Warehouse.
 * UI only — no CRUD wired up.
 * Uses CardSection, ActionButton from UI Kit.
 */

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
  UserAddOutlined: <UserAddOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  TeamOutlined: <TeamOutlined />,
  FacebookOutlined: <FacebookOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
};

export default function QuickActions({ data }: QuickActionsProps) {
  return (
    <CardSection title="Thao tác nhanh">
      <Space wrap size={[12, 12]}>
        {data.map((action) => (
          <Button
            key={action.id}
            icon={ICON_MAP[action.icon] ?? null}
            size="large"
          >
            {action.label}
          </Button>
        ))}
      </Space>
    </CardSection>
  );
}