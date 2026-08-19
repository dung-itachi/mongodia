/**
 * DrawerForm Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Drawer with form footer.
 *
 * Ant Design v5+ deprecates `width` in favor of `size` ("default" | "large").
 * Use `size` prop for standard sizes, or `width` for custom dimensions.
 */

import { Drawer, Button, Space } from "antd";
import { ReactNode } from "react";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

/**
 * Get translated text synchronously (for default props)
 */
function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export type DrawerFormProps = {
  open: boolean;
  title: string;
  /** Ant Design drawer size: "default" (378px) or "large" (736px) */
  size?: "default" | "large";
  /** Custom width in pixels. Use `size` for standard sizes instead. */
  width?: number | string;
  loading?: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export default function DrawerForm({
  open,
  title,
  size,
  width,
  loading,
  onClose,
  onSubmit,
  submitText,
  cancelText,
  footer,
  children,
}: DrawerFormProps) {
  // Ant Design v5+ deprecates `width` in favor of `size` or `styles.wrapper.width`
  const drawerStyles = size
    ? undefined
    : { wrapper: { width: width ?? 600 } };

  const defaultSubmitText = submitText ?? getTranslated("Lưu");
  const defaultCancelText = cancelText ?? getTranslated("Hủy");

  return (
    <Drawer
      title={title}
      placement="right"
      size={size}
      styles={drawerStyles}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        footer !== undefined ? (
          footer
        ) : (
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>{defaultCancelText}</Button>
            {onSubmit && (
              <Button
                type="primary"
                onClick={onSubmit}
                loading={loading}
              >
                {loading ? getTranslated("Đang lưu...") : defaultSubmitText}
              </Button>
            )}
          </Space>
        )
      }
    >
      {children}
    </Drawer>
  );
}
