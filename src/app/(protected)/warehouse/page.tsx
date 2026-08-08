"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, Col, Row, Statistic } from "antd";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseWorkflowInventory, useWarehouseMovements, useWarehouseReceipts, useWarehouseTransfers } from "@/hooks/useWarehouseWorkflow";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";

function totalsForWarehouse(warehouseId: string | undefined, inventory: { items: { warehouseId?: { _id?: string } | string; quantity?: number; inTransitQuantity?: number; shippedQuantity?: number }[] } | undefined) {
  if (!warehouseId) return { quantity: 0, inTransit: 0, shipped: 0 };
  const items = inventory?.items ?? [];
  let quantity = 0;
  let inTransit = 0;
  let shipped = 0;
  for (const item of items) {
    const wid = (item.warehouseId as { _id?: string } | string | undefined);
    const id = typeof wid === "string" ? wid : wid?._id;
    if (id !== warehouseId) continue;
    quantity += item.quantity ?? 0;
    inTransit += item.inTransitQuantity ?? 0;
    shipped += item.shippedQuantity ?? 0;
  }
  return { quantity, inTransit, shipped };
}

export default function WarehouseDashboardPage() {
  const { warehouses, loading } = useWarehouses();
  const list = warehouses ?? [];

  const allInventory = useWarehouseWorkflowInventory({ limit: 100 });
  const transfers = useWarehouseTransfers({ limit: 100 });
  const receipts = useWarehouseReceipts({ limit: 100 });
  const movements = useWarehouseMovements({ limit: 100 });

  const cards = useMemo(() => list.map((warehouse: { _id: string; code: string; name: string }) => {
    const totals = totalsForWarehouse(warehouse._id, allInventory.data);
    return { warehouse, totals };
  }), [list, allInventory.data]);

  const overall = useMemo(() => {
    const quantity = cards.reduce((sum, card) => sum + card.totals.quantity, 0);
    const inTransit = cards.reduce((sum, card) => sum + card.totals.inTransit, 0);
    const shipped = cards.reduce((sum, card) => sum + card.totals.shipped, 0);
    return { quantity, inTransit, shipped };
  }, [cards]);

  return (
    <PageContainer>
      <PageHeader
        title="Tổng quan kho"
        subtitle={loading ? "Đang tải..." : `${list.length} kho`}
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho" }]}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}><Card><Statistic title="Tổng tồn kho" value={overall.quantity} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Đang chuyển" value={overall.inTransit} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Đã xuất" value={overall.shipped} /></Card></Col>
      </Row>

      {cards.map((card) => (
        <div key={card.warehouse._id} style={{ marginBottom: 16 }}>
          <CardSection title={`Kho ${card.warehouse.name} (${card.warehouse.code})`}>
            <Row gutter={16}>
              <Col xs={24} md={8}><Statistic title="Tồn kho" value={card.totals.quantity} /></Col>
              <Col xs={24} md={8}><Statistic title="Đang chuyển" value={card.totals.inTransit} /></Col>
              <Col xs={24} md={8}><Statistic title="Đã xuất" value={card.totals.shipped} /></Col>
            </Row>
            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              <Link href="/warehouse/inventory">Tồn chi tiết</Link>
              <Link href="/warehouse/imports">Phiếu nhập</Link>
              <Link href="/warehouse/transfers">Phiếu chuyển</Link>
              <Link href="/warehouse/movements">Lịch sử</Link>
            </div>
          </CardSection>
        </div>
      ))}

      <Row gutter={16}>
        <Col xs={24} md={12}><Card title={`Phiếu nhập gần đây (${receipts.data?.total ?? 0})`} loading={receipts.isLoading}>{receipts.data?.items.slice(0, 5).map((item: { _id: string; receiptCode: string; createdAt: string; warehouseId?: { name?: string } }) => (<div key={item._id}>{item.receiptCode} • {item.warehouseId?.name} • {new Date(item.createdAt).toLocaleString("vi-VN")}</div>))}</Card></Col>
        <Col xs={24} md={12}><Card title={`Phiếu chuyển gần đây (${transfers.data?.total ?? 0})`} loading={transfers.isLoading}>{transfers.data?.items.slice(0, 5).map((item: { _id: string; transferCode: string; status: string; createdAt: string }) => (<div key={item._id}>{item.transferCode} • {item.status} • {new Date(item.createdAt).toLocaleString("vi-VN")}</div>))}</Card></Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Card title={`Lịch sử tồn kho mới nhất (${movements.data?.total ?? 0})`} loading={movements.isLoading}>
          {movements.data?.items.slice(0, 5).map((item: { _id: string; type: string; quantity: number; createdAt: string }) => (<div key={item._id}>{item.type} • {item.quantity} • {new Date(item.createdAt).toLocaleString("vi-VN")}</div>))}
        </Card>
      </div>
    </PageContainer>
  );
}
