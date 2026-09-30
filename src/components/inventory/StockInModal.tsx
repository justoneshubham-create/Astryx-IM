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
import type { Warehouse, Product, Supplier } from '../../types';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
  products: Product[];
  suppliers: Supplier[];
  initialProductId?: number;
  initialWarehouseId?: number;
}

export function StockInModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
  suppliers,
  initialProductId,
  initialWarehouseId,
}: StockInModalProps) {
  const { success, error } = useNotification();
  const [warehouseId, setWarehouseId] = useState<string>(
    initialWarehouseId ? initialWarehouseId.toString() : warehouses[0]?.id.toString() || ''
  );
  const [productId, setProductId] = useState<string>(
    initialProductId ? initialProductId.toString() : products[0]?.id.toString() || ''
  );
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id.toString() || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `IN-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedProduct = products.find(p => p.id.toString() === productId);

  // Sync unit cost when product changes if not explicitly modified
  const handleProductChange = (val: string) => {
    setProductId(val);
    const p = products.find(prod => prod.id.toString() === val);
    if (p) {
      setUnitCost(p.cost_price || 0);
    }
  };

  const handleSubmit = async () => {
    if (!warehouseId || !productId) {
      error('Please select both a warehouse and a product.');
      return;
    }
    if (quantity <= 0) {
      error('Quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await api.inventory.stockIn({
        warehouse_id: parseInt(warehouseId, 10),
        product_id: parseInt(productId, 10),
        supplier_id: supplierId ? parseInt(supplierId, 10) : undefined,
        quantity,
        unit_cost: unitCost > 0 ? unitCost : undefined,
        reference_number: referenceNumber,
        notes: notes.trim() || undefined,
      });

      success(
        `Successfully received ${quantity} units of ${tx.product_name}. New stock: ${tx.after_quantity}.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record stock in';
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

  const supplierOptions = [
    { value: '', label: 'None (Direct / Internal)' },
    ...suppliers.map(s => ({
      value: s.id.toString(),
      label: s.name,
    })),
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader
            title="Stock In — Receive Inventory"
            subtitle="Add incoming goods to a destination warehouse."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Selector
                label="Destination Warehouse"
                options={warehouseOptions}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Select destination warehouse"
                isRequired
              />

              <Selector
                label="Product"
                options={productOptions}
                value={productId}
                onChange={handleProductChange}
                placeholder="Select product to receive"
                isRequired
              />

              <Selector
                label="Supplier (Optional)"
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Select supplier"
              />

              <HStack gap={3}>
                <NumberInput
                  label="Quantity"
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  isRequired
                  hasNumberSteppers
                  units={selectedProduct?.unit || 'pcs'}
                />
                <NumberInput
                  label="Unit Cost ($)"
                  value={unitCost}
                  onChange={setUnitCost}
                  min={0}
                  step={0.01}
                />
              </HStack>

              <TextInput
                label="Reference Number"
                value={referenceNumber}
                onChange={setReferenceNumber}
                placeholder="e.g. PO-8923 or BL-9921"
                isRequired
              />

              <TextArea
                label="Notes / Inspection Memo"
                value={notes}
                onChange={setNotes}
                placeholder="Add shipment notes, condition inspection, pallet numbers..."
              />

              {selectedProduct && (
                <HStack gap={2} style={{ color: 'var(--color-text-secondary)' }}>
                  <Text size="sm">
                    Current Global Stock: <strong>{selectedProduct.total_quantity} {selectedProduct.unit}</strong> | Min Threshold: <strong>{selectedProduct.min_stock_level}</strong>
                  </Text>
                </HStack>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Receiving...' : 'Complete Stock In'}
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
