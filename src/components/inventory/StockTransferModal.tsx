import React, { useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Warehouse, Product, InventoryItem } from '../../types';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
  products: Product[];
  currentInventory?: InventoryItem[];
}

export function StockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
  currentInventory = [],
}: StockTransferModalProps) {
  const { success, error } = useNotification();
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>(
    warehouses[0]?.id.toString() || ''
  );
  const [destWarehouseId, setDestWarehouseId] = useState<string>(
    warehouses[1]?.id.toString() || ''
  );
  const [productId, setProductId] = useState<string>(products[0]?.id.toString() || '');
  const [quantity, setQuantity] = useState<number>(5);
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `TRF-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check available stock in source warehouse
  const matchedInventory = currentInventory.find(
    inv => inv.warehouse_id.toString() === sourceWarehouseId && inv.product_id.toString() === productId
  );
  const sourceAvailable = matchedInventory ? matchedInventory.available_quantity : 0;
  const selectedProduct = products.find(p => p.id.toString() === productId);

  const handleSubmit = async () => {
    if (!sourceWarehouseId || !destWarehouseId || !productId) {
      error('Please select source warehouse, destination warehouse, and product.');
      return;
    }

    if (sourceWarehouseId === destWarehouseId) {
      error('Source warehouse and destination warehouse must be different.');
      return;
    }

    if (quantity <= 0) {
      error('Transfer quantity must be greater than 0.');
      return;
    }

    if (quantity > sourceAvailable) {
      error(
        `Insufficient stock in source warehouse. Only ${sourceAvailable} units are available for transfer.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.inventory.transfer({
        source_warehouse_id: parseInt(sourceWarehouseId, 10),
        destination_warehouse_id: parseInt(destWarehouseId, 10),
        product_id: parseInt(productId, 10),
        quantity,
        reference_number: referenceNumber,
        notes: notes.trim() || undefined,
      });

      success(`Successfully transferred ${quantity} units between warehouses.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const warehouseOptions = warehouses.map(w => ({
    value: w.id.toString(),
    label: `${w.name} (${w.code})`,
  }));

  const productOptions = products.map(p => ({
    value: p.id.toString(),
    label: `${p.name} — ${p.sku}`,
  }));

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={560}>
      <Layout
        header={
          <DialogHeader
            title="Inter-Warehouse Stock Transfer"
            subtitle="Atomically move inventory between warehouse facilities."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <Selector
                  label="Source Warehouse (From)"
                  options={warehouseOptions}
                  value={sourceWarehouseId}
                  onChange={setSourceWarehouseId}
                  isRequired
                />
                <Selector
                  label="Destination Warehouse (To)"
                  options={warehouseOptions}
                  value={destWarehouseId}
                  onChange={setDestWarehouseId}
                  isRequired
                />
              </HStack>

              <Selector
                label="Product to Transfer"
                options={productOptions}
                value={productId}
                onChange={setProductId}
                isRequired
              />

              <HStack
                gap={2}
                style={{
                  padding: 'var(--spacing-2)',
                  backgroundColor: sourceAvailable > 0 ? 'var(--color-background-surface)' : 'var(--color-border-emphasized)',
                  borderRadius: 'var(--radius-element)',
                }}
              >
                <Text size="sm">
                  Available in Source Warehouse:{' '}
                  <strong style={{ color: sourceAvailable < quantity ? 'var(--color-destructive)' : 'var(--color-success)' }}>
                    {sourceAvailable} {selectedProduct?.unit || 'pcs'}
                  </strong>
                </Text>
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label="Transfer Quantity"
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={sourceAvailable > 0 ? sourceAvailable : 1}
                  isRequired
                  hasNumberSteppers
                  units={selectedProduct?.unit || 'pcs'}
                />

                <TextInput
                  label="Transfer Manifest / Reference"
                  value={referenceNumber}
                  onChange={setReferenceNumber}
                  isRequired
                />
              </HStack>

              <TextArea
                label="Transfer Memo & Logistics Info"
                value={notes}
                onChange={setNotes}
                placeholder="Logistics truck, dispatch driver, reason for warehouse rebalancing..."
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Transferring...' : 'Execute Stock Transfer'}
                variant="primary"
                onClick={handleSubmit}
                isDisabled={isSubmitting || sourceAvailable <= 0 || sourceWarehouseId === destWarehouseId}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
