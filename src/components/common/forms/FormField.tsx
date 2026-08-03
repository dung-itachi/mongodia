/**
 * FormField Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard form field with label, required, error, and help text.
 */

import { Form } from "antd";
import type { Rule } from "antd/es/form";
import { ReactNode } from "react";

export type FormFieldProps = {
  /** Field label */
  label: string;
  /** Field content */
  children: ReactNode;
  /** Field name for Form.Item */
  name?: string | number | (string | number)[];
  /** Required indicator */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Help text */
  help?: string;
  /** Additional rules */
  rules?: Rule[];
  /** Label width */
  labelWidth?: number | "auto";
  /** Span full width */
  fullWidth?: boolean;
};

export default function FormField({
  label,
  children,
  name,
  required,
  error,
  help,
  rules,
  labelWidth,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <Form.Item
      name={name}
      label={label}
      required={required}
      help={error || help}
      validateStatus={error ? "error" : undefined}
      rules={rules}
      labelCol={{ style: { width: labelWidth || 120 } }}
      wrapperCol={{ style: { flex: 1 } }}
      style={{ width: fullWidth ? "100%" : undefined }}
    >
      {children}
    </Form.Item>
  );
}