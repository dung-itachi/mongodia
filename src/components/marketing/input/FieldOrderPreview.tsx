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

import styles from "./FieldOrderPreview.module.css";

export type InputType = "comment" | "ladi";

export interface FieldSpec {
  key: string;
  label: string;
  /** Bắt buộc hay không. */
  required: boolean;
}

const COMMENT_FIELDS: FieldSpec[] = [
  { key: "phone", label: "SĐT", required: true },
  { key: "name", label: "Tên", required: false },
];

const LADI_FIELDS: FieldSpec[] = [
  { key: "date", label: "Ngày", required: false },
  { key: "name", label: "Tên", required: false },
  { key: "phone", label: "SĐT", required: true },
  { key: "address", label: "Địa chỉ", required: false },
  { key: "combo", label: "Combo/Giá", required: false },
];

const EXAMPLE_BY_MODE: Record<InputType, string> = {
  comment: "0123456789\tNguyễn Văn A\n0987654321\tTrần Thị B",
  ladi: "2025-08-15\tNguyễn Văn A\t0123456789\tHà Nội\tCombo A 99,000₮",
};

const MODE_LABEL: Record<InputType, string> = {
  comment: "Comment",
  ladi: "Landing",
};

export interface FieldOrderPreviewProps {
  inputType: InputType;
}

export default function FieldOrderPreview({ inputType }: FieldOrderPreviewProps) {
  const fields = inputType === "comment" ? COMMENT_FIELDS : LADI_FIELDS;
  const example = EXAMPLE_BY_MODE[inputType];
  const modeLabel = MODE_LABEL[inputType];

  return (
    <div>
      <div className={styles.previewTitle}>
        Thứ tự cột khi phân loại
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
              title={f.required ? "Bắt buộc" : "Tùy chọn"}
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
          Bắt buộc
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.optional}`} />
          Tùy chọn
        </span>
      </div>

      {/* Example */}
      <div className={styles.exampleRow}>{example}</div>
    </div>
  );
}
