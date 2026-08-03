/**
 * useDialog Hook (Sprint 3.1 - Complete UI Kit)
 *
 * Manage dialog/modal state.
 */

import { useState, useCallback } from "react";

export type DialogState = {
  open: boolean;
  type: "confirm" | "delete" | "warning";
  title?: string;
  content?: string;
  onConfirm?: () => void;
};

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "confirm",
  });

  const openConfirm = useCallback(
    (options: {
      title?: string;
      content?: string;
      onConfirm: () => void;
    }) => {
      setDialog({
        open: true,
        type: "confirm",
        title: options.title,
        content: options.content,
        onConfirm: options.onConfirm,
      });
    },
    []
  );

  const openDelete = useCallback(
    (options: {
      title?: string;
      content?: string;
      onConfirm: () => void;
    }) => {
      setDialog({
        open: true,
        type: "delete",
        title: options.title,
        content: options.content,
        onConfirm: options.onConfirm,
      });
    },
    []
  );

  const openWarning = useCallback(
    (options: {
      title?: string;
      content?: string;
      onConfirm: () => void;
    }) => {
      setDialog({
        open: true,
        type: "warning",
        title: options.title,
        content: options.content,
        onConfirm: options.onConfirm,
      });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialog((prev) => ({
      ...prev,
      open: false,
      onConfirm: undefined,
    }));
  }, []);

  return {
    dialog,
    openConfirm,
    openDelete,
    openWarning,
    closeDialog,
  };
}

export default useDialog;
