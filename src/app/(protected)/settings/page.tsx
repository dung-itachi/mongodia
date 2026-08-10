/**
 * Cài đặt hệ thống — Index page
 *
 * Currently redirects to the Exchange Rate sub-page (the only available
 * setting). Future settings (default area, default team, etc.) will be
 * linked from here.
 */

import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
  redirect("/settings/exchange-rate");
}