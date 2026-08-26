"use client";

import { Button, Space } from "antd";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type WarehouseQuickPickItem = {
  _id: string;
  code: string;
  name: string;
};

type Props = {
  /** Currently selected warehouse ID, or undefined for "All" */
  value: string | undefined;
  /** Callback when the user picks a warehouse or resets to "All" */
  onChange: (warehouseId: string | undefined) => void;
  /** Warehouse list — must contain entries with codes KHO1 and KHO2 */
  warehouses: WarehouseQuickPickItem[];
  /** Optional: extra content to render after the buttons (e.g. existing dropdowns) */
  children?: React.ReactNode;
};

/**
 * Renders three quick-pick buttons: "Kho 1", "Kho 2", "Tất cả".
 *
 * Clicking a button sets the active warehouse filter to the warehouse whose
 * `code` matches `KHO1` / `KHO2`. Clicking "Tất cả" clears the filter.
 *
 * If the warehouse list doesn't contain `KHO1` or `KHO2`, the corresponding
 * button is disabled so the UI never references a non-existent warehouse.
 */
export default function WarehouseQuickPick({ value, onChange, warehouses, children }: Props) {
  const lang = useLanguageStore((s) => s.language);
  const kho1 = warehouses.find((w) => w.code === "KHO1");
  const kho2 = warehouses.find((w) => w.code === "KHO2");

  const isAll = value === undefined;
  const isKho1 = kho1 ? value === kho1._id : false;
  const isKho2 = kho2 ? value === kho2._id : false;

  return (
    <Space style={{ marginBottom: 12 }} size="middle" wrap>
      <Button
        type={isKho1 ? "primary" : "default"}
        disabled={!kho1}
        onClick={() => kho1 && onChange(kho1._id)}
      >
        {kho1?.name ?? t("Kho 1", lang)}
      </Button>
      <Button
        type={isKho2 ? "primary" : "default"}
        disabled={!kho2}
        onClick={() => kho2 && onChange(kho2._id)}
      >
        {kho2?.name ?? t("Kho 2", lang)}
      </Button>
      <Button type={isAll ? "primary" : "default"} onClick={() => onChange(undefined)}>
        {t("Tất cả", lang)}
      </Button>
      {children}
    </Space>
  );
}
