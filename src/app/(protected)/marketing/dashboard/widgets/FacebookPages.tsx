/**
 * FacebookPages Widget (Sprint 5.1A — Marketing Dashboard)
 *
 * Facebook page performance placeholder.
 * Currently shows Coming Soon.
 *
 * TODO: Wire up to Facebook API when available.
 */

import { memo } from "react";
import { CardSection } from "@/components/common";
import styles from "../marketing.module.css";

function FacebookPagesInner() {
  return (
    <CardSection title="Trang Facebook">
      <div className={styles["mk-coming-soon"]}>
        <span>Coming Soon</span>
      </div>
    </CardSection>
  );
}

const FacebookPages = memo(FacebookPagesInner);
export default FacebookPages;
