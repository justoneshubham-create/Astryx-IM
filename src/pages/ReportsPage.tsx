import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';
import { api } from '../api/client';
import type { Product, Warehouse, InventoryItem, DashboardSummary } from '../types';

export function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.products.getAll({ page_size: 100 }),
      api.warehouses.getAll(),
      api.inventory.getAll({ page_size: 100 }),
      api.dashboard.getSummary(30),
    ])
      .then(([prods, whs, invs, dash]) => {
        setProducts(prods.items);
        setWarehouses(whs);
        setInventory(invs.items);
        setDashboard(dash);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <VStack gap={4} hAlign="center" style={{ padding: 'var(--spacing-10)' }}>
        <Spinner size="lg" />
        <Text>Calculating inventory financial valuations and metrics...</Text>
      </VStack>
    );
  }

  // Calculate financial valuation
  const totalCostValuation = products.reduce(
    (acc, p) => acc + (p.cost_price || 0) * (p.total_quantity || 0),
    0
  );
  const totalRetailValuation = products.reduce(
    (acc, p) => acc + (p.selling_price || 0) * (p.total_quantity || 0),
    0
  );
  const totalPotentialProfit = totalRetailValuation - totalCostValuation;
  const overallMargin =
    totalRetailValuation > 0
      ? ((totalPotentialProfit / totalRetailValuation) * 100).toFixed(1)
      : '0.0';

  // Warehouse breakdown calculation
  const warehouseStats: Array<Record<string, unknown> & {
    id: number;
    name: string;
    code: string;
    sku_count: number;
    total_units: number;
    inventory_value: number;
  }> = warehouses.map(wh => {
    const whItems = inventory.filter(i => i.warehouse_id === wh.id);
    const totalUnits = whItems.reduce((acc, i) => acc + i.quantity, 0);
    const skuCount = whItems.length;
    const value = whItems.reduce((acc, i) => {
      const prod = products.find(p => p.id === i.product_id);
      return acc + (prod?.cost_price || 0) * i.quantity;
    }, 0);

    return {
      id: wh.id,
      name: wh.name,
      code: wh.code,
      sku_count: skuCount,
      total_units: totalUnits,
      inventory_value: value,
    };
  });

  const whColumns: TableColumn<typeof warehouseStats[number]>[] = [
    {
      key: 'name',
      header: 'Facility Name',
      renderCell: row => <Text weight="semibold">{row.name}</Text>,
    },
    {
      key: 'code',
      header: 'Code',
      renderCell: row => <Token label={row.code} color="blue" size="sm" />,
    },
    { key: 'sku_count', header: 'Distinct SKUs' },
    {
      key: 'total_units',
      header: 'Stocked Units',
      renderCell: row => <Text weight="bold">{row.total_units}</Text>,
    },
    {
      key: 'inventory_value',
      header: 'Asset Value (Cost Basis)',
      renderCell: row => (
        <Text weight="semibold" style={{ color: 'var(--color-success)' }}>
          ${row.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ];

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={2}>Executive Reports & Valuation Intelligence</Heading>
        <Text style={{ color: 'var(--color-text-secondary)' }}>
          Portfolio cost basis, retail sales capitalization, margin projections, and facility asset allocations.
        </Text>
      </VStack>

      {/* Financial Valuation Cards */}
      <Grid columns={4} gap={4}>
        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Inventory Asset Cost Basis</Text>
            <Heading level={2}>
              ${totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Total capital invested in stock</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Estimated Retail Market Value</Text>
            <Heading level={2} style={{ color: 'var(--color-accent)' }}>
              ${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Expected gross inventory turnover</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Projected Gross Margin</Text>
            <Heading level={2} style={{ color: 'var(--color-success)' }}>
              ${totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-success)' }}>
              {overallMargin}% Projected portfolio margin
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Safety Margin Health</Text>
            <Heading level={2}>
              {dashboard?.low_stock_alerts.length === 0 ? 'Optimal' : `${dashboard?.low_stock_alerts.length} Risks`}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Items needing replenishment</Text>
          </VStack>
        </Card>
      </Grid>

      {/* Warehouse Facility Asset Distribution */}
      <Card>
        <VStack gap={3}>
          <Heading level={3}>Facility Asset Valuation Breakdown</Heading>
          <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
            Financial capital distribution across regional storage docks and distribution hubs.
          </Text>
          <Table
            idKey="id"
            columns={whColumns}
            data={warehouseStats}
            hasHover
          />
        </VStack>
      </Card>
    </VStack>
  );
}
