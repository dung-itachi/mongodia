/**
 * Facebook Pages Toolbar Component (Sprint 7.4)
 */

import { memo } from "react";
import { Button, Input, Space, Select, Tag } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import styles from "./facebook-pages.module.css";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Không hoạt động" },
];

export type FacebookPagesToolbarProps = {
  keyword: string;
  status?: "ACTIVE" | "INACTIVE";
  onFiltersChange: (filters: { keyword?: string; status?: "ACTIVE" | "INACTIVE" | undefined }) => void;
  onCreate: () => void;
  onRefresh: () => void;
};

function FacebookPagesToolbarInner({
  keyword,
  status,
  onFiltersChange,
  onCreate,
  onRefresh,
}: FacebookPagesToolbarProps) {
  return (
    <div className={styles["fb-toolbar"]}>
      <div className={styles["fb-toolbar-left"]}>
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onFiltersChange({ keyword: e.target.value, status })}
          style={{ width: 250 }}
          allowClear
        />

        <Select
          placeholder="Trạng thái"
          value={status}
          onChange={(value) => onFiltersChange({ keyword, status: value })}
          options={STATUS_OPTIONS}
          allowClear
          style={{ width: 150 }}
        />
      </div>

      <div className={styles["fb-toolbar-right"]}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Tạo Facebook Page
          </Button>
        </Space>
      </div>
    </div>
  );
}

const FacebookPagesToolbar = memo(FacebookPagesToolbarInner);
export default FacebookPagesToolbar;
