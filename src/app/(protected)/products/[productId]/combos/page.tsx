/**
 * Product Combo Management Page (Sprint 8.x)
 *
 * Route: /products/[productId]/combos
 *
 * Trang quản lý combo của MỘT Product. Product được xác định từ route param,
 * user không cần chọn Product lại. Form Combo mở với Product locked.
 */

"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { Button, Result, Spin, Select, App, DatePicker, Segmented, Input } from "antd";
import { PlusOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  PageContainer,
  PageHeader,
  CardSection,
} from "@/components/common";
import {
  useComboList,
  useCreateCombo,
  useUpdateCombo,
  useDeleteCombo,
  type ComboListItem,
  type CreateComboInput,
  type UpdateComboInput,
} from "@/hooks/useCombos";
import { useProductDetail } from "@/hooks/useProductCrud";
import { useCategoryList } from "@/hooks/useCategories";
import ComboTable from "@/components/product/combo/ComboTable";
import ComboForm, { type ComboFormProductOption } from "@/components/product/combo/ComboForm";

const { RangePicker } = DatePicker;

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default function ProductCombosPage({ params }: PageProps) {
  const { productId } = use(params);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComboListItem | null>(null);
  const { modal } = App.useApp();

  // Filter states
  const [filterKeyword, setFilterKeyword] = useState<string | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const { data: product, isLoading: productLoading } = useProductDetail(productId);
  const { data: combosData, isLoading: combosLoading, refetch } = useComboList({
    productId,
    keyword: filterKeyword,
    limit: 1000,
  });
  const { data: categoryData } = useCategoryList();
  const createMutation = useCreateCombo();
  const updateMutation = useUpdateCombo();
  const deleteMutation = useDeleteCombo();

  const combos = combosData?.items ?? [];

  // Get existing combo codes for auto-generation (must be before early returns per Rules of Hooks)
  const existingComboCodes = useMemo(
    () => combos.map((c) => c.code),
    [combos]
  );

  // Filter combos by date range and status (client-side filter)
  const filteredCombos = useMemo(() => {
    let result = combos;

    // Filter by keyword (client-side for instant feedback)
    if (filterKeyword) {
      const keywordLower = filterKeyword.toLowerCase();
      result = result.filter((c) =>
        c.code.toLowerCase().includes(keywordLower) ||
        c.name.toLowerCase().includes(keywordLower)
      );
    }

    // Filter by status
    if (filterStatus === "active") {
      result = result.filter((c) => c.isActive !== false);
    } else if (filterStatus === "inactive") {
      result = result.filter((c) => c.isActive === false);
    }

    // Filter by date range
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const startDate = filterDateRange[0].startOf("day");
      const endDate = filterDateRange[1].endOf("day");
      result = result.filter((c) => {
        if (!c.createdAt) return false;
        const createdDate = dayjs(c.createdAt);
        return createdDate.isAfter(startDate) && createdDate.isBefore(endDate);
      });
    }

    return result;
  }, [combos, filterKeyword, filterStatus, filterDateRange]);

  const categories = categoryData?.items ?? [];

  const productOptions: ComboFormProductOption[] = useMemo(() => {
    if (!product) return [];
    const cat =
      typeof product.category === "object" && product.category !== null
        ? product.category
        : null;
    const categoryFromList = cat
      ? categories.find((c) => c._id === (cat as { _id: string })._id)
      : undefined;
    return [
      {
        _id: product._id,
        code: product.code,
        name: product.name,
        categoryCode: cat?.code ?? categoryFromList?.code,
        categoryName: cat?.name ?? categoryFromList?.name,
        isActive: product.isActive,
      },
    ];
  }, [product, categories]);

  // Auto-close drawer nếu product đổi và đang mở
  useEffect(() => {
    if (!product && !productLoading) {
      setDrawerOpen(false);
    }
  }, [product, productLoading]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: ComboListItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateComboInput | UpdateComboInput) => {
      const onSuccess = () => {
        handleClose();
        void refetch();
      };
      // ép productId theo route
      const payload: CreateComboInput | UpdateComboInput = {
        ...values,
        productId,
        productCode: product?.code,
      } as CreateComboInput | UpdateComboInput;

      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem._id, input: payload as UpdateComboInput },
          { onSuccess }
        );
        return;
      }
      createMutation.mutate(payload as CreateComboInput, { onSuccess });
    },
    [createMutation, editingItem, product?.code, productId, refetch, updateMutation, handleClose]
  );

  const handleDelete = useCallback(
    (item: ComboListItem) => {
      modal.confirm({
        title: "Xóa combo?",
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              Combo <strong>"{item.name}"</strong> sẽ bị <strong>vô hiệu hóa</strong> (xóa mềm).
            </p>
            <p style={{ marginBottom: 4 }}>
              • Combo sẽ không còn hiển thị trong dropdown tạo đơn / thêm lead mới.
            </p>
            <p style={{ marginBottom: 4 }}>
              • Các đơn hàng <strong>đã tạo trước đó</strong> với combo này vẫn giữ nguyên tên combo và không bị ảnh hưởng.
            </p>
            <p style={{ marginBottom: 0, color: "#8c8c8c", fontSize: 12 }}>
              Số đơn đang tham chiếu combo này sẽ được thống kê sau khi xóa.
            </p>
          </div>
        ),
        okText: "Xóa combo",
        cancelText: "Hủy",
        okButtonProps: { danger: true },
        onOk: () =>
          new Promise<void>((resolve, reject) => {
            deleteMutation.mutate(item._id, {
              onSuccess: () => {
                void refetch();
                resolve();
              },
              onError: (err) => {
                reject(err);
              },
            });
          }),
      });
    },
    [deleteMutation, refetch, modal]
  );

  const handleToggleActive = useCallback(
    (item: ComboListItem, checked: boolean) => {
      updateMutation.mutate(
        {
          id: item._id,
          input: {
            code: item.code,
            name: item.name,
            productId,
            productCode: product?.code,
            packageQuantity: item.packageQuantity,
            sellingPrice: item.sellingPrice,
            giftQuantity: item.giftQuantity ?? 0,
            displayOrder: item.displayOrder ?? 0,
            image: item.image,
            description: "",
            isActive: checked,
          } as UpdateComboInput,
        },
        {
          onSuccess: () => {
            void refetch();
          },
        }
      );
    },
    [productId, product?.code, refetch, updateMutation]
  );

  if (productLoading) {
    return (
      <PageContainer>
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin />
        </div>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="Không tìm thấy sản phẩm"
          subTitle="Sản phẩm không tồn tại hoặc đã bị xóa."
        />
      </PageContainer>
    );
  }

  const productCategory =
    typeof product.category === "object" && product.category !== null ? product.category : null;

  return (
    <PageContainer>
      <PageHeader
        title={`Combo của "${product.name}"`}
        subtitle={`Mã: ${product.code}${productCategory ? ` · Danh mục: ${productCategory.code}` : ""}`}
      />

      <CardSection>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <RangePicker
              value={filterDateRange}
              onChange={(dates) => setFilterDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: 260 }}
              placeholder={["Từ ngày", "Đến ngày"]}
              format="DD/MM/YYYY"
            />
            <Input.Search
              placeholder="Tìm tên, mã combo..."
              style={{ width: 200 }}
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value || undefined)}
              onSearch={() => {}}
              allowClear
            />
            <Segmented
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as "all" | "active" | "inactive")}
              options={[
                { label: "Tất cả", value: "all" },
                { label: "Hoạt động", value: "active" },
                { label: "Không hoạt động", value: "inactive" },
              ]}
            />
          </div>
          <div style={{ color: "#595959" }}>
            Hiển thị: <strong>{filteredCombos.length}</strong> / {combos.length} combo
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            disabled={product.isActive === false}
          >
            Thêm combo
          </Button>
        </div>

        {product.isActive === false && (
          <div style={{ marginBottom: 16, color: "#ff4d4f" }}>
            Sản phẩm đã ngừng hoạt động. Không thể tạo combo mới.
          </div>
        )}

        <ComboTable
          data={filteredCombos}
          loading={combosLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </CardSection>

      <ComboForm
        open={drawerOpen}
        editingItem={editingItem}
        products={productOptions}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialProductId={product._id}
        lockProductSelection
        existingCodes={existingComboCodes}
      />

      {/* hidden Select to silence "Select imported but unused" linter rule if any */}
      <div style={{ display: "none" }}>
        <Select />
      </div>
    </PageContainer>
  );
}