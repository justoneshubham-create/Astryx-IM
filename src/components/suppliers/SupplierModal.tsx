import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Supplier } from '../../types';

interface SupplierModalProps {
  isOpen: boolean;
  supplierToEdit: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierModal({
  isOpen,
  supplierToEdit,
  onClose,
  onSuccess,
}: SupplierModalProps) {
  const { success, error } = useNotification();
  const isEditing = !!supplierToEdit;

  const [name, setName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name);
      setContactPerson(supplierToEdit.contact_person || '');
      setEmail(supplierToEdit.email || '');
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setCity(supplierToEdit.city || '');
      setCountry(supplierToEdit.country || '');
      setStatus(supplierToEdit.status || 'active');
    } else {
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setCountry('');
      setStatus('active');
    }
  }, [supplierToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      error('Supplier name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Supplier> = {
        name: name.trim(),
        contact_person: contactPerson.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        status,
      };

      if (isEditing && supplierToEdit) {
        await api.suppliers.update(supplierToEdit.id, payload);
        success(`Supplier "${name}" updated successfully.`);
      } else {
        await api.suppliers.create(payload);
        success(`Supplier "${name}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save supplier';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Active Vendor' },
    { value: 'inactive', label: 'Inactive Vendor' },
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={560}>
      <Layout
        header={
          <DialogHeader
            title={isEditing ? 'Edit Supplier' : 'Register New Vendor / Supplier'}
            subtitle="Manage vendor contact information and procurement relationships."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label="Supplier / Company Name"
                value={name}
                onChange={setName}
                placeholder="e.g. Acme Industrial Logistics"
                isRequired
              />

              <HStack gap={3}>
                <TextInput
                  label="Contact Person"
                  value={contactPerson}
                  onChange={setContactPerson}
                  placeholder="e.g. John Doe"
                />
                <TextInput
                  label="Business Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="e.g. procurement@acme.com"
                />
              </HStack>

              <HStack gap={3}>
                <TextInput
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="e.g. +1-555-0199"
                />
                <Selector
                  label="Vendor Status"
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                />
              </HStack>

              <TextInput
                label="Physical Address"
                value={address}
                onChange={setAddress}
                placeholder="e.g. 100 Logistics Way, Bay 3"
              />

              <HStack gap={3}>
                <TextInput
                  label="City"
                  value={city}
                  onChange={setCity}
                  placeholder="e.g. Chicago"
                />
                <TextInput
                  label="Country"
                  value={country}
                  onChange={setCountry}
                  placeholder="e.g. USA"
                />
              </HStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Supplier'}
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
