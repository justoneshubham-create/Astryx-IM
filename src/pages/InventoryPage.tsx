import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StockStatusToken } from '../components/common/StatusToken';
import { StockInModal } from '../components/inventory/StockInModal';
import { StockOutModal } from '../components/inventory/StockOutModal';
import { StockTransferModal } from '../components/inventory/StockTransferModal';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  InventoryItem,
  Warehouse,
  Category,
  Product,
  Supplier,
} from '../types';

interface InventoryPageProps {
  initialAction?: 'stock-in' | 'stock-out' | 'transfer' | 'adjustment' | null;
  initialProductId?: number | null;
  onClearInitialAction?: () => void;
}

export function InventoryPage({
  initialAction,
  initialProductId,
  onClearInitialAction,
}: InventoryPageProps) {
  const { can } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reference data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals state
  const [isStockInOpen, setIsStockInOpen] = useState<boolean>(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);

  // Pre-selected for modal
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(
    initialProductId || undefined
  );

  useEffect(() => {
    if (initialAction === 'stock-in') setIsStockInOpen(true);
    if (initialAction === 'stock-out') setIsStockOutOpen(true);
    if (initialAction === 'transfer') setIsTransferOpen(true);
    if (initialAction === 'adjustment') setIsAdjustmentOpen(true);
    if (initialProductId) setSelectedProductId(initialProductId);

    if (onClearInitialAction) onClearInitialAction();
  }, [initialAction, initialProductId]);

  // Load reference dropdown options
  useEffect(() => {
    Promise.all([
      api.warehouses.getAll(),
      api.categories.getAll(),
      api.products.getAll({ page_size: 100 }),
      api.suppliers.getAll(),
    ])
      .then(([whs, cats, prods, sups]) => {
        setWarehouses(whs);
        setCategories(cats);
        setProducts(prods.items);
        setSuppliers(sups);
      })
      .catch(console.error);
  }, []);

  const loadInventory = () => {
    setIsLoading(true);
    api.inventory
      .getAll({
        search: search.trim() || undefined,
        warehouse_id: warehouseFilter ? parseInt(warehouseFilter, 10) : undefined,
        category_id: categoryFilter ? parseInt(categoryFilter, 10) : undefined,
        stock_status: statusFilter || undefined,
        page,
        page_size: pageSize,
      })
      .then(res => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [page, pageSize, warehouseFilter, categoryFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      renderCell: row => <Text weight="semibold">{row.sku}</Text>,
    },
    {
      key: 'product_name',
      header: 'Product Name',
      renderCell: row => (
        <VStack gap={0}>
          <Text weight="medium">{row.product_name}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.category_name}</Text>
        </VStack>
      ),
    },
    { key: 'warehouse_name', header: 'Warehouse Facility' },
    {
      key: 'available_quantity',
      header: 'Available',
      renderCell: row => (
        <Text
          weight="bold"
          style={{
            color:
              row.available_quantity === 0
                ? 'var(--color-destructive)'
                : row.available_quantity <= row.min_stock_level
                ? 'var(--color-warning)'
                : 'inherit',
          }}
        >
          {row.available_quantity}
        </Text>
      ),
    },
    { key: 'reserved_quantity', header: 'Reserved' },
    { key: 'quantity', header: 'Physical Total' },
    {
      key: 'thresholds',
      header: 'Min / Max Bounds',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {row.min_stock_level} / {row.max_stock_level}
        </Text>
      ),
    },
    {
      key: 'stock_status',
      header: 'Stock Status',
      renderCell: row => <StockStatusToken status={row.stock_status} />,
    },
    {
      key: 'updated_at',
      header: 'Last Audit Update',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.updated_at).toLocaleDateString()} {new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ),
    },
  ];

  const warehouseOptions = [
    { value: '', label: 'All Warehouses' },
    ...warehouses.map(w => ({ value: w.id.toString(), label: `${w.name} (${w.code})` })),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(c => ({ value: c.id.toString(), label: c.name })),
  ];

  const statusOptions = [
    { value: '', label: 'All Stock Statuses' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Over Stock', label: 'Over Stock' },
  ];

  return (
    <VStack gap={5}>
      {/* Header and Action Workflows */}
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Facility Inventory Levels</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Track multi-warehouse inventory quantities, buffer thresholds, and stock allocation states.
          </Text>
        </VStack>

        <HStack gap={2}>
          {can('stock_in') && (
            <Button
              label="Stock In"
              variant="primary"
              onClick={() => {
                setSelectedProductId(undefined);
                setIsStockInOpen(true);
              }}
            />
          )}

          {can('stock_out') && (
            <Button
              label="Stock Out"
              variant="secondary"
              onClick={() => {
                setSelectedProductId(undefined);
                setIsStockOutOpen(true);
              }}
            />
          )}

          {can('perform_transfers') && (
            <Button
              label="Transfer"
              variant="secondary"
              onClick={() => setIsTransferOpen(true)}
            />
          )}

          {can('perform_adjustments') && (
            <Button
              label="Adjust"
              variant="secondary"
              onClick={() => setIsAdjustmentOpen(true)}
            />
          )}
        </HStack>
      </HStack>

      {/* Filter and Search Bar */}
      <Card>
        <HStack gap={3} vAlign="center">
          <TextInput
            label="Search Inventory"
            isLabelHidden
            placeholder="Search by SKU, product name, or warehouse..."
            value={search}
            onChange={setSearch}
            hasClear
            style={{ flex: 2 }}
          />

          <Selector
            label="Warehouse"
            isLabelHidden
            options={warehouseOptions}
            value={warehouseFilter}
            onChange={setWarehouseFilter}
            style={{ flex: 1 }}
          />

          <Selector
            label="Category"
            isLabelHidden
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ flex: 1 }}
          />

          <Selector
            label="Status"
            isLabelHidden
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ flex: 1 }}
          />
        </HStack>
      </Card>

      {/* Data Table */}
      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Synchronizing warehouse ledger...</Text>
            </VStack>
          ) : (
            <>
              <Table
                idKey="id"
                columns={columns}
                data={items}
                hasHover
                emptyState={
                  <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                    <Text weight="semibold">No inventory records matching query</Text>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Try adjusting the warehouse or stock status filter, or receive incoming inventory.
                    </Text>
                  </VStack>
                }
              />

              <HStack hAlign="between" vAlign="center">
                <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Showing {items.length} of {total} inventory rows
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
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={loadInventory}
        warehouses={warehouses}
        products={products}
        suppliers={suppliers}
        initialProductId={selectedProductId}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        onSuccess={loadInventory}
        warehouses={warehouses}
        products={products}
        currentInventory={items}
        initialProductId={selectedProductId}
      />

      <StockTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={loadInventory}
        warehouses={warehouses}
        products={products}
        currentInventory={items}
      />

      <StockAdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSuccess={loadInventory}
        warehouses={warehouses}
        products={products}
        currentInventory={items}
      />
    </VStack>
  );
}
