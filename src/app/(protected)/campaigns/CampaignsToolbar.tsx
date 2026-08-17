/**
 * Campaigns Toolbar Component (Sprint 7.4)
 */

import { memo, useEffect, useState } from "react";
import { Button, Input, Space, Select } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import styles from "./campaigns.module.css";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

export type CampaignsToolbarProps = {
  keyword: string;
  facebookPageId?: string;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  onFiltersChange: (filters: {
    keyword?: string;
    facebookPageId?: string;
    status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | undefined;
  }) => void;
  onCreate: () => void;
  onRefresh: () => void;
};

function CampaignsToolbarInner({
  keyword,
  facebookPageId,
  status,
  onFiltersChange,
  onCreate,
  onRefresh,
}: CampaignsToolbarProps) {
  const message = useMessage();
  const [facebookPageOptions, setFacebookPageOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const loadFacebookPages = async (keyword: string) => {
    setLoadingPages(true);
    try {
      const params = new URLSearchParams({ pageSize: "100", isActive: "true" });
      if (keyword) params.set("keyword", keyword);
      
      const res = await fetch(`/api/facebook-pages?${params.toString()}`);
      const json = await res.json();
      
      if (json.success && json.data?.items) {
        setFacebookPageOptions(
          json.data.items.map((p: { _id: string; name: string }) => ({
            label: p.name,
            value: p._id,
          }))
        );
      }
    } catch {
      message.error("Lỗi khi tải danh sách Facebook Pages");
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    loadFacebookPages("");
  }, []);

  return (
    <div className={styles["campaign-toolbar"]}>
      <div className={styles["campaign-toolbar-left"]}>
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onFiltersChange({ keyword: e.target.value, facebookPageId, status })}
          style={{ width: 200 }}
          allowClear
        />

        <AsyncSelect
          value={facebookPageId}
          onChange={(value) => onFiltersChange({ keyword, facebookPageId: value as string | undefined, status })}
          options={facebookPageOptions}
          placeholder="Facebook Page"
          allowClear
          searchable
          onSearch={loadFacebookPages}
          loading={loadingPages}
          style={{ width: 200 }}
        />

        <Select
          placeholder="Trạng thái"
          value={status}
          onChange={(value) => onFiltersChange({ keyword, facebookPageId, status: value })}
          options={STATUS_OPTIONS}
          allowClear
          style={{ width: 150 }}
        />
      </div>

      <div className={styles["campaign-toolbar-right"]}>
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
            Tạo Campaign
          </Button>
        </Space>
      </div>
    </div>
  );
}

const CampaignsToolbar = memo(CampaignsToolbarInner);
export default CampaignsToolbar;
