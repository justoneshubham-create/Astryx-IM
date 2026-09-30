import React, { useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Text, Heading } from '@astryxdesign/core/Text';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Supplier, Warehouse, Product } from '../../types';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: Product[];
}

interface POLineDraft {
  productId: string;
  quantity: number;
  unitCost: number;
}

export function CreatePOModal({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  warehouses,
  products,
}: CreatePOModalProps) {
  const { success, error } = useNotification();
  const [poNumber, setPoNumber] = useState<string>(
    `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  );
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id.toString() || '');
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id.toString() || '');
  const [expectedDate, setExpectedDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<POLineDraft[]>([
    {
      productId: products[0]?.id.toString() || '',
      quantity: 50,
      unitCost: products[0]?.cost_price || 10,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleProductChange = (index: number, prodId: string) => {
    const updated = [...lines];
    const prod = products.find(p => p.id.toString() === prodId);
    updated[index] = {
      ...updated[index],
      productId: prodId,
      unitCost: prod?.cost_price || 0,
    };
    setLines(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], quantity: qty };
    setLines(updated);
  };

  const handleCostChange = (index: number, cost: number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], unitCost: cost };
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        productId: products[0]?.id.toString() || '',
        quantity: 20,
        unitCost: products[0]?.cost_price || 10,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      error('Purchase order must have at least one product line.');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const grandTotal = lines.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);

  const handleSubmit = async () => {
    if (!poNumber.trim() || !supplierId || !warehouseId) {
      error('PO Number, Supplier, and Receiving Warehouse are required.');
      return;
    }

    if (lines.some(l => !l.productId || l.quantity <= 0)) {
      error('All order lines must have a valid product and quantity > 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.purchaseOrders.create({
        po_number: poNumber.trim().toUpperCase(),
        supplier_id: parseInt(supplierId, 10),
        warehouse_id: parseInt(warehouseId, 10),
        expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        status: 'Pending',
        notes: notes.trim() || undefined,
        items: lines.map(l => ({
          product_id: parseInt(l.productId, 10),
          quantity: l.quantity,
          unit_cost: l.unitCost,
        })),
      });

      success(`Purchase Order ${poNumber} created successfully.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create purchase order';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierOptions = suppliers.map(s => ({
    value: s.id.toString(),
    label: s.name,
  }));

  const warehouseOptions = warehouses.map(w => ({
    value: w.id.toString(),
    label: `${w.name} (${w.code})`,
  }));

  const productOptions = products.map(p => ({
    value: p.id.toString(),
    label: `${p.name} (${p.sku})`,
  }));

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={720}>
      <Layout
        header={
          <DialogHeader
            title="Create Purchase Order"
            subtitle="Draft and submit a formal vendor procurement requisition."
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <TextInput
                  label="Purchase Order Number"
                  value={poNumber}
                  onChange={setPoNumber}
                  placeholder="e.g. PO-2026-0042"
                  isRequired
                />
                <TextInput
                  label="Expected Delivery Date"
                  value={expectedDate}
                  onChange={setExpectedDate}
                  placeholder="YYYY-MM-DD"
                />
              </HStack>

              <HStack gap={3}>
                <Selector
                  label="Vendor / Supplier"
                  options={supplierOptions}
                  value={supplierId}
                  onChange={setSupplierId}
                  isRequired
                />
                <Selector
                  label="Receiving Warehouse Facility"
                  options={warehouseOptions}
                  value={warehouseId}
                  onChange={setWarehouseId}
                  isRequired
                />
              </HStack>

              <TextArea
                label="Procurement Instructions / Terms"
                value={notes}
                onChange={setNotes}
                placeholder="FOB Terms, shipping carrier, payment terms..."
              />

              <VStack gap={3}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Order Line Items</Heading>
                  <Button label="+ Add Item Row" variant="secondary" size="sm" onClick={addLine} />
                </HStack>

                {lines.map((line, idx) => {
                  const lineTotal = line.quantity * line.unitCost;
                  return (
                    <HStack
                      key={idx}
                      gap={3}
                      vAlign="end"
                      style={{
                        padding: 'var(--spacing-3)',
                        backgroundColor: 'var(--color-background-surface)',
                        borderRadius: 'var(--radius-element)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Selector
                        label={`Item #${idx + 1}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={val => handleProductChange(idx, val)}
                        isRequired
                      />
                      <NumberInput
                        label="Quantity"
                        value={line.quantity}
                        onChange={val => handleQuantityChange(idx, val)}
                        min={1}
                        hasNumberSteppers
                      />
                      <NumberInput
                        label="Unit Cost ($)"
                        value={line.unitCost}
                        onChange={val => handleCostChange(idx, val)}
                        min={0}
                        step={0.01}
                      />
                      <VStack gap={1} style={{ minWidth: 100 }}>
                        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Line Total</Text>
                        <Text weight="bold">${lineTotal.toFixed(2)}</Text>
                      </VStack>
                      <Button
                        label="Remove"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(idx)}
                      />
                    </HStack>
                  );
                })}

                <HStack
                  hAlign="between"
                  vAlign="center"
                  style={{
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'var(--color-border-emphasized)',
                    borderRadius: 'var(--radius-element)',
                  }}
                >
                  <Text weight="semibold">Total Procurement Amount</Text>
                  <Heading level={3}>${grandTotal.toFixed(2)}</Heading>
                </HStack>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Submitting...' : 'Issue Purchase Order'}
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
