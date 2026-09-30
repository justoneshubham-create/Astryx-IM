import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { WarehouseModal } from '../components/warehouses/WarehouseModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Warehouse } from '../types';

export function WarehousesPage() {
  const { can } = useAuth();
  const { success, error } = useNotification();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadWarehouses = () => {
    setIsLoading(true);
    api.warehouses
      .getAll()
      .then(setWarehouses)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    setIsDeleting(true);
    try {
      await api.warehouses.delete(warehouseToDelete.id);
      success(`Warehouse "${warehouseToDelete.name}" deleted.`);
      setWarehouseToDelete(null);
      loadWarehouses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete warehouse';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<Warehouse>[] = [
    {
      key: 'name',
      header: 'Warehouse Name',
      renderCell: row => <Text weight="semibold">{row.name}</Text>,
    },
    {
      key: 'code',
      header: 'Facility Code',
      renderCell: row => <Token label={row.code} color="blue" size="sm" />,
    },
    {
      key: 'address',
      header: 'Address / Dock',
      renderCell: row => <Text size="sm">{row.address || '—'}</Text>,
    },
    { key: 'manager', header: 'Facility Manager' },
    { key: 'contact_number', header: 'Contact' },
    {
      key: 'status',
      header: 'Operational State',
      renderCell: row => (
        <Token
          label={row.status === 'active' ? 'Active' : 'Inactive'}
          color={row.status === 'active' ? 'green' : 'gray'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row =>
        can('manage_warehouses') ? (
          <HStack gap={1}>
            <Button
              label="Edit"
              variant="ghost"
              size="sm"
              onClick={() => {
                setWarehouseToEdit(row);
                setIsModalOpen(true);
              }}
            />
            <Button
              label="Delete"
              variant="ghost"
              size="sm"
              onClick={() => setWarehouseToDelete(row)}
            />
          </HStack>
        ) : null,
    },
  ];

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Warehouse Facilities</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Manage regional fulfillment hubs, distribution centers, and storage bins.
          </Text>
        </VStack>

        {can('manage_warehouses') && (
          <Button
            label="+ Add Warehouse Facility"
            variant="primary"
            onClick={() => {
              setWarehouseToEdit(null);
              setIsModalOpen(true);
            }}
          />
        )}
      </HStack>

      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Loading warehouse facilities...</Text>
            </VStack>
          ) : (
            <Table
              idKey="id"
              columns={columns}
              data={warehouses}
              hasHover
              emptyState={
                <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                  <Text weight="semibold">No warehouses configured</Text>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Add at least one warehouse facility to store inventory.
                  </Text>
                </VStack>
              }
            />
          )}
        </VStack>
      </Card>

      <WarehouseModal
        isOpen={isModalOpen}
        warehouseToEdit={warehouseToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadWarehouses}
      />

      <ConfirmDialog
        isOpen={!!warehouseToDelete}
        title="Confirm Warehouse Removal"
        message={`Are you sure you want to remove warehouse facility "${warehouseToDelete?.name}" (${warehouseToDelete?.code})?`}
        confirmLabel="Remove Facility"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setWarehouseToDelete(null)}
      />
    </VStack>
  );
}
