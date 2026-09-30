import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StockStatusToken, TransactionTypeToken } from '../common/StatusToken';
import { api } from '../../api/client';
import type { ProductDetail, InventoryTransaction, WarehouseStockDetail } from '../../types';

interface ProductDetailModalProps {
  isOpen: boolean;
  productId: number | null;
  onClose: () => void;
  onStockInRequest?: (productId: number) => void;
}

export function ProductDetailModal({
  isOpen,
  productId,
  onClose,
  onStockInRequest,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !productId) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.products.getById(productId),
      api.transactions.getAll({ product_id: productId, page_size: 10 }),
    ])
      .then(([prodData, txData]) => {
        if (isMounted) {
          setProduct(prodData);
          setTransactions(txData.items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, productId]);

  const warehouseColumns: TableColumn<WarehouseStockDetail>[] = [
    { key: 'warehouse_name', header: 'Warehouse Facility' },
    { key: 'warehouse_code', header: 'Code' },
    { key: 'quantity', header: 'Total Quantity' },
    { key: 'available_quantity', header: 'Available' },
    { key: 'reserved_quantity', header: 'Reserved' },
    {
      key: 'stock_status',
      header: 'Facility Status',
      renderCell: row => <StockStatusToken status={row.stock_status} />,
    },
  ];

  const txColumns: TableColumn<InventoryTransaction>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      renderCell: row => (
        <Text size="sm">{new Date(row.created_at).toLocaleString()}</Text>
      ),
    },
    { key: 'warehouse_name', header: 'Warehouse' },
    {
      key: 'transaction_type',
      header: 'Action',
      renderCell: row => <TransactionTypeToken type={row.transaction_type} />,
    },
    {
      key: 'quantity',
      header: 'Delta',
      renderCell: row => {
        const isPositive =
          row.transaction_type === 'STOCK_IN' ||
          row.transaction_type === 'TRANSFER_IN' ||
          (row.transaction_type === 'ADJUSTMENT' && row.after_quantity > row.before_quantity);
        return (
          <Text
            weight="semibold"
            style={{
              color: isPositive ? 'var(--color-success)' : 'var(--color-destructive)',
            }}
          >
            {isPositive ? `+${row.quantity}` : `-${row.quantity}`}
          </Text>
        );
      },
    },
    {
      key: 'before_after',
      header: 'Balance',
      renderCell: row => (
        <Text size="sm">
          {row.before_quantity} → <strong>{row.after_quantity}</strong>
        </Text>
      ),
    },
    { key: 'reference_number', header: 'Reference' },
    { key: 'user_name', header: 'Operated By' },
  ];

  const profitMargin =
    product && product.selling_price > 0
      ? (((product.selling_price - product.cost_price) / product.selling_price) * 100).toFixed(1)
      : '0.0';

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="info" width={760}>
      <Layout
        header={
          <DialogHeader
            title={product ? `${product.name} (${product.sku})` : 'Product Details'}
            subtitle={product ? `Category: ${product.category_name || 'N/A'} • Supplier: ${product.supplier_name || 'N/A'}` : ''}
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            {isLoading ? (
              <VStack gap={4} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                <Spinner size="lg" />
                <Text>Loading product records...</Text>
              </VStack>
            ) : product ? (
              <VStack gap={5}>
                {/* Metric Summary */}
                <HStack
                  gap={4}
                  style={{
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--color-background-surface)',
                    borderRadius: 'var(--radius-element)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <VStack gap={1}>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Current Global Stock</Text>
                    <Heading level={3}>
                      {product.total_quantity} {product.unit}
                    </Heading>
                    <StockStatusToken status={product.stock_status} />
                  </VStack>

                  <VStack gap={1}>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Cost Price</Text>
                    <Heading level={3}>${product.cost_price.toFixed(2)}</Heading>
                    <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Unit Procurement</Text>
                  </VStack>

                  <VStack gap={1}>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Selling Price</Text>
                    <Heading level={3}>${product.selling_price.toFixed(2)}</Heading>
                    <Text size="xsm" style={{ color: 'var(--color-success)' }}>
                      Margin: {profitMargin}%
                    </Text>
                  </VStack>

                  <VStack gap={1}>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Safety Thresholds</Text>
                    <Text size="sm">
                      Min: <strong>{product.min_stock_level}</strong> | Max: <strong>{product.max_stock_level}</strong>
                    </Text>
                    <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
                      Barcode: {product.barcode || 'N/A'}
                    </Text>
                  </VStack>
                </HStack>

                {/* Description */}
                {product.description && (
                  <VStack gap={1}>
                    <Text weight="semibold">Description</Text>
                    <Text style={{ color: 'var(--color-text-secondary)' }}>{product.description}</Text>
                  </VStack>
                )}

                {/* Warehouse breakdown table */}
                <VStack gap={2}>
                  <Heading level={4}>Warehouse Facility Distribution</Heading>
                  <Table
                    idKey="warehouse_id"
                    columns={warehouseColumns}
                    data={product.warehouse_stocks}
                    hasHover
                    emptyState={<Text style={{ padding: 'var(--spacing-3)' }}>No stock in any warehouse yet.</Text>}
                  />
                </VStack>

                {/* Recent Movement History */}
                <VStack gap={2}>
                  <Heading level={4}>Recent Stock Transactions & Audit Trail</Heading>
                  <Table
                    idKey="id"
                    columns={txColumns}
                    data={transactions}
                    hasHover
                    emptyState={<Text style={{ padding: 'var(--spacing-3)' }}>No transaction records found for this product.</Text>}
                  />
                </VStack>
              </VStack>
            ) : (
              <Text>Product information could not be found.</Text>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {product && onStockInRequest && (
                <Button
                  label="Receive Stock For This Item"
                  variant="primary"
                  onClick={() => {
                    onStockInRequest(product.id);
                    onClose();
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
