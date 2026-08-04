/**
 * CampaignStatus Widget (Sprint 5.1A — Marketing Dashboard)
 *
 * Marketing campaign status placeholder.
 * Currently shows Coming Soon.
 *
 * TODO: Wire up to campaign data when available.
 */

import { memo } from "react";
import { CardSection } from "@/components/common";
import styles from "../marketing.module.css";

function CampaignStatusInner() {
  return (
    <CardSection title="Chiến dịch">
      <div className={styles["mk-coming-soon"]}>
        <span>Coming Soon</span>
      </div>
    </CardSection>
  );
}

const CampaignStatus = memo(CampaignStatusInner);
export default CampaignStatus;
