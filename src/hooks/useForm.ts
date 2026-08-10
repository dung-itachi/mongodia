"use client";

import { Form } from "antd";
import { useEffect, useState } from "react";

type FormInstanceAny = ReturnType<typeof Form.useForm>[0];

export type CustomFormInstance = FormInstanceAny;

/**
 * useForm returns a stable FormInstance compatible with Ant Design.
 * The wrapper defers exposing the form instance until after mount to avoid
 * Turbopack re-mount flakiness with Form.useForm.
 */
export function useForm<T = unknown>(): [CustomFormInstance, () => void] {
  const [form] = Form.useForm<T>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return [mounted ? (form as FormInstanceAny) : (form as FormInstanceAny), () => {}];
}

export { Form };
export const useAntForm = Form.useForm;
