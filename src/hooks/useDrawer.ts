/**
 * useDrawer Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Manage drawer state.
 */

import { useState, useCallback } from "react";

export type DrawerState = {
  open: boolean;
  mode: "create" | "edit" | "view";
  recordId?: string;
};

export function useDrawer() {
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
  });

  const openDrawer = useCallback(
    (mode: "create" | "edit" | "view", recordId?: string) => {
      setDrawer({
        open: true,
        mode,
        recordId,
      });
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setDrawer({
      open: false,
      mode: "create",
      recordId: undefined,
    });
  }, []);

  const isDrawerOpen = drawer.open;

  return {
    drawer,
    openDrawer,
    closeDrawer,
    isDrawerOpen,
  };
}

export default useDrawer;
