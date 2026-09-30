import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Warehouse, Product, InventoryItem } from '../../types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
  products: Product[];
  currentInventory?: InventoryItem[];
}

const auditReasons = [
  { value: 'Cycle count discrepancy', label: 'Periodic Physical Cycle Count' },
  { value: 'Damaged during handling', label: 'Damaged Goods Discovered' },
  { value: 'Found unrecorded stock', label: 'Found Unrecorded Surplus Stock' },
  { value: 'Shrinkage / Loss', label: 'Suspected Shrinkage / Inventory Loss' },
  { value: 'Unit conversion correction', label: 'Packaging / UOM Correction' },
];

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
  currentInventory = [],
}: StockAdjustmentModalProps) {
  const { success, error } = useNotification();
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id.toString() || '');
  const [productId, setProductId] = useState<string>(products[0]?.id.toString() || '');
  const [physicalQuantity, setPhysicalQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('Cycle count discrepancy');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find system stock in selected warehouse
  const matchedInventory = currentInventory.find(
    inv => inv.warehouse_id.toString() === warehouseId && inv.product_id.toString() === productId
  );
  const systemQuantity = matchedInventory ? matchedInventory.quantity : 0;
  const selectedProduct = products.find(p => p.id.toString() === productId);

  useEffect(() => {
    setPhysicalQuantity(systemQuantity);
  }, [warehouseId, productId, systemQuantity]);

  const diff = physicalQuantity - systemQuantity;

  const handleSubmit = async () => {
    if (!warehouseId || !productId) {
      error('Please select both a warehouse and a product.');
      return;
    }
    if (physicalQuantity < 0) {
      error('Physical quantity cannot be negative.');
      return;
    }
    if (diff === 0) {
      error('Physical quantity matches system quantity. No adjustment needed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await api.inventory.adjustment({
        warehouse_id: parseInt(warehouseId, 10),
        product_id: parseInt(productId, 10),
        physical_quantity: physicalQuantity,
        reason,
        notes: notes.trim() || undefined,
      });

      success(
        `Stock adjusted for ${tx.product_name}. Changed by ${diff > 0 ? `+${diff}` : diff} units (Now: ${tx.after_quantity}).`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed';
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
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader
            title="Stock Adjustment / Physical Count Reconciliation"
            subtitle="Reconcile recorded system stock against verified physical counts."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Selector
                label="Warehouse Facility"
                options={warehouseOptions}
                value={warehouseId}
                onChange={setWarehouseId}
                isRequired
              />

              <Selector
                label="Product"
                options={productOptions}
                value={productId}
                onChange={setProductId}
                isRequired
              />

              <HStack
                gap={4}
                style={{
                  padding: 'var(--spacing-3)',
                  backgroundColor: 'var(--color-background-surface)',
                  borderRadius: 'var(--radius-element)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>System Recorded Stock</Text>
                  <Text weight="bold" size="lg">{systemQuantity} {selectedProduct?.unit || 'pcs'}</Text>
                </VStack>

                <VStack gap={1}>
                  <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Net Adjustment</Text>
                  <Text
                    weight="bold"
                    size="lg"
                    style={{
                      color: diff > 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-destructive)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {diff > 0 ? `+${diff}` : diff} {selectedProduct?.unit || 'pcs'}
                  </Text>
                </VStack>
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label="Verified Physical Quantity"
                  value={physicalQuantity}
                  onChange={setPhysicalQuantity}
                  min={0}
                  isRequired
                  hasNumberSteppers
                  units={selectedProduct?.unit || 'pcs'}
                />

                <Selector
                  label="Audit Discrepancy Reason"
                  options={auditReasons}
                  value={reason}
                  onChange={setReason}
                  isRequired
                />
              </HStack>

              <TextArea
                label="Audit Documentation & Notes"
                value={notes}
                onChange={setNotes}
                placeholder="Auditor name, cycle count batch number, root cause analysis..."
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Adjusting...' : 'Commit Inventory Adjustment'}
                variant="primary"
                onClick={handleSubmit}
                isDisabled={isSubmitting || diff === 0}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
