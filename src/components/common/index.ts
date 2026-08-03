/**
 * Common Components Index (Sprint 3.1 - Complete UI Kit)
 *
 * Central export point for all common UI components.
 *
 * Folder Structure:
 * - buttons/    → ActionButton
 * - cards/      → StatCard, StatGrid, CardSection
 * - charts/     → ChartContainer
 * - display/    → SectionTitle, Metric, InfoItem, DescriptionList, StatusBadge, EmptyState
 * - feedback/   → ConfirmDialog, Toast
 * - filters/    → FilterBar, FilterSelect, FilterDate, FilterDateRange, FilterInput
 * - forms/      → FormField, FieldGroup, FormSection, DrawerForm
 * - inputs/     → SearchInput, DateRangePicker, AsyncSelect, UploadImage
 * - layout/     → PageContainer, PageHeader
 * - overlay/    → LoadingOverlay, SkeletonCard, SkeletonTable, SkeletonForm
 * - table/      → DataTable, TableToolbar, PaginationComponent, ToolbarActions, CardActions
 */

// Buttons
export * from "./buttons";

// Cards
export * from "./cards";

// Charts
export * from "./charts";

// Display
export * from "./display";

// Feedback
export * from "./feedback";

// Filters
export * from "./filters";

// Forms
export * from "./forms";

// Inputs
export * from "./inputs";

// Layout
export * from "./layout";

// Overlay
export * from "./overlay";

// Table
export * from "./table";

// PermissionGate
export { default as PermissionGate } from "./PermissionGate";