/**
 * Facebook Pages Toolbar Component (Sprint 7.4)
 */

import { memo, useMemo } from "react";
import { Button, Input, Space, Select } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./facebook-pages.module.css";

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
  const lang = useLanguageStore((s) => s.language);
  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: t("Hoạt động", lang) },
      { value: "INACTIVE", label: t("Không hoạt động", lang) },
    ],
    [lang]
  );

  return (
    <div className={styles["fb-toolbar"]}>
      <div className={styles["fb-toolbar-left"]}>
        <Input
          placeholder={t("Tìm kiếm...", lang)}
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onFiltersChange({ keyword: e.target.value, status })}
          style={{ width: 250 }}
          allowClear
        />

        <Select
          placeholder={t("Trạng thái", lang)}
          value={status}
          onChange={(value) => onFiltersChange({ keyword, status: value })}
          options={statusOptions}
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
            {t("Làm mới", lang)}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {t("Tạo Facebook Page", lang)}
          </Button>
        </Space>
      </div>
    </div>
  );
}

const FacebookPagesToolbar = memo(FacebookPagesToolbarInner);
export default FacebookPagesToolbar;