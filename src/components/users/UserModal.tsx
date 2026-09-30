import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { User } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  userToEdit: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const roleOptions = [
  { value: 'admin', label: 'Admin (Full system control & user admin)' },
  { value: 'manager', label: 'Inventory Manager (Operations & approvals)' },
  { value: 'staff', label: 'Staff (Warehouse fulfillment & movement requests)' },
];

const statusOptions = [
  { value: 'active', label: 'Active User' },
  { value: 'inactive', label: 'Suspended / Inactive' },
];

export function UserModal({
  isOpen,
  userToEdit,
  onClose,
  onSuccess,
}: UserModalProps) {
  const { success, error } = useNotification();
  const isEditing = !!userToEdit;

  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('staff');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email);
      setFullName(userToEdit.full_name);
      setPassword('');
      setRole(userToEdit.role);
      setStatus(userToEdit.status || 'active');
    } else {
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('staff');
      setStatus('active');
    }
  }, [userToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!email.trim() || !fullName.trim()) {
      error('Email and full name are required.');
      return;
    }

    if (!isEditing && !password.trim()) {
      error('Password is required for new accounts.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        await api.users.update(userToEdit.id, {
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          status,
          password: password.trim() ? password.trim() : undefined,
        });
        success(`User "${fullName}" updated successfully.`);
      } else {
        await api.users.create({
          email: email.trim(),
          full_name: fullName.trim(),
          password: password.trim(),
          role,
          status,
        });
        success(`User "${fullName}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save user';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader
            title={isEditing ? `Edit User: ${userToEdit?.full_name}` : 'Create New User Account'}
            subtitle="Configure enterprise role permissions and authentication."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label="Full Name"
                value={fullName}
                onChange={setFullName}
                placeholder="e.g. Sarah Jenkins"
                isRequired
              />

              <TextInput
                label="Work Email Address"
                value={email}
                onChange={setEmail}
                placeholder="e.g. s.jenkins@company.com"
                isRequired
              />

              <TextInput
                label={isEditing ? 'New Password (Leave blank to keep current)' : 'Password'}
                value={password}
                onChange={setPassword}
                placeholder={isEditing ? '••••••••' : 'Minimum 6 characters'}
                isRequired={!isEditing}
              />

              <Selector
                label="System Role & Permission Level"
                options={roleOptions}
                value={role}
                onChange={setRole}
                isRequired
              />

              <Selector
                label="Account Status"
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
                label={isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
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
