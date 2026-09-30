import React from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onCancel()} purpose="required" width={440}>
      <Layout
        header={<DialogHeader title={title} onOpenChange={onCancel} />}
        content={
          <LayoutContent>
            <VStack gap={3}>
              <Text>{message}</Text>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label={cancelLabel} variant="secondary" onClick={onCancel} isDisabled={isLoading} />
              <Button
                label={isLoading ? 'Processing...' : confirmLabel}
                variant="primary"
                onClick={onConfirm}
                isDisabled={isLoading}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
