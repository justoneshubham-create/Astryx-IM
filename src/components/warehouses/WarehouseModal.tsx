import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Warehouse } from '../../types';

interface WarehouseModalProps {
  isOpen: boolean;
  warehouseToEdit: Warehouse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function WarehouseModal({
  isOpen,
  warehouseToEdit,
  onClose,
  onSuccess,
}: WarehouseModalProps) {
  const { success, error } = useNotification();
  const isEditing = !!warehouseToEdit;

  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [manager, setManager] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (warehouseToEdit) {
      setName(warehouseToEdit.name);
      setCode(warehouseToEdit.code);
      setAddress(warehouseToEdit.address || '');
      setManager(warehouseToEdit.manager || '');
      setContactNumber(warehouseToEdit.contact_number || '');
      setStatus(warehouseToEdit.status || 'active');
    } else {
      setName('');
      setCode('');
      setAddress('');
      setManager('');
      setContactNumber('');
      setStatus('active');
    }
  }, [warehouseToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      error('Warehouse facility name and unique code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Warehouse> = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || undefined,
        manager: manager.trim() || undefined,
        contact_number: contactNumber.trim() || undefined,
        status,
      };

      if (isEditing && warehouseToEdit) {
        await api.warehouses.update(warehouseToEdit.id, payload);
        success(`Warehouse "${name}" updated successfully.`);
      } else {
        await api.warehouses.create(payload);
        success(`Warehouse "${name}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save warehouse';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Operational (Active)' },
    { value: 'inactive', label: 'Under Maintenance / Inactive' },
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader
            title={isEditing ? 'Edit Warehouse Facility' : 'Add New Warehouse Facility'}
            subtitle="Configure physical locations, docks, and warehouse operations managers."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <TextInput
                  label="Warehouse Name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Central Distribution Center"
                  isRequired
                />
                <TextInput
                  label="Unique Facility Code"
                  value={code}
                  onChange={setCode}
                  placeholder="e.g. CDC-01"
                  isRequired
                />
              </HStack>

              <TextInput
                label="Physical Address / Dock Location"
                value={address}
                onChange={setAddress}
                placeholder="e.g. 100 Logistics Blvd, Dock 4"
              />

              <HStack gap={3}>
                <TextInput
                  label="Warehouse Manager"
                  value={manager}
                  onChange={setManager}
                  placeholder="e.g. Robert Vance"
                />
                <TextInput
                  label="Contact Number"
                  value={contactNumber}
                  onChange={setContactNumber}
                  placeholder="e.g. +1-555-4001"
                />
              </HStack>

              <Selector
                label="Operational Status"
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
                label={isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Warehouse'}
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
