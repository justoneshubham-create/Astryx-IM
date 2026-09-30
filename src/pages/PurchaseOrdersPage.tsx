import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Spinner } from '@astryxdesign/core/Spinner';
import { POStatusToken } from '../components/common/StatusToken';
import { CreatePOModal } from '../components/purchase_orders/CreatePOModal';
import { ReceivePOModal } from '../components/purchase_orders/ReceivePOModal';
import { PODetailModal } from '../components/purchase_orders/PODetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { PurchaseOrder, Supplier, Warehouse, Product } from '../types';

export function PurchaseOrdersPage() {
  const { can } = useAuth();
  const { success, error } = useNotification();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // References
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [cancelPO, setCancelPO] = useState<PurchaseOrder | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      api.suppliers.getAll(),
      api.warehouses.getAll(),
      api.products.getAll({ page_size: 100 }),
    ])
      .then(([sups, whs, prods]) => {
        setSuppliers(sups);
        setWarehouses(whs);
        setProducts(prods.items);
      })
      .catch(console.error);
  }, []);

  const loadOrders = () => {
    setIsLoading(true);
    api.purchaseOrders
      .getAll({
        status: statusFilter || undefined,
        supplier_id: supplierFilter ? parseInt(supplierFilter, 10) : undefined,
        warehouse_id: warehouseFilter ? parseInt(warehouseFilter, 10) : undefined,
        page,
        page_size: pageSize,
      })
      .then(res => {
        setOrders(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, statusFilter, supplierFilter, warehouseFilter]);

  const handleCancelConfirm = async () => {
    if (!cancelPO) return;
    setIsCancelling(true);
    try {
      await api.purchaseOrders.update(cancelPO.id, { status: 'Cancelled' });
      success(`Purchase Order ${cancelPO.po_number} marked as Cancelled.`);
      setCancelPO(null);
      loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel purchase order';
      error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprovePO = async (po: PurchaseOrder) => {
    try {
      await api.purchaseOrders.update(po.id, { status: 'Approved' });
      success(`Purchase Order ${po.po_number} Approved.`);
      loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve purchase order';
      error(msg);
    }
  };

  const columns: TableColumn<PurchaseOrder>[] = [
    {
      key: 'po_number',
      header: 'PO Number',
      renderCell: row => <Text weight="semibold">{row.po_number}</Text>,
    },
    { key: 'supplier_name', header: 'Vendor' },
    { key: 'warehouse_name', header: 'Receiving Dock' },
    {
      key: 'order_date',
      header: 'Order / Delivery Date',
      renderCell: row => (
        <VStack gap={0}>
          <Text size="sm">{new Date(row.order_date).toLocaleDateString()}</Text>
          {row.expected_delivery_date && (
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
              Est: {new Date(row.expected_delivery_date).toLocaleDateString()}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Value',
      renderCell: row => <Text weight="bold">${row.total_amount.toFixed(2)}</Text>,
    },
    {
      key: 'status',
      header: 'Procurement State',
      renderCell: row => <POStatusToken status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row => (
        <HStack gap={1}>
          <Button
            label="View"
            variant="ghost"
            size="sm"
            onClick={() => setDetailPO(row)}
          />

          {can('approve_pos') && row.status === 'Pending' && (
            <Button
              label="Approve"
              variant="ghost"
              size="sm"
              onClick={() => handleApprovePO(row)}
            />
          )}

          {can('create_stock_movement') &&
            (row.status === 'Approved' ||
              row.status === 'Pending' ||
              row.status === 'Partially Received') && (
              <Button
                label="Receive"
                variant="ghost"
                size="sm"
                onClick={() => setReceivePO(row)}
              />
            )}

          {can('approve_pos') && row.status !== 'Received' && row.status !== 'Cancelled' && (
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              onClick={() => setCancelPO(row)}
            />
          )}
        </HStack>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: 'All PO Statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Partially Received', label: 'Partially Received' },
    { value: 'Received', label: 'Received' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const supplierOptions = [
    { value: '', label: 'All Suppliers' },
    ...suppliers.map(s => ({ value: s.id.toString(), label: s.name })),
  ];

  const warehouseOptions = [
    { value: '', label: 'All Warehouses' },
    ...warehouses.map(w => ({ value: w.id.toString(), label: w.name })),
  ];

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Purchase Orders & Inbound Shipments</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Track vendor purchase requisitions, approval lifecycle, and warehouse receiving dock operations.
          </Text>
        </VStack>

        {can('approve_pos') && (
          <Button
            label="+ Create Purchase Order"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
          />
        )}
      </HStack>

      {/* Filters */}
      <Card>
        <HStack gap={3} vAlign="center">
          <Selector
            label="PO Status"
            isLabelHidden
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ flex: 1 }}
          />

          <Selector
            label="Supplier"
            isLabelHidden
            options={supplierOptions}
            value={supplierFilter}
            onChange={setSupplierFilter}
            style={{ flex: 1 }}
          />

          <Selector
            label="Warehouse"
            isLabelHidden
            options={warehouseOptions}
            value={warehouseFilter}
            onChange={setWarehouseFilter}
            style={{ flex: 1 }}
          />
        </HStack>
      </Card>

      {/* PO Table */}
      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Loading purchase orders...</Text>
            </VStack>
          ) : (
            <>
              <Table
                idKey="id"
                columns={columns}
                data={orders}
                hasHover
                emptyState={
                  <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                    <Text weight="semibold">No purchase orders found</Text>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Issue a new purchase order to replenish warehouse stock.
                    </Text>
                  </VStack>
                }
              />

              <HStack hAlign="between" vAlign="center">
                <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Showing {orders.length} of {total} orders
                </Text>
                <Pagination
                  page={page}
                  onChange={setPage}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  variant="pages"
                />
              </HStack>
            </>
          )}
        </VStack>
      </Card>

      {/* Modals */}
      <CreatePOModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadOrders}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
      />

      <ReceivePOModal
        isOpen={!!receivePO}
        purchaseOrder={receivePO}
        onClose={() => setReceivePO(null)}
        onSuccess={loadOrders}
      />

      <PODetailModal
        isOpen={!!detailPO}
        purchaseOrder={detailPO}
        onClose={() => setDetailPO(null)}
        onReceive={() => {
          setReceivePO(detailPO);
        }}
        canReceive={can('create_stock_movement')}
      />

      <ConfirmDialog
        isOpen={!!cancelPO}
        title="Confirm Purchase Order Cancellation"
        message={`Are you sure you want to cancel purchase order "${cancelPO?.po_number}"?`}
        confirmLabel="Cancel Purchase Order"
        isLoading={isCancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelPO(null)}
      />
    </VStack>
  );
}
