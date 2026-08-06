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
import { Row, Col, message, Button, Tag, Tabs } from "antd";
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
      message.success("Xóa khách hàng thành công");
      router.push("/customers");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Xóa khách hàng thất bại");
    } finally {
      setDeleteLoading(false);
    }
  }, [id, deleteMutation, router]);

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
        <PageHeader title="Đang tải..." />
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (error || !customer) {
    return (
      <PageContainer>
        <PageHeader title="Không tìm thấy khách hàng" />
        <EmptyState
          title="Không tìm thấy khách hàng"
          description="Khách hàng này có thể đã bị xóa hoặc không tồn tại"
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
        subtitle={`Mã khách hàng: ${customer.customerCode}`}
        actions={
          <div className="flex gap-2">
            <PermissionGate permission="customer.update">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/customers/${id}/edit`)}
              >
                Chỉnh sửa
              </Button>
            </PermissionGate>
            <PermissionGate permission="customer.delete">
              <Button
                danger
                onClick={handleDelete}
                loading={deleteLoading}
              >
                Xóa
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Status and basic info */}
        <CardSection title="Trạng thái">
          <div className="flex items-center gap-4">
            <Tag color={statusColor} className="text-base px-3 py-1">
              {statusLabel}
            </Tag>
          </div>
        </CardSection>

        {/* Tabs for detail sections */}
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: "info",
              label: "Thông tin chung",
              children: (
                <Row gutter={24}>
                  {/* Contact Information */}
                  <Col span={12}>
                    <CardSection title="Thông tin liên hệ">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <UserOutlined className="text-gray-400" />
                          <span className="font-medium">{customer.fullName}</span>
                          {customer.gender && (
                            <Tag>{customer.gender === "male" ? "Nam" : customer.gender === "female" ? "Nữ" : "Khác"}</Tag>
                          )}
                        </div>
                        {customer.birthday && (
                          <div className="flex items-center gap-3">
                            <CalendarOutlined className="text-gray-400" />
                            <span>Sinh nhật: {formatDate(customer.birthday)}</span>
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
                            <span>Zalo: {customer.zalo}</span>
                          </div>
                        )}
                      </div>
                    </CardSection>
                  </Col>

                  {/* Address */}
                  <Col span={12}>
                    <CardSection title="Địa chỉ">
                      {customer.address ? (
                        <div className="space-y-1">
                          {customer.address.street && <p>{customer.address.street}</p>}
                          {customer.address.ward && <p>Phường/Xã: {customer.address.ward}</p>}
                          {customer.address.district && <p>Quận/Huyện: {customer.address.district}</p>}
                          {customer.address.province && <p>Tỉnh/Thành phố: {customer.address.province}</p>}
                        </div>
                      ) : (
                        <p className="text-gray-500">Chưa có địa chỉ</p>
                      )}
                    </CardSection>
                  </Col>

                  {/* Note */}
                  {customer.note && (
                    <Col span={24}>
                      <CardSection title="Ghi chú">
                        <p className="whitespace-pre-wrap">{customer.note}</p>
                      </CardSection>
                    </Col>
                  )}
                </Row>
              ),
            },
            {
              key: "source",
              label: "Nguồn Lead",
              children: (
                <Row gutter={24}>
                  <Col span={12}>
                    <CardSection title="Nguồn">
                      <div className="space-y-3">
                        {customer.facebookPage ? (
                          <div>
                            <span className="text-gray-500">Facebook Page: </span>
                            <span>{customer.facebookPage.name}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500">Chưa có Facebook Page</p>
                        )}
                        {customer.campaign ? (
                          <div>
                            <span className="text-gray-500">Campaign: </span>
                            <span>{customer.campaign.name}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500">Chưa có Campaign</p>
                        )}
                        {customer.lead ? (
                          <div>
                            <span className="text-gray-500">Lead: </span>
                            <a onClick={() => router.push(`/leads/${customer.lead?._id}`)}>
                              {customer.lead.code} - {customer.lead.fullName}
                            </a>
                          </div>
                        ) : (
                          <p className="text-gray-500">Chưa có Lead</p>
                        )}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={12}>
                    <CardSection title="Marketing">
                      {customer.marketingEmployee ? (
                        <div>
                          <span className="text-gray-500">Nhân viên MKT: </span>
                          <span>
                            {customer.marketingEmployee.employeeCode} - {customer.marketingEmployee.fullName}
                          </span>
                        </div>
                      ) : (
                        <p className="text-gray-500">Chưa có nhân viên Marketing</p>
                      )}
                    </CardSection>
                  </Col>
                </Row>
              ),
            },
            {
              key: "sale",
              label: "Sale",
              children: (
                <CardSection title="Thông tin Sale">
                  {customer.saleEmployee ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-500">Nhân viên Sale: </span>
                        <span>
                          {customer.saleEmployee.employeeCode} - {customer.saleEmployee.fullName}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-gray-500">Chưa có nhân viên Sale phụ trách</p>
                      <PermissionGate permission="customer.update">
                        <Button onClick={() => router.push(`/customers/${id}/assign-sale`)}>
                          Gán Sale
                        </Button>
                      </PermissionGate>
                    </div>
                  )}
                </CardSection>
              ),
            },
            {
              key: "orders",
              label: "Đơn hàng",
              children: (
                <CardSection title="Đơn hàng">
                  <p className="text-gray-500 mb-4">
                    Xem danh sách đơn hàng của khách hàng này
                  </p>
                  <Button onClick={() => router.push(`/orders?customerId=${id}`)}>
                    <ShoppingOutlined />
                    Xem đơn hàng
                  </Button>
                </CardSection>
              ),
            },
            {
              key: "revenue",
              label: "Doanh thu",
              children: (
                <Row gutter={24}>
                  <Col span={6}>
                    <CardSection title="Tổng đơn hàng">
                      <div className="text-2xl font-bold">
                        {statistics?.totalOrders ?? 0}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title="Tổng doanh thu">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(statistics?.totalRevenue ?? 0)}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title="GTBĐH">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(statistics?.averageOrderValue ?? 0)}
                      </div>
                    </CardSection>
                  </Col>
                  <Col span={6}>
                    <CardSection title="Đơn gần nhất">
                      <div className="text-sm">
                        {statistics?.lastOrderDate ? (
                          <>
                            <p>{formatDate(statistics.lastOrderDate)}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Chưa có đơn hàng</p>
                        )}
                      </div>
                    </CardSection>
                  </Col>
                </Row>
              ),
            },
            {
              key: "timeline",
              label: "Lịch sử",
              children: (
                <CardSection title="Lịch sử hoạt động">
                  <CustomerTimeline customerId={id} />
                </CardSection>
              ),
            },
          ]}
        />

        {/* Created/Updated info */}
        <div className="text-sm text-gray-500">
          <p>Ngày tạo: {formatDate(customer.createdAt)}</p>
          <p>Cập nhật: {formatDate(customer.updatedAt)}</p>
        </div>
      </div>
    </PageContainer>
  );
}
