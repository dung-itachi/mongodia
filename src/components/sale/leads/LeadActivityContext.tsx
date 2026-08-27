"use client";

/**
 * Lead Activity Context - Share timeline + call data across tabs
 * 
 * Context provider dùng combined API, tránh gọi nhiều lần
 */

import { createContext, useContext, type ReactNode } from "react";
import { useLeadTimelineCombined, type CombinedTimelineResponse } from "@/hooks/useLeadCallLog";

interface LeadActivityContextValue {
  timeline: CombinedTimelineResponse["timeline"];
  callHistory: CombinedTimelineResponse["callHistory"];
  loading: boolean;
  error: string | null;
}

const LeadActivityContext = createContext<LeadActivityContextValue>({
  timeline: [],
  callHistory: [],
  loading: false,
  error: null,
});

interface LeadActivityProviderProps {
  leadId: string;
  children: ReactNode;
}

/**
 * Provider wrapping tabs that need timeline/call data
 */
export function LeadActivityProvider({ leadId, children }: LeadActivityProviderProps) {
  const { timeline, callHistory, loading, error } = useLeadTimelineCombined(leadId);

  return (
    <LeadActivityContext.Provider value={{ timeline, callHistory, loading, error }}>
      {children}
    </LeadActivityContext.Provider>
  );
}

/**
 * Hook để access shared activity data
 */
export function useLeadActivityContext() {
  return useContext(LeadActivityContext);
}
