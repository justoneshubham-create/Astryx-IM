import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Spinner } from '@astryxdesign/core/Spinner';
import { TransactionTypeToken } from '../components/common/StatusToken';
import { api } from '../api/client';
import type { InventoryTransaction, Warehouse } from '../types';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.warehouses.getAll().then(setWarehouses).catch(console.error);
  }, []);

  const loadTransactions = () => {
    setIsLoading(true);
    api.transactions
      .getAll({
        search: search.trim() || undefined,
        transaction_type: typeFilter || undefined,
        warehouse_id: warehouseFilter ? parseInt(warehouseFilter, 10) : undefined,
        page,
        page_size: pageSize,
      })
      .then(res => {
        setTransactions(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTransactions();
  }, [page, pageSize, typeFilter, warehouseFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns: TableColumn<InventoryTransaction>[] = [
    {
      key: 'created_at',
      header: 'Audit Timestamp',
      renderCell: row => (
        <VStack gap={0}>
          <Text size="sm">{new Date(row.created_at).toLocaleDateString()}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
            {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'product_name',
      header: 'Product Item',
      renderCell: row => (
        <VStack gap={0}>
          <Text weight="medium">{row.product_name}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>SKU: {row.sku}</Text>
        </VStack>
      ),
    },
    { key: 'warehouse_name', header: 'Facility' },
    {
      key: 'transaction_type',
      header: 'Movement Type',
      renderCell: row => <TransactionTypeToken type={row.transaction_type} />,
    },
    {
      key: 'quantity',
      header: 'Delta Change',
      renderCell: row => {
        const isAdd =
          row.transaction_type === 'STOCK_IN' ||
          row.transaction_type === 'TRANSFER_IN' ||
          (row.transaction_type === 'ADJUSTMENT' && row.after_quantity > row.before_quantity);
        return (
          <Text
            weight="bold"
            style={{ color: isAdd ? 'var(--color-success)' : 'var(--color-destructive)' }}
          >
            {isAdd ? `+${row.quantity}` : `-${row.quantity}`}
          </Text>
        );
      },
    },
    {
      key: 'before_after',
      header: 'Stock Progression',
      renderCell: row => (
        <Text size="sm">
          {row.before_quantity} → <strong>{row.after_quantity}</strong>
        </Text>
      ),
    },
    {
      key: 'reference_number',
      header: 'Manifest / Ref #',
      renderCell: row => <Text size="sm">{row.reference_number || '—'}</Text>,
    },
    {
      key: 'user_name',
      header: 'Responsible User',
      renderCell: row => <Text size="sm">{row.user_name || 'System Auto'}</Text>,
    },
    {
      key: 'notes',
      header: 'Audit Notes',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {row.notes || '—'}
        </Text>
      ),
    },
  ];

  const typeOptions = [
    { value: '', label: 'All Transaction Types' },
    { value: 'STOCK_IN', label: 'Stock In' },
    { value: 'STOCK_OUT', label: 'Stock Out' },
    { value: 'TRANSFER_IN', label: 'Transfer In' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out' },
    { value: 'ADJUSTMENT', label: 'Stock Adjustment' },
  ];

  const warehouseOptions = [
    { value: '', label: 'All Facilities' },
    ...warehouses.map(w => ({ value: w.id.toString(), label: w.name })),
  ];

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>Immutable Inventory Audit Ledger</Heading>
        <Text style={{ color: 'var(--color-text-secondary)' }}>
          Tamper-evident audit trail capturing every physical quantity change, user operator, and reference manifest.
        </Text>
      </VStack>

      <Card>
        <HStack gap={3} vAlign="center">
          <TextInput
            label="Search Transactions"
            isLabelHidden
            placeholder="Search reference number, product name, operator, or notes..."
            value={search}
            onChange={setSearch}
            hasClear
            style={{ flex: 2 }}
          />

          <Selector
            label="Transaction Type"
            isLabelHidden
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
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

      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Querying audit records...</Text>
            </VStack>
          ) : (
            <>
              <Table
                idKey="id"
                columns={columns}
                data={transactions}
                hasHover
                emptyState={
                  <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                    <Text weight="semibold">No transactions recorded</Text>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Every stock movement in the system will automatically appear in this immutable audit ledger.
                    </Text>
                  </VStack>
                }
              />

              <HStack hAlign="between" vAlign="center">
                <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Showing {transactions.length} of {total} transaction events
                </Text>
                <Pagination
                  page={page}
                  onChange={setPage}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 15, 30, 50]}
                  variant="pages"
                />
              </HStack>
            </>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
