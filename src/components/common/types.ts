/**
 * Common Component Types (Sprint 3.1 - Complete UI Kit)
 */

import type { InputProps, TableProps, TablePaginationConfig } from "antd";
import type { ReactNode } from "react";

// ============================================
// SearchInput
// ============================================
export type SearchInputProps = Omit<InputProps, "onChange"> & {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  debounce?: number;
};

// ============================================
// FilterBar
// ============================================
export type FilterItem =
  | {
      type: "select";
      key: string;
      label: string;
      options: { label: string; value: string | number }[];
      placeholder?: string;
      multiple?: boolean;
    }
  | {
      type: "date";
      key: string;
      label: string;
    }
  | {
      type: "dateRange";
      key: string;
      label: string;
    }
  | {
      type: "input";
      key: string;
      label: string;
      placeholder?: string;
    };

export type FilterBarProps = {
  items: FilterItem[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  loading?: boolean;
};

// ============================================
// StatusBadge
// ============================================
export type StatusConfig = {
  color: string;
  backgroundColor: string;
  label: string;
};

export type StatusBadgeProps = {
  status: string;
  mapping?: Record<string, StatusConfig>;
  size?: "small" | "default";
};

// ============================================
// ActionButton
// ============================================
export type ActionButtonProps = {
  type?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  htmlType?: "button" | "submit" | "reset";
  size?: "small" | "middle" | "large";
};

// ============================================
// TableToolbar
// ============================================
export type TableToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  selectedCount?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  loading?: boolean;
};

// ============================================
// DataTable
// ============================================
export type DataTableColumn = {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, record: Record<string, unknown>, index: number) => ReactNode;
};

export type DataTableProps = {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  rowKey?: string | ((record: Record<string, unknown>) => string);
  onChange?: TableProps<Record<string, unknown>>["onChange"];
  rowSelection?: TableProps<Record<string, unknown>>["rowSelection"];
  emptyText?: string;
  scroll?: { x?: number | string; y?: number | string };
  size?: "small" | "middle" | "large";
};

// ============================================
// Pagination
// ============================================
export type PaginationProps = {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: string[];
  showTotal?: (total: number) => ReactNode;
};

// ============================================
// EmptyState
// ============================================
export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

// ============================================
// LoadingOverlay
// ============================================
export type LoadingOverlayProps = {
  text?: string;
  fullScreen?: boolean;
};

// ============================================
// ConfirmDialog
// ============================================
export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  content: string;
  type?: "delete" | "warning" | "confirm";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// ============================================
// DrawerForm
// ============================================
export type DrawerFormProps = {
  open: boolean;
  title: string;
  width?: number | string;
  loading?: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  footer?: ReactNode;
  children: ReactNode;
};

// ============================================
// FormSection
// ============================================
export type FormSectionProps = {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

// ============================================
// CardSection
// ============================================
export type CardSectionProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  noPadding?: boolean;
};

// ============================================
// PageContainer
// ============================================
export type PageContainerProps = {
  children: ReactNode;
  className?: string;
  padding?: boolean;
};

// ============================================
// StatCard
// ============================================
export type StatTrend = "up" | "down" | "neutral";
export type StatColor =
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "default";

export type StatCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: StatColor;
  loading?: boolean;
  trend?: {
    value: number | string;
    direction: StatTrend;
  };
  suffix?: string;
  prefix?: string;
};

export type StatGridProps = {
  children: ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
};

// ============================================
// SkeletonCard
// ============================================
export type SkeletonCardProps = {
  rows?: number;
  avatar?: boolean;
  title?: boolean;
  active?: boolean;
};

// ============================================
// SkeletonTable
// ============================================
export type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  active?: boolean;
};

// ============================================
// SkeletonForm
// ============================================
export type SkeletonFormProps = {
  groups?: number;
  fieldsPerGroup?: number;
  showButton?: boolean;
  active?: boolean;
};

// ============================================
// SectionTitle
// ============================================
export type SectionTitleProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  showDivider?: boolean;
};

// ============================================
// Metric
// ============================================
export type MetricTrend = "up" | "down" | "neutral";
export type MetricProps = {
  label: string;
  value: string | number;
  previousValue?: string | number;
  trend?: MetricTrend;
  trendValue?: string | number;
  icon?: ReactNode;
  valueColor?: string;
  labelColor?: string;
  compact?: boolean;
};

// ============================================
// InfoItem
// ============================================
export type InfoItemProps = {
  label: string;
  value?: ReactNode;
  valueColor?: string;
  labelColor?: string;
  fullWidth?: boolean;
};

// ============================================
// DescriptionList
// ============================================
export type DescriptionListProps = {
  items: {
    label: string;
    value?: ReactNode;
    span?: number;
  }[];
  columns?: number;
  gutter?: number;
  title?: string;
  actions?: ReactNode;
  size?: "small" | "default";
};

// ============================================
// DateRangePicker
// ============================================
export type DatePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisWeek"
  | "thisMonth"
  | "custom";

export type DateRangePickerProps = {
  value?: [string, string] | undefined;
  onChange?: (value: [string, string] | undefined) => void;
  showPresets?: boolean;
  format?: string;
};

// ============================================
// AsyncSelect
// ============================================
export type SelectOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

export type AsyncSelectProps = {
  value?: string | number | undefined;
  onChange?: (value: string | number | undefined) => void;
  options?: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  loading?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  mode?: "multiple" | "tags";
  style?: React.CSSProperties;
  minSearchChars?: number;
  onSearch?: (value: string) => void;
  maxCount?: number;
};

// ============================================
// UploadImage
// ============================================
export type UploadImageType = "avatar" | "product" | "facebook";
export type UploadImageProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  type?: UploadImageType;
  maxSize?: number;
  accept?: string;
  disabled?: boolean;
};

// ============================================
// FormField
// ============================================
export type FormFieldProps = {
  label: string;
  children: ReactNode;
  name?: string | number | (string | number)[];
  required?: boolean;
  error?: string;
  help?: string;
  rules?: unknown[];
  labelWidth?: number | "auto";
  fullWidth?: boolean;
};

// ============================================
// FieldGroup
// ============================================
export type FieldGroupProps = {
  children: ReactNode;
  columns?: number;
  gutter?: number;
  className?: string;
};

// ============================================
// ToolbarActions
// ============================================
export type ToolbarActionsProps = {
  onCreate?: () => void;
  createText?: string;
  extra?: ReactNode;
  loading?: boolean;
};

// ============================================
// CardActions
// ============================================
export type CardActionsProps = {
  children: ReactNode;
};

// ============================================
// ChartContainer
// ============================================
export type ChartContainerProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  height?: number;
  className?: string;
};

// ============================================
// PermissionGate
// ============================================
export type PermissionGateProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

// ============================================
// PageHeader
// ============================================
export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  loading?: boolean;
};