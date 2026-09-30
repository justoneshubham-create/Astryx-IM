import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text, Heading } from '@astryxdesign/core/Text';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { PurchaseOrder } from '../../types';

interface ReceivePOModalProps {
  isOpen: boolean;
  purchaseOrder: PurchaseOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceivePOModal({
  isOpen,
  purchaseOrder,
  onClose,
  onSuccess,
}: ReceivePOModalProps) {
  const { success, error } = useNotification();
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (purchaseOrder) {
      const initial: Record<number, number> = {};
      purchaseOrder.items.forEach(item => {
        const remaining = Math.max(0, item.quantity - item.received_quantity);
        initial[item.id] = remaining;
      });
      setReceiveQtys(initial);
    }
  }, [purchaseOrder, isOpen]);

  if (!purchaseOrder) return null;

  const handleQtyChange = (itemId: number, qty: number) => {
    setReceiveQtys(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleSubmit = async () => {
    const itemsToReceive = Object.entries(receiveQtys)
      .map(([idStr, qty]) => ({
        item_id: parseInt(idStr, 10),
        received_quantity: Number(qty) || 0,
      }))
      .filter(item => item.received_quantity > 0);

    if (itemsToReceive.length === 0) {
      error('Please enter a quantity greater than 0 to receive.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedPO = await api.purchaseOrders.receive(purchaseOrder.id, {
        warehouse_id: purchaseOrder.warehouse_id,
        items: itemsToReceive,
      });

      success(
        `Successfully received shipment for PO ${updatedPO.po_number}. Status is now "${updatedPO.status}".`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to receive purchase order';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={640}>
      <Layout
        header={
          <DialogHeader
            title={`Receive Goods — ${purchaseOrder.po_number}`}
            subtitle={`Supplier: ${purchaseOrder.supplier_name} • Destination: ${purchaseOrder.warehouse_name}`}
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text>
                Specify the quantities actually delivered and verified at the warehouse loading dock:
              </Text>

              <VStack gap={3}>
                {purchaseOrder.items.map(item => {
                  const remaining = Math.max(0, item.quantity - item.received_quantity);
                  const currentInput = receiveQtys[item.id] ?? remaining;

                  return (
                    <HStack
                      key={item.id}
                      gap={3}
                      vAlign="center"
                      hAlign="between"
                      style={{
                        padding: 'var(--spacing-3)',
                        backgroundColor: 'var(--color-background-surface)',
                        borderRadius: 'var(--radius-element)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <VStack gap={1} style={{ flex: 1 }}>
                        <Heading level={4}>{item.product_name}</Heading>
                        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
                          SKU: {item.product_sku} | Ordered: {item.quantity} | Already Received: {item.received_quantity}
                        </Text>
                        <Text size="xsm" weight="semibold" style={{ color: 'var(--color-accent)' }}>
                          Remaining to deliver: {remaining}
                        </Text>
                      </VStack>

                      <NumberInput
                        label="Receive Now"
                        value={currentInput}
                        onChange={val => handleQtyChange(item.id, val)}
                        min={0}
                        max={remaining}
                        hasNumberSteppers
                        isDisabled={remaining <= 0}
                      />
                    </HStack>
                  );
                })}
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Receiving...' : 'Process Inbound Shipment'}
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
