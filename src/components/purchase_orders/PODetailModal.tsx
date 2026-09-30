import React from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { POStatusToken } from '../common/StatusToken';
import type { PurchaseOrder, PurchaseOrderItem } from '../../types';

interface PODetailModalProps {
  isOpen: boolean;
  purchaseOrder: PurchaseOrder | null;
  onClose: () => void;
  onReceive?: () => void;
  canReceive?: boolean;
}

export function PODetailModal({
  isOpen,
  purchaseOrder,
  onClose,
  onReceive,
  canReceive = false,
}: PODetailModalProps) {
  if (!purchaseOrder) return null;

  const itemColumns: TableColumn<PurchaseOrderItem>[] = [
    { key: 'product_name', header: 'Product Item' },
    { key: 'product_sku', header: 'SKU' },
    { key: 'quantity', header: 'Ordered' },
    {
      key: 'received_quantity',
      header: 'Received',
      renderCell: row => (
        <Text
          weight="semibold"
          style={{
            color: row.received_quantity >= row.quantity ? 'var(--color-success)' : 'inherit',
          }}
        >
          {row.received_quantity} / {row.quantity}
        </Text>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      renderCell: row => <Text>${row.unit_cost.toFixed(2)}</Text>,
    },
    {
      key: 'total',
      header: 'Total',
      renderCell: row => <Text weight="bold">${row.total.toFixed(2)}</Text>,
    },
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="info" width={720}>
      <Layout
        header={
          <DialogHeader
            title={`Purchase Order: ${purchaseOrder.po_number}`}
            subtitle={`Created: ${new Date(purchaseOrder.created_at).toLocaleDateString()} • Vendor: ${purchaseOrder.supplier_name}`}
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack
                gap={4}
                style={{
                  padding: 'var(--spacing-3)',
                  backgroundColor: 'var(--color-background-surface)',
                  borderRadius: 'var(--radius-element)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Status</Text>
                  <POStatusToken status={purchaseOrder.status} />
                </VStack>

                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Target Warehouse</Text>
                  <Text weight="semibold">{purchaseOrder.warehouse_name}</Text>
                </VStack>

                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Expected Delivery</Text>
                  <Text weight="semibold">
                    {purchaseOrder.expected_delivery_date
                      ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()
                      : 'Not specified'}
                  </Text>
                </VStack>

                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Total Value</Text>
                  <Heading level={3}>${purchaseOrder.total_amount.toFixed(2)}</Heading>
                </VStack>
              </HStack>

              {purchaseOrder.notes && (
                <VStack gap={1}>
                  <Text weight="semibold">Procurement Notes</Text>
                  <Text style={{ color: 'var(--color-text-secondary)' }}>{purchaseOrder.notes}</Text>
                </VStack>
              )}

              <VStack gap={2}>
                <Heading level={4}>Order Items</Heading>
                <Table idKey="id" columns={itemColumns} data={purchaseOrder.items} hasHover />
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {canReceive &&
                purchaseOrder.status !== 'Received' &&
                purchaseOrder.status !== 'Cancelled' &&
                onReceive && (
                  <Button
                    label="Receive Goods"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onReceive();
                    }}
                  />
                )}
              <Button label="Close" variant="secondary" onClick={onClose} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
