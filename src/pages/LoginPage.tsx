import React, { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { UserRole } from '../types';

export function LoginPage() {
  const { login, switchDemoUser } = useAuth();
  const { success, error } = useNotification();

  const [email, setEmail] = useState<string>('admin@example.com');
  const [password, setPassword] = useState<string>('admin123');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      error('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      success('Welcome back to Astryx Enterprise Inventory System.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsSubmitting(true);
    try {
      await switchDemoUser(role);
      success(`Signed in as demo ${role.toUpperCase()}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quick login failed';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack
      hAlign="center"
      vAlign="center"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background-body)',
        padding: 'var(--spacing-6)',
      }}
    >
      <Card width={460} style={{ padding: 'var(--spacing-6)', border: '1px solid var(--color-border)' }}>
        <VStack gap={5}>
          {/* Logo & Branding */}
          <VStack gap={1} hAlign="center" style={{ textAlign: 'center' }}>
            <HStack gap={2} vAlign="center">
              <Token label="Astryx Enterprise" color="blue" size="md" />
              <Token label="v1.0" color="gray" size="sm" />
            </HStack>
            <Heading level={2}>Inventory Management</Heading>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to manage warehouse assets, stock transfers, and purchase requisitions.
            </Text>
          </VStack>

          {/* Login Form */}
          <VStack gap={4}>
            <TextInput
              label="Work Email"
              value={email}
              onChange={setEmail}
              placeholder="admin@example.com"
              isRequired
            />

            <TextInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              isRequired
            />

            <Button
              label={isSubmitting ? 'Signing in...' : 'Sign In with Email'}
              variant="primary"
              size="lg"
              onClick={() => handleSubmit()}
              isDisabled={isSubmitting}
            />
          </VStack>

          {/* Quick Demo Logins */}
          <VStack
            gap={3}
            style={{
              paddingTop: 'var(--spacing-4)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <Text size="xsm" weight="semibold" style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              ONE-CLICK DEMO AUTHENTICATION:
            </Text>

            <HStack gap={2} hAlign="center">
              <Button
                label="Admin"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickDemo('admin')}
                isDisabled={isSubmitting}
              />
              <Button
                label="Manager"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickDemo('manager')}
                isDisabled={isSubmitting}
              />
              <Button
                label="Staff"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickDemo('staff')}
                isDisabled={isSubmitting}
              />
            </HStack>
          </VStack>
        </VStack>
      </Card>
    </VStack>
  );
}
