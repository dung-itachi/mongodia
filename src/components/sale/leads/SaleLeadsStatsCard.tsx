/**
 * SaleLeadsStatsCard (Sprint 8.x+)
 *
 * Stats panel shown above the leads table on /leads (Sale team).
 *
 * Renders:
 *  1. Doanh thu (revenue) card — total revenue from CLOSED leads with currency toggle.
 *  2. Tổng đơn (total) card — grand total of leads in the current scope.
 *  3. Breakdown row — count chip per LeadStatus, each with a Tooltip explanation.
 *
 * The card consumes `stats.statusCounts[]` (full breakdown across all statuses),
 * `stats.closedRevenueMNT`, `stats.totalCount`, etc. coming from
 * `useSaleLeadStats()`.
 *
 * Currency toggle is hoisted into the parent (/leads) so it can be
 * shared with the leads table columns.
 */

import { memo } from "react";
import { Tag, Tooltip } from "antd";
import {
  DollarCircleOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import { StatCard, StatGrid } from "@/components/common";
import { convertMNTtoVND, formatMNT, formatVND } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { SaleLeadStats, SaleLeadStatusCountItem } from "@/hooks/useSaleLeads";
import { LeadStatus } from "@/constants/leadStatus";

export type SaleLeadsStatsCardProps = {
  stats: SaleLeadStats;
  loading?: boolean;
  currency: "MNT" | "VND";
  onToggleCurrency: () => void;
  exchangeRate?: number;
};

const STATUS_TAG_COLOR: Record<string, string> = {
  [LeadStatus.NEW]: "purple",
  [LeadStatus.CONTACTED]: "blue",
  [LeadStatus.QUALIFIED]: "cyan",
  [LeadStatus.ASSIGNED]: "geekblue",
  [LeadStatus.PROCESSING]: "gold",
  [LeadStatus.NO_ANSWER]: "orange",
  [LeadStatus.POTENTIAL]: "green",
  [LeadStatus.CLOSED]: "default",
  [LeadStatus.LOST]: "red",
  [LeadStatus.ORDER_CREATED]: "magenta",
  [LeadStatus.REJECTED]: "volcano",
  [LeadStatus.CANCELLED]: "red",
};

const STATUS_TOOLTIP: Record<string, string> = {
  [LeadStatus.NEW]: "Lead mới — chưa được Sale nào xử lý.",
  [LeadStatus.CONTACTED]: "Sale đã liên hệ khách nhưng chưa xác nhận nhu cầu.",
  [LeadStatus.QUALIFIED]: "Khách đủ điều kiện — đang chờ chốt đơn.",
  [LeadStatus.ASSIGNED]: "Đã được phân công cho Sale phụ trách.",
  [LeadStatus.PROCESSING]: "Đang trong quá trình xử lý đơn hàng.",
  [LeadStatus.NO_ANSWER]: "Khách không nghe máy — cần gọi lại.",
  [LeadStatus.POTENTIAL]: "Khách tiềm năng — có thể chốt đơn.",
  [LeadStatus.CLOSED]: "Khách đã chốt đơn thành công — đã tính doanh thu.",
  [LeadStatus.LOST]: "Khách từ chối — không mua.",
  [LeadStatus.ORDER_CREATED]: "Đã tạo đơn hàng trên hệ thống.",
  [LeadStatus.REJECTED]: "Bị từ chối bởi Marketing/Sale.",
  [LeadStatus.CANCELLED]: "Đơn hàng đã bị huỷ.",
};

// Tooltip strings pre-translated with t() at module load (static content).
const STATUS_TOOLTIP_EN: Record<string, string> = {
  [LeadStatus.NEW]: "New lead — not handled by any Sale yet.",
  [LeadStatus.CONTACTED]: "Sale contacted customer but hasn't confirmed need.",
  [LeadStatus.QUALIFIED]: "Qualified — waiting to close deal.",
  [LeadStatus.ASSIGNED]: "Assigned to handling Sale.",
  [LeadStatus.PROCESSING]: "Order processing.",
  [LeadStatus.NO_ANSWER]: "Customer didn't answer — needs callback.",
  [LeadStatus.POTENTIAL]: "Potential — may close deal.",
  [LeadStatus.CLOSED]: "Deal closed successfully — counted in revenue.",
  [LeadStatus.LOST]: "Customer refused — not interested.",
  [LeadStatus.ORDER_CREATED]: "Order created in system.",
  [LeadStatus.REJECTED]: "Rejected by Marketing/Sale.",
  [LeadStatus.CANCELLED]: "Order cancelled.",
};

function SaleLeadsStatsCardInner({
  stats,
  loading = false,
  currency,
  onToggleCurrency,
  exchangeRate = 0,
}: SaleLeadsStatsCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const closedRevenueDisplay =
    currency === "VND" && exchangeRate > 0
      ? formatVND(convertMNTtoVND(stats.closedRevenueMNT, exchangeRate))
      : formatMNT(stats.closedRevenueMNT);

  return (
    <div>
      <StatGrid columns={2} gap={12} minItemWidth={260}>
        <Tooltip
          title={
            <span>
              {t("Tổng doanh thu từ các đơn hàng đã chốt.", lang)}
              <br />
              <b>{t("Công thức:", lang)}</b> {t("Σ (giá combo − phí ship) trên mỗi đơn có status = CLOSED.", lang)}
              <br />
              {t("Phí ship hiện tại:", lang)} <b>{formatMNT(stats.shippingFeeMNT)}</b>.
            </span>
          }
          mouseEnterDelay={0.2}
        >
          <div>
            <StatCard
              title={t("Doanh thu", lang)}
              value={closedRevenueDisplay}
              color="purple"
              size="default"
              loading={loading}
              icon={<DollarCircleOutlined />}
              onCurrencyToggle={onToggleCurrency}
              displayCurrency={currency}
            />
            <div
              style={{
                fontSize: 11,
                color: "#8c8c8c",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <InfoCircleOutlined style={{ fontSize: 11 }} />
              {t("Click vào icon để đổi MNT ↔ VND.", lang)}
            </div>
          </div>
        </Tooltip>

        <Tooltip
          title={t("Tổng số khách hàng (tất cả trạng thái) của bạn. Sale chỉ thấy leads được phân công; Admin/Manager thấy tất cả.", lang)}
          mouseEnterDelay={0.2}
        >
          <div>
            <StatCard
              title={t("Tổng khách", lang)}
              value={stats.totalCount}
              color="blue"
              size="default"
              loading={loading}
              icon={<InboxOutlined />}
            />
            <div
              style={{
                fontSize: 11,
                color: "#8c8c8c",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <InfoCircleOutlined style={{ fontSize: 11 }} />
              {t("Trong đó có", lang)} <b style={{ margin: "0 2px" }}>{stats.closedCount}</b> {t("đơn đã chốt.", lang)}
            </div>
          </div>
        </Tooltip>
      </StatGrid>

      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#595959",
            marginBottom: 8,
          }}
        >
          <PieChartOutlined />
          <span>{t("Phân bổ theo trạng thái:", lang)}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {stats.statusCounts.map((s) => (
            <StatusChip key={s.status} item={s} loading={loading} lang={lang} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ item, loading, lang }: { item: SaleLeadStatusCountItem; loading: boolean; lang: ReturnType<typeof useLanguageStore.getState>["language"] }) {
  const tooltipText =
    (lang === "en" ? STATUS_TOOLTIP_EN[item.status] : STATUS_TOOLTIP[item.status]) ??
    `Số khách đang ở trạng thái "${item.label}".`;

  return (
    <Tooltip title={tooltipText} mouseEnterDelay={0.2}>
      <Tag
        color={STATUS_TAG_COLOR[item.status] ?? "default"}
        style={{
          margin: 0,
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 12,
          cursor: "help",
        }}
        bordered
      >
        <span style={{ fontWeight: 600 }}>{loading ? "…" : item.count}</span>
        <span style={{ marginLeft: 4, opacity: 0.85 }}>{item.label}</span>
      </Tag>
    </Tooltip>
  );
}

const SaleLeadsStatsCard = memo(SaleLeadsStatsCardInner);
export default SaleLeadsStatsCard;