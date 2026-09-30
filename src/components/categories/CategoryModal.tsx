import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  categoryToEdit: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryModal({
  isOpen,
  categoryToEdit,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const { success, error } = useNotification();
  const isEditing = !!categoryToEdit;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      setStatus(categoryToEdit.status || 'active');
    } else {
      setName('');
      setDescription('');
      setStatus('active');
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      error('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && categoryToEdit) {
        await api.categories.update(categoryToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        });
        success(`Category "${name}" updated successfully.`);
      } else {
        await api.categories.create({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        });
        success(`Category "${name}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={480}>
      <Layout
        header={
          <DialogHeader
            title={isEditing ? 'Edit Category' : 'Create New Category'}
            subtitle="Organize catalog items by departments and types."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label="Category Name"
                value={name}
                onChange={setName}
                placeholder="e.g. Electrical Components"
                isRequired
              />

              <TextArea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Brief summary of items classified under this category..."
              />

              <Selector
                label="Status"
                options={statusOptions}
                value={status}
                onChange={setStatus}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
                variant="primary"
                onClick={handleSubmit}
                isDisabled={isSubmitting}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
