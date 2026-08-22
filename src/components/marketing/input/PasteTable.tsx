"use client";

/**
 * ==================================================
 * PASTE TABLE — Sprint 8.x Nâng cấp dán số
 * ==================================================
 *
 * Component hiển thị bảng Excel-like cho phép:
 * - Header columns động theo cấu hình cột
 * - Paste dữ liệu trực tiếp vào bảng
 * - Toggle giữa chế độ bảng và textarea
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Tooltip } from "antd";
import { TableOutlined, EditOutlined } from "@ant-design/icons";
import styles from "./PasteTable.module.css";
import { COLUMN_FIELDS, type ColumnFieldKey } from "./columnLayouts";

/** Map field key → label ngắn */
const COLUMN_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  COLUMN_FIELDS.map((f) => [f.key, f.label])
);

export interface PasteTableProps {
  inputType: "comment" | "ladi";
  layout: ColumnFieldKey[];
  value: string;
  onChange: (value: string) => void;
}

interface CellData {
  row: number;
  col: number;
  value: string;
}

export default function PasteTable({
  inputType,
  layout,
  value,
  onChange,
}: PasteTableProps) {
  const [useTableMode, setUseTableMode] = useState(false);
  const [cells, setCells] = useState<CellData[]>([]);
  const [rowCount, setRowCount] = useState(3);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // Mirror của `cells` để truy cập giá trị mới nhất trong cùng tick
  // (setCells với updater callback chưa trả về giá trị mới ngay).
  const cellsRef = useRef<CellData[]>([]);
  // Theo dõi giá trị cuối cùng mà component đã đẩy lên parent qua `onChange`.
  // Dùng để tránh echo: useEffect value→cells chỉ sync khi value thay đổi từ BÊN NGOÀI,
  // không phải do chính component tạo ra.
  const lastPropagatedValueRef = useRef<string>(value);

  // ----- value → cells (chỉ khi value đổi từ bên ngoài) -----
  useEffect(() => {
    // Echo từ chính `onChange` của component → bỏ qua.
    if (value === lastPropagatedValueRef.current) return;
    lastPropagatedValueRef.current = value;

    // Textarea mode không dùng `cells` → bỏ qua để tránh re-parse mỗi keystroke.
    if (!useTableMode) return;

    if (!value.trim()) {
      cellsRef.current = [];
      setCells([]);
      setRowCount(3);
      return;
    }

    const lines = value.split("\n").filter((l) => l.trim());
    const newCells: CellData[] = [];

    lines.forEach((line, rowIdx) => {
      const cols = line.split("\t");
      cols.forEach((cell, colIdx) => {
        newCells.push({ row: rowIdx, col: colIdx, value: cell });
      });
    });

    cellsRef.current = newCells;
    setCells(newCells);
    setRowCount(Math.max(3, lines.length + 2));
  }, [value, useTableMode]);

  // ----- cells → value (gọi trực tiếp từ event handlers, KHÔNG qua useEffect) -----
  // Nếu dùng useEffect với deps=[cells] sẽ gây feedback loop vô tận với effect trên.
  const buildValueFromCells = useCallback(
    (cellsList: CellData[]): string => {
      if (cellsList.length === 0) return "";
      const maxRow = Math.max(...cellsList.map((c) => c.row)) + 1;
      const maxCol = layout.length;
      const lines: string[] = [];

      for (let r = 0; r < maxRow; r++) {
        const rowCells: string[] = [];
        for (let c = 0; c < maxCol; c++) {
          const cell = cellsList.find(
            (cell) => cell.row === r && cell.col === c
          );
          rowCells.push(cell?.value ?? "");
        }
        // Only add row if at least one cell has value
        if (rowCells.some((v) => v.trim())) {
          lines.push(rowCells.join("\t"));
        }
      }

      return lines.join("\n");
    },
    [layout]
  );

  const propagateCells = useCallback(
    (nextCells: CellData[]) => {
      const nextValue = buildValueFromCells(nextCells);
      // Cập nhật ref TRƯỚC khi gọi onChange để useEffect value→cells ở trên
      // nhận diện đây là echo và không trigger lại setCells.
      lastPropagatedValueRef.current = nextValue;
      onChange(nextValue);
    },
    [buildValueFromCells, onChange]
  );

  // Handle paste event on the table
  const handleTablePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim());
      const newCells: CellData[] = [];

      lines.forEach((line, rowIdx) => {
        const cols = line.split("\t");
        cols.forEach((cell, colIdx) => {
          newCells.push({ row: rowIdx, col: colIdx, value: cell });
        });
      });

      cellsRef.current = newCells;
      setCells(newCells);
      setRowCount(Math.max(3, lines.length + 3));
      propagateCells(newCells);
    },
    [propagateCells]
  );

  // Update a single cell
  const updateCell = useCallback(
    (row: number, col: number, newValue: string) => {
      const prev = cellsRef.current;
      const existing = prev.findIndex(
        (c) => c.row === row && c.col === col
      );
      const next =
        existing >= 0
          ? prev.map((c, i) =>
              i === existing ? { ...c, value: newValue } : c
            )
          : [...prev, { row, col, value: newValue }];

      cellsRef.current = next;
      setCells(next);
      propagateCells(next);
    },
    [propagateCells]
  );

  // Add more rows
  const addRows = useCallback(
    (count: number) => {
      setRowCount((prev) => prev + count);
    },
    []
  );

  // Get cell value
  const getCellValue = useCallback(
    (row: number, col: number): string => {
      const cell = cells.find((c) => c.row === row && c.col === col);
      return cell?.value ?? "";
    },
    [cells]
  );

  // Get example placeholder
  const getPlaceholder = (col: number): string => {
    const fieldKey = layout[col];
    const placeholders: Record<string, string> = {
      date: "Thời gian",
      name: "Tên khách",
      phone: "Số điện thoại",
      address: "Địa chỉ",
      combo: "Combo/Giá",
      product: "Sản phẩm",
      facebookPage: "FB Page",
    };
    return placeholders[fieldKey] ?? COLUMN_FIELD_LABELS[fieldKey] ?? "";
  };

  const modeLabel = inputType === "comment" ? "Comment" : "Landing";

  return (
    <div className={styles.container}>
      {/* Header với toggle mode */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.modeLabel}>{modeLabel}</span>
          <span className={styles.headerLabel}>Cấu trúc dán số</span>
        </div>
        <div className={styles.toggleGroup}>
          <Tooltip title="Chế độ bảng Excel">
            <Button
              type={useTableMode ? "primary" : "default"}
              size="small"
              icon={<TableOutlined />}
              onClick={() => setUseTableMode(true)}
              className={useTableMode ? styles.toggleActive : ""}
            >
              Bảng
            </Button>
          </Tooltip>
          <Tooltip title="Chế độ văn bản">
            <Button
              type={!useTableMode ? "primary" : "default"}
              size="small"
              icon={<EditOutlined />}
              onClick={() => setUseTableMode(false)}
              className={!useTableMode ? styles.toggleActive : ""}
            >
              Text
            </Button>
          </Tooltip>
        </div>
      </div>

      {useTableMode ? (
        /* ========== TABLE MODE ========== */
        <div
          ref={tableRef}
          className={styles.tableWrapper}
          onPaste={handleTablePaste}
          tabIndex={0}
        >
          <table className={styles.pasteTable}>
            <thead>
              <tr>
                <th className={styles.rowNumHeader}>#</th>
                {layout.map((fieldKey, idx) => (
                  <th key={fieldKey} className={styles.headerCell}>
                    <div className={styles.headerCellContent}>
                      <span className={styles.headerNum}>{idx + 1}</span>
                      <span className={styles.headerLabel}>
                        {COLUMN_FIELD_LABELS[fieldKey] ?? fieldKey}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <tr key={rowIdx} className={styles.dataRow}>
                  <td className={styles.rowNum}>{rowIdx + 1}</td>
                  {layout.map((fieldKey, colIdx) => (
                    <td key={fieldKey} className={styles.cell}>
                      <input
                        type="text"
                        className={styles.cellInput}
                        value={getCellValue(rowIdx, colIdx)}
                        onChange={(e) =>
                          updateCell(rowIdx, colIdx, e.target.value)
                        }
                        placeholder={getPlaceholder(colIdx)}
                        onPaste={(e) => {
                          // Handle paste into single cell
                          e.preventDefault();
                          const text = e.clipboardData.getData("text/plain");
                          const parts = text.split("\t");
                          parts.forEach((part, i) => {
                            updateCell(rowIdx, colIdx + i, part);
                          });
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paste hint */}
          <div className={styles.pasteHint}>
            <span>Paste dữ liệu vào bảng hoặc nhấn Ctrl+V ở bảng này</span>
            <Button
              size="small"
              onClick={() => addRows(5)}
              className={styles.addRowBtn}
            >
              + Thêm dòng
            </Button>
          </div>
        </div>
      ) : (
        /* ========== TEXTAREA MODE ========== */
        <textarea
          ref={textareaRef}
          className={styles.textArea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Nhập dữ liệu (TAB separated):\n${layout.map((k) => COLUMN_FIELD_LABELS[k]).join("\t")}\n\nVí dụ:\n${layout.map((k) => getPlaceholder(layout.indexOf(k))).join("\t")}`}
          rows={4}
        />
      )}

      {/* Quick reference */}
      <div className={styles.reference}>
        <span className={styles.refLabel}>Cấu hình:</span>
        <div className={styles.refChips}>
          {layout.map((key, idx) => (
            <span key={key} className={styles.refChip}>
              <span className={styles.refNum}>{idx + 1}</span>
              {COLUMN_FIELD_LABELS[key]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
