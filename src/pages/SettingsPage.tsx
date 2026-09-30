import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { RoleToken, HealthStatusIndicator } from '../components/common/StatusToken';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { UserRole } from '../types';

interface SettingsPageProps {
  colorMode: 'light' | 'dark' | 'system';
  onColorModeChange: (mode: 'light' | 'dark' | 'system') => void;
}

export function SettingsPage({ colorMode, onColorModeChange }: SettingsPageProps) {
  const { user, switchDemoUser } = useAuth();
  const { success, error } = useNotification();
  const [health, setHealth] = useState<{ status: string; service: string; version: string } | null>(
    null
  );
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(console.error);
  }, []);

  const handleRoleSwitch = async (role: UserRole) => {
    setIsSwitching(true);
    try {
      await switchDemoUser(role);
      success(`Switched active session to demo ${role.toUpperCase()} role.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch demo role';
      error(msg);
    } finally {
      setIsSwitching(false);
    }
  };

  const themeOptions = [
    { value: 'system', label: 'System Default' },
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
  ];

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={2}>System Settings & Configuration</Heading>
        <Text style={{ color: 'var(--color-text-secondary)' }}>
          System telemetry, RBAC demo profile switching, visual theme settings, and infrastructure status.
        </Text>
      </VStack>

      {/* Demo Role Switcher Card */}
      <Card style={{ border: '2px solid var(--color-accent)' }}>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={0}>
              <Heading level={3}>Live Role-Based Testing (RBAC Switcher)</Heading>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Instantly switch the authenticated session between enterprise permission tiers:
              </Text>
            </VStack>
            {user && <RoleToken role={user.role} />}
          </HStack>

          <Grid columns={3} gap={3}>
            <Card style={{ backgroundColor: 'var(--color-background-surface)' }}>
              <VStack gap={2}>
                <Heading level={4}>Admin Tier</Heading>
                <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
                  Email: <strong>admin@example.com</strong>
                </Text>
                <Text size="xsm">
                  Full unrestricted privileges: user provisioning, master catalog, warehouse setup, approval workflows, audit ledger.
                </Text>
                <Button
                  label="Switch to Admin"
                  variant={user?.role === 'admin' ? 'secondary' : 'primary'}
                  size="sm"
                  isDisabled={user?.role === 'admin' || isSwitching}
                  onClick={() => handleRoleSwitch('admin')}
                />
              </VStack>
            </Card>

            <Card style={{ backgroundColor: 'var(--color-background-surface)' }}>
              <VStack gap={2}>
                <Heading level={4}>Manager Tier</Heading>
                <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
                  Email: <strong>manager@example.com</strong>
                </Text>
                <Text size="xsm">
                  Operational control: product & supplier management, purchase order approvals, inter-warehouse transfers, stock adjustments.
                </Text>
                <Button
                  label="Switch to Manager"
                  variant={user?.role === 'manager' ? 'secondary' : 'primary'}
                  size="sm"
                  isDisabled={user?.role === 'manager' || isSwitching}
                  onClick={() => handleRoleSwitch('manager')}
                />
              </VStack>
            </Card>

            <Card style={{ backgroundColor: 'var(--color-background-surface)' }}>
              <VStack gap={2}>
                <Heading level={4}>Staff Tier</Heading>
                <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
                  Email: <strong>staff@example.com</strong>
                </Text>
                <Text size="xsm">
                  Warehouse floor associate: view inventory, create inbound stock-in receipts and outbound fulfillment requests.
                </Text>
                <Button
                  label="Switch to Staff"
                  variant={user?.role === 'staff' ? 'secondary' : 'primary'}
                  size="sm"
                  isDisabled={user?.role === 'staff' || isSwitching}
                  onClick={() => handleRoleSwitch('staff')}
                />
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </Card>

      {/* Visual Theme Appearance Card */}
      <Card>
        <VStack gap={3}>
          <Heading level={3}>Visual Theme & Interface Appearance</Heading>
          <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
            Switch between Meta Astryx light, dark, or system OS adaptive appearance modes.
          </Text>

          <HStack gap={4} vAlign="center">
            <Selector
              label="Color Theme Mode"
              options={themeOptions}
              value={colorMode}
              onChange={val => onColorModeChange(val as 'light' | 'dark' | 'system')}
              style={{ width: 240 }}
            />
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
              Powered by Astryx Neutral Design System theme tokens.
            </Text>
          </HStack>
        </VStack>
      </Card>

      {/* Telemetry & Architecture Card */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>Backend Architecture & Infrastructure Telemetry</Heading>
            <HealthStatusIndicator isHealthy={health?.status === 'ok'} />
          </HStack>

          <Grid columns={2} gap={4}>
            <VStack gap={2}>
              <Text weight="semibold">API Service</Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Framework: <strong>Python FastAPI (Async REST Engine)</strong>
              </Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Status: <strong>{health?.status || 'connecting...'}</strong> (Version: {health?.version || '1.0.0'})
              </Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                OpenAPI Docs: <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>/docs (Swagger UI)</a>
              </Text>
            </VStack>

            <VStack gap={2}>
              <Text weight="semibold">Database & Persistence</Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Storage Engine: <strong>SQLite (inventory.db)</strong>
              </Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                ORM & Migrations: <strong>SQLAlchemy 2.0 + Alembic</strong>
              </Text>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Security: <strong>JWT HS256 + Passlib BCrypt hashing</strong>
              </Text>
            </VStack>
          </Grid>
        </VStack>
      </Card>
    </VStack>
  );
}
