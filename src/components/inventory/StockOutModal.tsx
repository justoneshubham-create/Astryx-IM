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

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
  products: Product[];
  currentInventory?: InventoryItem[];
  initialProductId?: number;
  initialWarehouseId?: number;
}

const reasons = [
  { value: 'Order Fulfillment', label: 'Order Fulfillment / Sales Order' },
  { value: 'Internal Usage', label: 'Internal Operations / Department Usage' },
  { value: 'Damaged / Scrapped', label: 'Damaged / Expired / Scrapped' },
  { value: 'Sample / Demo', label: 'Customer Sample / Demo Unit' },
  { value: 'Audit Adjustment', label: 'Inventory Audit Discrepancy' },
];

export function StockOutModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
  currentInventory = [],
  initialProductId,
  initialWarehouseId,
}: StockOutModalProps) {
  const { success, error } = useNotification();
  const [warehouseId, setWarehouseId] = useState<string>(
    initialWarehouseId ? initialWarehouseId.toString() : warehouses[0]?.id.toString() || ''
  );
  const [productId, setProductId] = useState<string>(
    initialProductId ? initialProductId.toString() : products[0]?.id.toString() || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Order Fulfillment');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `OUT-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find available stock in selected warehouse
  const matchedInventory = currentInventory.find(
    inv => inv.warehouse_id.toString() === warehouseId && inv.product_id.toString() === productId
  );
  const availableStock = matchedInventory ? matchedInventory.available_quantity : 0;
  const selectedProduct = products.find(p => p.id.toString() === productId);

  const handleSubmit = async () => {
    if (!warehouseId || !productId) {
      error('Please select both a warehouse and a product.');
      return;
    }
    if (quantity <= 0) {
      error('Quantity must be greater than 0.');
      return;
    }

    if (quantity > availableStock) {
      error(
        `Insufficient stock! Requested ${quantity} units, but only ${availableStock} ${selectedProduct?.unit || 'units'} are available in this warehouse.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await api.inventory.stockOut({
        warehouse_id: parseInt(warehouseId, 10),
        product_id: parseInt(productId, 10),
        quantity,
        reason,
        reference_number: referenceNumber,
        notes: notes.trim() || undefined,
      });

      success(
        `Successfully issued ${quantity} units of ${tx.product_name}. Remaining stock: ${tx.after_quantity}.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stock out operation failed';
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
            title="Stock Out — Issue Inventory"
            subtitle="Deduct inventory for customer fulfillment, internal usage, or disposal."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Selector
                label="Source Warehouse"
                options={warehouseOptions}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Select source warehouse"
                isRequired
              />

              <Selector
                label="Product"
                options={productOptions}
                value={productId}
                onChange={setProductId}
                placeholder="Select product to issue"
                isRequired
              />

              <HStack
                gap={2}
                style={{
                  padding: 'var(--spacing-2)',
                  backgroundColor: availableStock > 0 ? 'var(--color-background-surface)' : 'var(--color-border-emphasized)',
                  borderRadius: 'var(--radius-element)',
                }}
              >
                <Text size="sm">
                  Available in Selected Warehouse:{' '}
                  <strong style={{ color: availableStock < quantity ? 'var(--color-destructive)' : 'var(--color-success)' }}>
                    {availableStock} {selectedProduct?.unit || 'pcs'}
                  </strong>
                </Text>
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label="Quantity to Issue"
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={availableStock > 0 ? availableStock : 1}
                  isRequired
                  hasNumberSteppers
                  units={selectedProduct?.unit || 'pcs'}
                />

                <Selector
                  label="Reason for Issue"
                  options={reasons}
                  value={reason}
                  onChange={setReason}
                  isRequired
                />
              </HStack>

              <TextInput
                label="Reference Number"
                value={referenceNumber}
                onChange={setReferenceNumber}
                placeholder="e.g. SO-10492 or DISP-442"
                isRequired
              />

              <TextArea
                label="Notes / Dispatch Details"
                value={notes}
                onChange={setNotes}
                placeholder="Delivery address, tracking code, department charge code..."
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Issuing...' : 'Complete Stock Out'}
                variant="primary"
                onClick={handleSubmit}
                isDisabled={isSubmitting || availableStock <= 0}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
