"use client";

/**
 * ==================================================
 * CUSTOMER DETAIL PAGE
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Display customer details with:
 * - General Information
 * - Lead Source
 * - Marketing & Sale
 * - Orders (read from OrderRepository)
 * - Revenue Summary
 * - Timeline (Customer Activities)
 */

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, Button, Tag, Tabs } from "antd";
import {
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  HomeOutlined,
  FacebookOutlined,
  MessageOutlined,
  ShoppingOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonCard from "@/components/common/overlay/SkeletonCard";
import PermissionGate from "@/components/common/PermissionGate";
import CustomerTimeline from "@/components/customer/CustomerTimeline";

import {
  useCustomer,
  useCustomerStatistics,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { CustomerStatus } from "@/types/customer";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  [CustomerStatus.ACTIVE]: "green",
  [CustomerStatus.INACTIVE]: "default",
  [CustomerStatus.BLOCKED]: "red",
};

const STATUS_LABELS: Record<string, string> = {
  [CustomerStatus.ACTIVE]: "Hoạt động",
  [CustomerStatus.INACTIVE]: "Không hoạt động",
  [CustomerStatus.BLOCKED]: "Bị chặn",
};

export default function CustomerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);

  // Fetch customer
  const { customer, loading, error, refetch } = useCustomer(id);

  // Fetch statistics
  const { statistics } = useCustomerStatistics(id);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteMutation = useDeleteCustomer();

  const handleDelete = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
      message.success(t("Xóa khách hàng thành công", lang));
      router.push("/customers");
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("Xóa khách hàng thất bại", lang));
    } finally {
      setDeleteLoading(false);
    }
  }, [id, deleteMutation, router, lang, message]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title={t("Đang tải...", lang)} />
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (error || !customer) {
    return (
      <PageContainer>
        <PageHeader title={t("Không tìm thấy khách hàng", lang)} />
        <EmptyState
          title={t("Không tìm thấy khách hàng", lang)}
          description={t("Khách hàng này có thể đã bị xóa hoặc không tồn tại", lang)}
        />
      </PageContainer>
    );
  }

  const statusColor = STATUS_COLORS[customer.status] || "default";
  const statusLabel = STATUS_LABELS[customer.status] || customer.status;

  return (
    <PageContainer>
      <PageHeader
        title={customer.fullName}
        subtitle={`${t("Mã khách hàng:", lang)} ${customer.customerCode}`}
        actions={
          <div className="flex gap-2">
            <PermissionGate permission="customer.update">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/customers/${id}/edit`)}
              >
                {t("Chỉnh sửa", lang)}
              </Button>
            </PermissionGate>
            <PermissionGate permission="customer.delete">
              <Button
                danger
                onClick={handleDelete}
                loading={deleteLoading}
              >
                {t("Xóa", lang)}
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Status and basic info */}
        <CardSection title={t("Trạng thái", lang)}>
          <div className="flex items-center gap-4">
            <Tag color={statusColor} className="text-base px-3 py-1">
              {t(statusLabel, lang)}
            </Tag>
          </div>
        </CardSection>

        {/* Tabs for detail sections */}
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: "info",
              label: t("Thông tin chung", lang),
              children: (
                <Row gutter={24}>
                  {/* Contact Information */}
                  <Col span={12}>
                    <CardSection title={t("Thông tin liên hệ", lang)}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <UserOutlined className="text-gray-400" />
                          <span className="font-medium">{customer.fullName}</span>
                          {customer.gender && (
                            <Tag>{customer.gender === "male" ? t("Nam", lang) : customer.gender === "female" ? t("Nữ", lang) : t("Khác", lang)}</Tag>
                          )}
                        </div>
                        {customer.birthday && (
                          <div className="flex items-center gap-3">
                            <CalendarOutlined className="text-gray-400" />
                            <span>{t("Sinh nhật:", lang)} {formatDate(customer.birthday)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <PhoneOutlined className="text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-3">
                            <MailOutlined className="text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.facebook && (
                          <div className="flex items-center gap-3">
                            <FacebookOutlined className="text-gray-400" />
                            <a href={customer.facebook} target="_blank" rel="noopener noreferrer">
                              Facebook
                            </a>
                          </div>
                        )}
                        {customer.zalo && (
                          <div className="flex items-center gap-3">
                            <MessageOutlined className="text-gray-400" />
                            <span>Zalo: {customer.zalo}</span>                          </div>
                        )}
                      </div>
                    </CardSection>
                  </Col>

                  {/* Address */}
                  <Col span={12}>
                    <CardSection title={t("Địa chỉ", lang)}>
                      {customer.address ? (
                        <div className="space-y-1">
                          {customer.address.street && <p>{customer.address.street}</p>}
                        </div>
                      ) : (
                        <p className="text-gray-500">{t("Chưa có địa chỉ", lang)}</p>
                      )}
                    </CardSection>
                  </Col>

                  {/* Note */}
                  {customer.note && (
                    <Col span={24}>
                      <CardSection title={t("Ghi chú", lang)}>
                        <p className="whitespace-pre-wrap">{customer.note}</p>
                      </CardSection>
                    </Col>
                  )}
                </Row>
              ),
            },
            {
              key: "source",
              label: t("Nguồn Lead", lang),
              children: (
                <Row gutter={24}>
                  <Col span={12}>
                    <CardSection title={t("Nguồn", lang)}>
                      <div className="space-y-3">
                        {customer.facebookPage ? (
                          <div>
                            <span className="text-gray-500">{t("Facebook Page:", lang)} </span>
                            <span>{customer.facebookPage.name}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500">{t("Chưa có Facebook Page", lang)}</p>
                        )}
                        {customer.campaign ? (
                          <div>
                            <span className="text-gray-500">{t("Campaign:", lang)} </span>
                            <span>{customer.campaign.name}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500">{t("Chưa có Campaign", lang)}</p>
                        )}
                        {customer.lead ? (
                          <div>
                            <span className="text-gray-500">{t("Lead:", lang)} </span>
                            <a onClick={() => router.push(`/leads/${customer.lead?._id}`)}>
                              {customer.lead.code} - {customer.lead.fullName}
                            </a>
                          </div>
                        ) : (
                          <p className="text-gray-500">{t("Chưa có Lead", lang)}</p>
                        )}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={12}>
                    <CardSection title={t("Marketing", lang)}>
                      {customer.marketingEmployee ? (
                        <div>
                          <span className="text-gray-500">{t("Nhân viên MKT:", lang)} </span>
                          <span>
                            {customer.marketingEmployee.employeeCode} - {customer.marketingEmployee.fullName}
                          </span>
                        </div>
                      ) : (
                        <p className="text-gray-500">{t("Chưa có nhân viên Marketing", lang)}</p>
                      )}
                    </CardSection>
                  </Col>
                </Row>
              ),
            },
            {
              key: "sale",
              label: t("Sale", lang),
              children: (
                <CardSection title={t("Thông tin Sale", lang)}>
                  {customer.saleEmployee ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-500">{t("Nhân viên Sale:", lang)} </span>
                        <span>
                          {customer.saleEmployee.employeeCode} - {customer.saleEmployee.fullName}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-gray-500">{t("Chưa có nhân viên Sale phụ trách", lang)}</p>
                      <PermissionGate permission="customer.update">
                        <Button onClick={() => router.push(`/customers/${id}/assign-sale`)}>
                          {t("Gán Sale", lang)}
                        </Button>
                      </PermissionGate>
                    </div>
                  )}
                </CardSection>
              ),
            },
            {
              key: "orders",
              label: t("Đơn hàng", lang),
              children: (
                <CardSection title={t("Đơn hàng", lang)}>
                  <p className="text-gray-500 mb-4">
                    {t("Xem danh sách đơn hàng của khách hàng này", lang)}
                  </p>
                  <Button onClick={() => router.push(`/orders?customerId=${id}`)}>
                    <ShoppingOutlined />
                    {t("Xem đơn hàng", lang)}
                  </Button>
                </CardSection>
              ),
            },
            {
              key: "revenue",
              label: t("Doanh thu", lang),
              children: (
                <Row gutter={24}>
                  <Col span={6}>
                    <CardSection title={t("Tổng đơn hàng", lang)}>
                      <div className="text-2xl font-bold">
                        {statistics?.totalOrders ?? 0}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title={t("Tổng doanh thu", lang)}>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(statistics?.totalRevenue ?? 0)}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title={t("GTBĐH", lang)}>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(statistics?.averageOrderValue ?? 0)}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title={t("Đơn gần nhất", lang)}>
                      <div className="text-sm">
                        {statistics?.lastOrderDate ? (
                          <>
                            <p>{formatDate(statistics.lastOrderDate)}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">{t("Chưa có đơn hàng", lang)}</p>
                        )}
                      </div>
                    </CardSection>
                  </Col>
                </Row>
              ),
            },
            {
              key: "timeline",
              label: t("Lịch sử", lang),
              children: (
                <CardSection title={t("Lịch sử hoạt động", lang)}>
                  <CustomerTimeline customerId={id} />
                </CardSection>
              ),
            },
          ]}
        />

        {/* Created/Updated info */}
        <div className="text-sm text-gray-500">
          <p>{t("Ngày tạo:", lang)} {formatDate(customer.createdAt)}</p>
          <p>{t("Cập nhật:", lang)} {formatDate(customer.updatedAt)}</p>
        </div>
      </div>
    </PageContainer>
  );
}
