import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { CategoryModal } from '../components/categories/CategoryModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Category } from '../types';

export function CategoriesPage() {
  const { can } = useAuth();
  const { success, error } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadCategories = () => {
    setIsLoading(true);
    api.categories
      .getAll()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await api.categories.delete(categoryToDelete.id);
      success(`Category "${categoryToDelete.name}" deleted.`);
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      renderCell: row => <Text weight="semibold">{row.name}</Text>,
    },
    {
      key: 'description',
      header: 'Description',
      renderCell: row => (
        <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
          {row.description || 'No description provided'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: row => (
        <Token
          label={row.status === 'active' ? 'Active' : 'Inactive'}
          color={row.status === 'active' ? 'green' : 'gray'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Configured Date',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row =>
        can('manage_catalog') ? (
          <HStack gap={1}>
            <Button
              label="Edit"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryToEdit(row);
                setIsModalOpen(true);
              }}
            />
            <Button
              label="Delete"
              variant="ghost"
              size="sm"
              onClick={() => setCategoryToDelete(row)}
            />
          </HStack>
        ) : null,
    },
  ];

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Product Categories</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Classify and segment warehouse stock into functional inventory taxonomy.
          </Text>
        </VStack>

        {can('manage_catalog') && (
          <Button
            label="+ Add Category"
            variant="primary"
            onClick={() => {
              setCategoryToEdit(null);
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
              <Text>Loading categories...</Text>
            </VStack>
          ) : (
            <Table
              idKey="id"
              columns={columns}
              data={categories}
              hasHover
              emptyState={
                <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                  <Text weight="semibold">No categories configured</Text>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Add your first product category using the button above.
                  </Text>
                </VStack>
              }
            />
          )}
        </VStack>
      </Card>

      <CategoryModal
        isOpen={isModalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadCategories}
      />

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Confirm Category Deletion"
        message={`Are you sure you want to delete category "${categoryToDelete?.name}"? Items linked to this category should be reassigned.`}
        confirmLabel="Delete Category"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCategoryToDelete(null)}
      />
    </VStack>
  );
}
