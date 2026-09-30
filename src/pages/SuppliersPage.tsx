import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { SupplierModal } from '../components/suppliers/SupplierModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Supplier } from '../types';

export function SuppliersPage() {
  const { can } = useAuth();
  const { success, error } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadSuppliers = () => {
    setIsLoading(true);
    api.suppliers
      .getAll({ search: search.trim() || undefined })
      .then(setSuppliers)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await api.suppliers.delete(supplierToDelete.id);
      success(`Supplier "${supplierToDelete.name}" deleted.`);
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete supplier';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier / Vendor',
      renderCell: row => <Text weight="semibold">{row.name}</Text>,
    },
    { key: 'contact_person', header: 'Contact Person' },
    {
      key: 'contact_info',
      header: 'Email / Phone',
      renderCell: row => (
        <VStack gap={0}>
          <Text size="sm">{row.email || '—'}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.phone || '—'}</Text>
        </VStack>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      renderCell: row => (
        <Text size="sm">
          {[row.city, row.country].filter(Boolean).join(', ') || '—'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: row => (
        <Token
          label={row.status === 'active' ? 'Active Vendor' : 'Inactive'}
          color={row.status === 'active' ? 'green' : 'gray'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row =>
        can('manage_suppliers') ? (
          <HStack gap={1}>
            <Button
              label="Edit"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSupplierToEdit(row);
                setIsModalOpen(true);
              }}
            />
            <Button
              label="Delete"
              variant="ghost"
              size="sm"
              onClick={() => setSupplierToDelete(row)}
            />
          </HStack>
        ) : null,
    },
  ];

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Suppliers & Vendors Directory</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Maintain supplier relationships, purchase order routing, and vendor directory contacts.
          </Text>
        </VStack>

        {can('manage_suppliers') && (
          <Button
            label="+ Register Supplier"
            variant="primary"
            onClick={() => {
              setSupplierToEdit(null);
              setIsModalOpen(true);
            }}
          />
        )}
      </HStack>

      <Card>
        <TextInput
          label="Search Suppliers"
          isLabelHidden
          placeholder="Search by vendor name, contact person, or location..."
          value={search}
          onChange={setSearch}
          hasClear
        />
      </Card>

      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Querying vendor records...</Text>
            </VStack>
          ) : (
            <Table
              idKey="id"
              columns={columns}
              data={suppliers}
              hasHover
              emptyState={
                <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                  <Text weight="semibold">No suppliers found</Text>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Add a new supplier to start issuing purchase orders.
                  </Text>
                </VStack>
              }
            />
          )}
        </VStack>
      </Card>

      <SupplierModal
        isOpen={isModalOpen}
        supplierToEdit={supplierToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadSuppliers}
      />

      <ConfirmDialog
        isOpen={!!supplierToDelete}
        title="Confirm Vendor Removal"
        message={`Are you sure you want to remove supplier "${supplierToDelete?.name}"?`}
        confirmLabel="Remove Supplier"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSupplierToDelete(null)}
      />
    </VStack>
  );
}
