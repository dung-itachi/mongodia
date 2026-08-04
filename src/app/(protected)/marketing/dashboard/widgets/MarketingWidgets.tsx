/**
 * MarketingWidgets Component (Sprint 5.1A — Marketing Dashboard)
 *
 * Container component that aggregates marketing widgets.
 * All widgets currently show Coming Soon placeholders.
 */

import { memo } from "react";
import FacebookPages from "./FacebookPages";
import CampaignStatus from "./CampaignStatus";
import styles from "../marketing.module.css";

function MarketingWidgetsInner() {
  return (
    <div className={styles["mk-section"]} aria-label="Marketing widgets">
      <div className={styles["mk-grid-2"]}>
        <FacebookPages />
        <CampaignStatus />
      </div>
    </div>
  );
}

const MarketingWidgets = memo(MarketingWidgetsInner);
export default MarketingWidgets;
