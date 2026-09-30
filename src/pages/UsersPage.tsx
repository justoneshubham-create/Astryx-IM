import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { RoleToken } from '../components/common/StatusToken';
import { UserModal } from '../components/users/UserModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { User } from '../types';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { success, error } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadUsers = () => {
    setIsLoading(true);
    api.users
      .getAll()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.users.delete(userToDelete.id);
      success(`User "${userToDelete.full_name}" deleted.`);
      setUserToDelete(null);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'full_name',
      header: 'Full Name',
      renderCell: row => (
        <HStack gap={2} vAlign="center">
          <Text weight="semibold">{row.full_name}</Text>
          {row.id === currentUser?.id && (
            <Token label="You" color="default" size="sm" />
          )}
        </HStack>
      ),
    },
    { key: 'email', header: 'Email Address' },
    {
      key: 'role',
      header: 'Role & Permissions',
      renderCell: row => <RoleToken role={row.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: row => (
        <Token
          label={row.status === 'active' ? 'Active' : 'Suspended'}
          color={row.status === 'active' ? 'green' : 'gray'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined Date',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: row => (
        <HStack gap={1}>
          <Button
            label="Edit"
            variant="ghost"
            size="sm"
            onClick={() => {
              setUserToEdit(row);
              setIsModalOpen(true);
            }}
          />
          {row.id !== currentUser?.id && (
            <Button
              label="Delete"
              variant="ghost"
              size="sm"
              onClick={() => setUserToDelete(row)}
            />
          )}
        </HStack>
      ),
    },
  ];

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Role-Based Access Control (RBAC) & Users</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Provision team credentials, grant operational privileges, and audit account access.
          </Text>
        </VStack>

        <Button
          label="+ Create User Account"
          variant="primary"
          onClick={() => {
            setUserToEdit(null);
            setIsModalOpen(true);
          }}
        />
      </HStack>

      <Card>
        <VStack gap={4}>
          {isLoading ? (
            <VStack gap={3} hAlign="center" style={{ padding: 'var(--spacing-8)' }}>
              <Spinner size="lg" />
              <Text>Querying user directory...</Text>
            </VStack>
          ) : (
            <Table
              idKey="id"
              columns={columns}
              data={users}
              hasHover
              emptyState={
                <VStack gap={2} hAlign="center" style={{ padding: 'var(--spacing-6)' }}>
                  <Text weight="semibold">No users found</Text>
                </VStack>
              }
            />
          )}
        </VStack>
      </Card>

      <UserModal
        isOpen={isModalOpen}
        userToEdit={userToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
      />

      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Confirm User Account Deletion"
        message={`Are you sure you want to delete the account for "${userToDelete?.full_name}" (${userToDelete?.email})?`}
        confirmLabel="Delete User"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setUserToDelete(null)}
      />
    </VStack>
  );
}
