/**
 * Cài đặt hệ thống — Hub page (tabs)
 *
 * Acts as a tabbed entry-point that redirects to the dedicated sub-route
 * for the active tab. This way:
 *   - Deep-links like `/settings?tab=shipping-fee` still work.
 *   - The sub-pages (`/settings/exchange-rate`, `/settings/shipping-fee`)
 *     own their own full chrome (PageHeader, breadcrumb) so direct visits
 *     are unaffected.
 *   - Tab state is mirrored into the URL so users can share/bookmark it.
 */

"use client";

import { Tabs, Dropdown, Button } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { MenuProps } from "antd";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import { DownOutlined, GlobalOutlined } from "@ant-design/icons";
import { useLanguageStore, type Language } from "@/store/language.store";

type TabKey = "exchange-rate" | "shipping-fee" | "language";

const TAB_ROUTES: Record<TabKey, string> = {
  "exchange-rate": "/settings/exchange-rate",
  "shipping-fee": "/settings/shipping-fee",
  "language": "/settings?tab=language",
};

const isTabKey = (value: string | null): value is TabKey =>
  value === "exchange-rate" || value === "shipping-fee" || value === "language";

const LANGUAGES: Array<{ key: Language; label: string; flag: string }> = [
  { key: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "mn", label: "Монгол хэл", flag: "🇲🇳" },
];

export default function SettingsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLanguageStore();

  // Derive the active tab directly from the URL — no effect needed.
  const rawTab = searchParams.get("tab");
  const activeTab = useMemo<TabKey>(
    () => (isTabKey(rawTab) ? rawTab : "exchange-rate"),
    [rawTab]
  );

  const handleTabChange = (key: string) => {
    if (isTabKey(key)) {
      router.push(TAB_ROUTES[key]);
    }
  };

  const handleLanguageChange: MenuProps["onClick"] = ({ key }) => {
    if (key === "vi" || key === "en" || key === "mn") {
      setLanguage(key);
    }
  };

  const languageMenu: MenuProps = {
    items: LANGUAGES.map((lang) => ({
      key: lang.key,
      label: (
        <span>
          <span style={{ marginRight: 8 }}>{lang.flag}</span>
          {lang.label}
        </span>
      ),
      onClick: () => setLanguage(lang.key),
    })),
    onClick: handleLanguageChange,
  };

  const currentLang = LANGUAGES.find((l) => l.key === language) || LANGUAGES[0];

  return (
    <PageContainer>
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Tỷ giá tiền tệ, phí ship và ngôn ngữ"
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Cài đặt hệ thống" }]}
        actions={
          <Dropdown menu={languageMenu} trigger={["click"]}>
            <Button icon={<GlobalOutlined />}>
              <span style={{ marginRight: 4 }}>{currentLang.flag}</span>
              {currentLang.label}
              <DownOutlined style={{ marginLeft: 4, fontSize: 10 }} />
            </Button>
          </Dropdown>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: "exchange-rate", label: "Tỷ giá tiền tệ" },
          { key: "shipping-fee", label: "Phí ship" },
          { key: "language", label: "Ngôn ngữ" },
        ]}
      />

      {activeTab === "language" && (
        <div style={{ padding: "24px 0" }}>
          <div style={{ marginBottom: 16, fontWeight: 500 }}>Chọn ngôn ngữ hiển thị:</div>
          <Dropdown menu={languageMenu} trigger={["click"]}>
            <Button size="large" icon={<GlobalOutlined />}>
              <span style={{ marginRight: 8 }}>{currentLang.flag}</span>
              {currentLang.label}
              <DownOutlined style={{ marginLeft: 8 }} />
            </Button>
          </Dropdown>
        </div>
      )}
    </PageContainer>
  );
}