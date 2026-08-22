"use client";

/**
 * ==================================================
 * FIELD ORDER PREVIEW
 * ==================================================
 *
 * Hiển thị **thứ tự các trường** mà hệ thống sẽ parse từ textarea
 * khi user bấm "Phân loại" trong Marketing Input Section.
 *
 * Mục đích: giúp user dán đúng cột → đỡ phải đoán → staging đúng dữ liệu.
 *
 * Format dữ liệu dán vào (phân cách bằng TAB):
 *   - Comment mode:  [SĐT]   [Tên]
 *   - Landing mode:  [Ngày]  [Tên]  [SĐT]  [Địa chỉ]  [Combo/Giá]
 *
 * TODO: Tương lai nếu muốn user tự cấu hình thứ tự cột, dời các config
 * dưới đây ra 1 file constants/columnLayouts.ts.
 */

import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "./FieldOrderPreview.module.css";

export type InputType = "comment" | "ladi";

export interface FieldSpec {
  key: string;
  label: string;
  /** Bắt buộc hay không. */
  required: boolean;
}

const COMMENT_FIELDS: FieldSpec[] = [
  { key: "name", label: "Tên", required: false },
  { key: "phone", label: "SĐT", required: true },
  { key: "address", label: "Địa chỉ", required: false },
  { key: "combo", label: "Combo", required: false },
  { key: "product", label: "Sản phẩm", required: false },
];

const LADI_FIELDS: FieldSpec[] = [
  { key: "date", label: "Ngày", required: false },
  { key: "name", label: "Tên", required: false },
  { key: "phone", label: "SĐT", required: true },
  { key: "address", label: "Địa chỉ", required: false },
  { key: "combo", label: "Combo", required: false },
  { key: "product", label: "Sản phẩm", required: false },
];

const EXAMPLE_BY_MODE: Record<InputType, string> = {
  comment:
    "Гантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYE",
  ladi: "2026-08-15\tГантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYE",
};

const MODE_LABEL: Record<InputType, string> = {
  comment: "Comment",
  ladi: "Landing",
};

export interface FieldOrderPreviewProps {
  inputType: InputType;
}

export default function FieldOrderPreview({ inputType }: FieldOrderPreviewProps) {
  const lang = useLanguageStore((s) => s.language);
  const fields = inputType === "comment" ? COMMENT_FIELDS : LADI_FIELDS;
  const example = EXAMPLE_BY_MODE[inputType];
  const modeLabel = MODE_LABEL[inputType];

  return (
    <div>
      <div className={styles.previewTitle}>
        {t("Thứ tự cột khi phân loại", lang)}
        <span className={styles.previewMode}>{modeLabel}</span>
      </div>

      {/* Field chips */}
      <div className={styles.previewList}>
        {fields.map((f, idx) => (
          <span key={f.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              className={`${styles.fieldChip} ${
                f.required ? styles.required : styles.optional
              }`}
              title={f.required ? t("Bắt buộc", lang) : t("Tùy chọn", lang)}
            >
              {idx + 1}. {f.label}
            </span>
            {idx < fields.length - 1 && <span className={styles.separator}>›</span>}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.required}`} />
          {t("Bắt buộc", lang)}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.optional}`} />
          {t("Tùy chọn", lang)}
        </span>
      </div>

      {/* Example — hiển thị dạng TAB-separated (đúng như user paste) */}
      <div className={styles.exampleBlock}>
        <div className={styles.exampleLabel}>{t("Ví dụ", lang)}</div>

        {/* Raw row — copy/paste được luôn */}
        <div className={styles.exampleRaw}>{example}</div>

        {/* Annotation: đánh số cột ngay trên raw */}
        <div className={styles.exampleAnnot}>
          {fields.map((f, idx) => (
            <span key={f.key} className={styles.exampleAnnotItem}>
              <span className={styles.exampleAnnotIdx}>{idx + 1}</span>
              <span
                className={`${styles.exampleAnnotLabel} ${
                  f.key === "address" ? styles.addressAccent : ""
                }`}
              >
                {f.label}
              </span>
            </span>
          ))}
        </div>

        {/* Per-column breakdown */}
        <div className={styles.exampleBreakdown}>
          {fields.map((f, idx) => {
            const value = example.split("\t")[idx] ?? "";
            return (
              <div key={f.key} className={styles.exampleLine}>
                <span className={styles.exampleIdx}>{idx + 1}.</span>
                <span
                  className={`${styles.exampleField} ${
                    f.key === "address" ? styles.addressAccent : ""
                  }`}
                >
                  {f.label}:
                </span>
                <span className={styles.exampleValue}>{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
