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

import { Tabs } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";

type TabKey = "exchange-rate" | "shipping-fee";

const TAB_ROUTES: Record<TabKey, string> = {
  "exchange-rate": "/settings/exchange-rate",
  "shipping-fee": "/settings/shipping-fee",
};

const isTabKey = (value: string | null): value is TabKey =>
  value === "exchange-rate" || value === "shipping-fee";

export default function SettingsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  return (
    <PageContainer>
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Tỷ giá tiền tệ và phí ship dùng cho báo cáo doanh thu"
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Cài đặt hệ thống" }]}
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: "exchange-rate", label: "Tỷ giá tiền tệ" },
          { key: "shipping-fee", label: "Phí ship" },
        ]}
      />
    </PageContainer>
  );
}