/**
 * Campaigns Toolbar Component (Sprint 7.4)
 */

import { memo, useEffect, useMemo, useState } from "react";
import { Button, Input, Space, Select } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./campaigns.module.css";

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
  const lang = useLanguageStore((s) => s.language);
  const [facebookPageOptions, setFacebookPageOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: t("Hoạt động", lang) },
      { value: "PAUSED", label: t("Tạm dừng", lang) },
      { value: "COMPLETED", label: t("Hoàn thành", lang) },
      { value: "ARCHIVED", label: t("Lưu trữ", lang) },
    ],
    [lang]
  );

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
      message.error(t("Lỗi khi tải danh sách Facebook Pages", lang));
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
          placeholder={t("Tìm kiếm...", lang)}
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
          placeholder={t("Facebook Page", lang)}
          allowClear
          searchable
          onSearch={loadFacebookPages}
          loading={loadingPages}
          style={{ width: 200 }}
        />

        <Select
          placeholder={t("Trạng thái", lang)}
          value={status}
          onChange={(value) => onFiltersChange({ keyword, facebookPageId, status: value })}
          options={statusOptions}
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
            {t("Làm mới", lang)}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {t("Tạo Campaign", lang)}
          </Button>
        </Space>
      </div>
    </div>
  );
}

const CampaignsToolbar = memo(CampaignsToolbarInner);
export default CampaignsToolbar;