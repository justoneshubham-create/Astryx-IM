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
import { ProductModal } from '../components/products/ProductModal';
import { ProductDetailModal } from '../components/products/ProductDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Product, Category, Supplier } from '../types';

interface ProductsPageProps {
  onStockInRequest?: (productId: number) => void;
}

export function ProductsPage({ onStockInRequest }: ProductsPageProps) {
  const { can } = useAuth();
  const { success, error } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // References
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load dropdown references
  useEffect(() => {
    Promise.all([api.categories.getAll(), api.suppliers.getAll()])
      .then(([cats, sups]) => {
        setCategories(cats);
        setSuppliers(sups);
      })
      .catch(console.error);
  }, []);

  const loadProducts = () => {
    setIsLoading(true);
    api.products
      .getAll({
        search: search.trim() || undefined,
        category_id: categoryFilter ? parseInt(categoryFilter, 10) : undefined,
        supplier_id: supplierFilter ? parseInt(supplierFilter, 10) : undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      })
      .then(res => {
        setProducts(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [page, pageSize, categoryFilter, supplierFilter, statusFilter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await api.products.delete(productToDelete.id);
      success(`Product "${productToDelete.name}" deleted.`);
      setProductToDelete(null);
      loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<Product>[] = [
    {
      key: 'sku',
      header: 'SKU / Barcode',
      renderCell: row => (
        <VStack gap={0}>
          <Text weight="semibold">{row.sku}</Text>
          {row.barcode && <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.barcode}</Text>}
        </VStack>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      renderCell: row => (
        <VStack gap={0}>
          <Text weight="medium">{row.name}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.category_name}</Text>
        </VStack>
      ),
    },
    { key: 'supplier_name', header: 'Supplier' },
    {
      key: 'pricing',
      header: 'Cost / Sell Price',
      renderCell: row => (
        <Text size="sm">
          ${row.cost_price.toFixed(2)} / <strong>${row.selling_price.toFixed(2)}</strong>
        </Text>
      ),
    },
    {
      key: 'total_quantity',
      header: 'Global Stock',
      renderCell: row => (
        <Text weight="bold">
          {row.total_quantity} {row.unit}
        </Text>
      ),
    },
    {
      key: 'stock_status',
      header: 'Stock State',
      renderCell: row => <StockStatusToken status={row.stock_status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row => (
        <HStack gap={1}>
          <Button
            label="Details"
            variant="ghost"
            size="sm"
            onClick={() => setDetailProductId(row.id)}
          />
          {can('manage_catalog') && (
            <>
              <Button
                label="Edit"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProductToEdit(row);
                  setIsModalOpen(true);
                }}
              />
              <Button
                label="Delete"
                variant="ghost"
                size="sm"
                onClick={() => setProductToDelete(row)}
              />
            </>
          )}
        </HStack>
      ),
    },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(c => ({ value: c.id.toString(), label: c.name })),
  ];

  const supplierOptions = [
    { value: '', label: 'All Suppliers' },
    ...suppliers.map(s => ({ value: s.id.toString(), label: s.name })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'discontinued', label: 'Discontinued' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'sku', label: 'Sort by SKU' },
    { value: 'cost_price', label: 'Sort by Cost Price' },
    { value: 'selling_price', label: 'Sort by Selling Price' },
    { value: 'created_at', label: 'Sort by Date Added' },
  ];

  const sortOrderOptions = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
  ];

  return (
    <VStack gap={5}>
      {/* Header and Add CTA */}
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Product Catalog Management</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Maintain product catalog definitions, suppliers, bill-of-materials, pricing, and barcodes.
          </Text>
        </VStack>

        {can('manage_catalog') && (
          <Button
            label="+ Add New Product"
            variant="primary"
            onClick={() => {
              setProductToEdit(null);
              setIsModalOpen(true);
            }}
          />
        )}
      </HStack>

      {/* Filter and Search Bar */}
      <Card>
        <VStack gap={3}>
          <HStack gap={3} vAlign="center">
            <TextInput
              label="Search Catalog"
              isLabelHidden
              placeholder="Search product name, SKU, or barcode..."
              value={search}
              onChange={setSearch}
              hasClear
              style={{ flex: 2 }}
            />

            <Selector
              label="Category Filter"
              isLabelHidden
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ flex: 1 }}
            />

            <Selector
              label="Supplier Filter"
              isLabelHidden
              options={supplierOptions}
              value={supplierFilter}
              onChange={setSupplierFilter}
              style={{ flex: 1 }}
            />

            <Selector
              label="Status Filter"
              isLabelHidden
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ flex: 1 }}
            />
          </HStack>

          <HStack gap={3} vAlign="center">
            <Selector
              label="Sort Field"
              isLabelHidden
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 180 }}
            />
            <Selector
              label="Sort Direction"
              isLabelHidden
              options={sortOrderOptions}
              value={sortOrder}
              onChange={setSortOrder}
              style={{ width: 140 }}
            />
          </HStack>
        </VStack>
      </Card>

      {/* Product Table */}
      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Querying product catalog...</Text>
            </VStack>
          ) : (
            <>
              <Table
                idKey="id"
                columns={columns}
                data={products}
                hasHover
                emptyState={
                  <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                    <Text weight="semibold">No products found matching filters</Text>
                    <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Create a new product or broaden your search criteria.
                    </Text>
                  </VStack>
                }
              />

              <HStack hAlign="between" vAlign="center">
                <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Showing {products.length} of {total} products
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
      <ProductModal
        isOpen={isModalOpen}
        productToEdit={productToEdit}
        categories={categories}
        suppliers={suppliers}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadProducts}
      />

      <ProductDetailModal
        isOpen={!!detailProductId}
        productId={detailProductId}
        onClose={() => setDetailProductId(null)}
        onStockInRequest={onStockInRequest}
      />

      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Confirm Product Deletion"
        message={`Are you sure you want to delete product "${productToDelete?.name}" (${productToDelete?.sku})? This action cannot be reversed.`}
        confirmLabel="Delete Product"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />
    </VStack>
  );
}
