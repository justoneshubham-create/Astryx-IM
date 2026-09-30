import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import type { Product, Category, Supplier } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductModal({
  isOpen,
  productToEdit,
  categories,
  suppliers,
  onClose,
  onSuccess,
}: ProductModalProps) {
  const { success, error } = useNotification();
  const isEditing = !!productToEdit;

  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [unit, setUnit] = useState<string>('pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [maxStockLevel, setMaxStockLevel] = useState<number>(100);
  const [barcode, setBarcode] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setCategoryId(productToEdit.category_id.toString());
      setSupplierId(productToEdit.supplier_id ? productToEdit.supplier_id.toString() : '');
      setUnit(productToEdit.unit || 'pcs');
      setCostPrice(productToEdit.cost_price || 0);
      setSellingPrice(productToEdit.selling_price || 0);
      setMinStockLevel(productToEdit.min_stock_level || 10);
      setMaxStockLevel(productToEdit.max_stock_level || 100);
      setBarcode(productToEdit.barcode || '');
      setStatus(productToEdit.status || 'active');
    } else {
      setSku('');
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id.toString() || '');
      setSupplierId(suppliers[0]?.id.toString() || '');
      setUnit('pcs');
      setCostPrice(0);
      setSellingPrice(0);
      setMinStockLevel(10);
      setMaxStockLevel(100);
      setBarcode('');
      setStatus('active');
    }
  }, [productToEdit, categories, suppliers, isOpen]);

  const handleSubmit = async () => {
    if (!sku.trim() || !name.trim() || !categoryId) {
      error('SKU, Product Name, and Category are mandatory fields.');
      return;
    }

    if (minStockLevel < 0 || maxStockLevel < minStockLevel) {
      error('Maximum stock level must be greater than or equal to minimum stock level.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Product> = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: parseInt(categoryId, 10),
        supplier_id: supplierId ? parseInt(supplierId, 10) : undefined,
        unit: unit.trim() || 'pcs',
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        min_stock_level: Number(minStockLevel) || 10,
        max_stock_level: Number(maxStockLevel) || 100,
        barcode: barcode.trim() || undefined,
        status,
      };

      if (isEditing && productToEdit) {
        await api.products.update(productToEdit.id, payload);
        success(`Product "${payload.name}" updated successfully.`);
      } else {
        await api.products.create(payload);
        success(`Product "${payload.name}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map(c => ({
    value: c.id.toString(),
    label: c.name,
  }));

  const supplierOptions = [
    { value: '', label: 'None' },
    ...suppliers.map(s => ({
      value: s.id.toString(),
      label: s.name,
    })),
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'discontinued', label: 'Discontinued' },
  ];

  const unitOptions = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'box', label: 'Boxes (box)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'm', label: 'Meters (m)' },
    { value: 'pack', label: 'Pack' },
    { value: 'set', label: 'Set' },
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => !open && onClose()} purpose="form" width={640}>
      <Layout
        header={
          <DialogHeader
            title={isEditing ? `Edit Product — ${productToEdit?.sku}` : 'Add New Product'}
            subtitle={
              isEditing
                ? 'Update specifications, thresholds, and supplier details.'
                : 'Register a new catalog item with SKU and pricing parameters.'
            }
            onOpenChange={onClose}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <TextInput
                  label="SKU (Stock Keeping Unit)"
                  value={sku}
                  onChange={setSku}
                  placeholder="e.g. ELEC-001"
                  isRequired
                />
                <TextInput
                  label="Barcode / UPC / EAN"
                  value={barcode}
                  onChange={setBarcode}
                  placeholder="e.g. 789012345678"
                />
              </HStack>

              <TextInput
                label="Product Name"
                value={name}
                onChange={setName}
                placeholder="e.g. Ergonomic Office Desk Chair"
                isRequired
              />

              <TextArea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Product specifications, materials, warranty..."
              />

              <HStack gap={3}>
                <Selector
                  label="Category"
                  options={categoryOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  isRequired
                />
                <Selector
                  label="Default Supplier"
                  options={supplierOptions}
                  value={supplierId}
                  onChange={setSupplierId}
                />
              </HStack>

              <HStack gap={3}>
                <Selector
                  label="Unit of Measure (UOM)"
                  options={unitOptions}
                  value={unit}
                  onChange={setUnit}
                />
                <Selector
                  label="Status"
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                />
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label="Cost Price ($)"
                  value={costPrice}
                  onChange={setCostPrice}
                  min={0}
                  step={0.01}
                />
                <NumberInput
                  label="Selling Price ($)"
                  value={sellingPrice}
                  onChange={setSellingPrice}
                  min={0}
                  step={0.01}
                />
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label="Minimum Stock Threshold"
                  value={minStockLevel}
                  onChange={setMinStockLevel}
                  min={0}
                  hasNumberSteppers
                  description="Triggers low-stock dashboard alert"
                />
                <NumberInput
                  label="Maximum Capacity Threshold"
                  value={maxStockLevel}
                  onChange={setMaxStockLevel}
                  min={1}
                  hasNumberSteppers
                  description="Triggers over-stock warning"
                />
              </HStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={isSubmitting} />
              <Button
                label={isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
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
