/**
 * Lead Source Types (Sprint 5.2 — Lead Domain Foundation)
 *
 * Enum cho nguồn lead - sử dụng trong Marketing Input.
 * Thống nhất với SourceType trong Lead Model.
 */

/**
 * Lead source enum - mapping với Lead Model SOURCE_TYPES
 */
export enum LeadSource {
  LANDING_PAGE = "LANDING_PAGE",
  FACEBOOK_COMMENT = "FACEBOOK_COMMENT",
  FACEBOOK_INBOX = "FACEBOOK_INBOX",
  TIKTOK = "TIKTOK",
  ZALO = "ZALO",
  OTHER = "OTHER",
}

/**
 * Lead source labels cho UI
 */
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.LANDING_PAGE]: "Landing Page",
  [LeadSource.FACEBOOK_COMMENT]: "Facebook Comment",
  [LeadSource.FACEBOOK_INBOX]: "Facebook Inbox",
  [LeadSource.TIKTOK]: "TikTok",
  [LeadSource.ZALO]: "Zalo",
  [LeadSource.OTHER]: "Khác",
};

/**
 * Lead source options cho select/filter
 */
export const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((source) => ({
  value: source,
  label: LEAD_SOURCE_LABELS[source],
}));
