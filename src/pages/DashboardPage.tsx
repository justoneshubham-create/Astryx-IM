import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Badge } from '@astryxdesign/core/Badge';
import { StockStatusToken, TransactionTypeToken } from '../components/common/StatusToken';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  DashboardSummary,
  InventoryTransaction,
  LowStockAlert,
  StockMovementPoint,
} from '../types';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenStockIn: (productId?: number) => void;
}

export function DashboardPage({ onNavigate, onOpenStockIn }: DashboardPageProps) {
  const { can } = useAuth();
  const [days, setDays] = useState<string>('30');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTx, setRecentTx] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = () => {
    setIsLoading(true);
    const daysNum = parseInt(days, 10) || 30;

    Promise.all([
      api.dashboard.getSummary(daysNum),
      api.transactions.getAll({ page_size: 6 }),
    ])
      .then(([summaryData, txData]) => {
        setSummary(summaryData);
        setRecentTx(txData.items);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [days]);

  const daysOptions = [
    { value: '7', label: 'Past 7 Days' },
    { value: '30', label: 'Past 30 Days' },
    { value: '90', label: 'Past 90 Days' },
  ];

  const lowStockColumns: TableColumn<LowStockAlert>[] = [
    {
      key: 'product_name',
      header: 'Product Item',
      renderCell: row => (
        <VStack gap={0}>
          <Text weight="medium">{row.product_name}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.sku}</Text>
        </VStack>
      ),
    },
    {
      key: 'current_quantity',
      header: 'Current Stock',
      renderCell: row => (
        <Text
          weight="bold"
          style={{
            color: row.is_out_of_stock ? 'var(--color-destructive)' : 'var(--color-warning)',
          }}
        >
          {row.current_quantity}
        </Text>
      ),
    },
    { key: 'min_stock_level', header: 'Safety Min' },
    {
      key: 'status',
      header: 'Risk State',
      renderCell: row => (
        <StockStatusToken status={row.is_out_of_stock ? 'Out of Stock' : 'Low Stock'} />
      ),
    },
    {
      key: 'action',
      header: 'Action',
      renderCell: row =>
        can('stock_in') ? (
          <Button
            label="Restock"
            variant="ghost"
            size="sm"
            onClick={() => onOpenStockIn(row.product_id)}
          />
        ) : null,
    },
  ];

  const txColumns: TableColumn<InventoryTransaction>[] = [
    {
      key: 'created_at',
      header: 'Date & Time',
      renderCell: row => (
        <Text size="sm">
          {new Date(row.created_at).toLocaleDateString()} {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ),
    },
    {
      key: 'product_name',
      header: 'Product',
      renderCell: row => (
        <VStack gap={0}>
          <Text size="sm" weight="medium">{row.product_name}</Text>
          <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{row.warehouse_name}</Text>
        </VStack>
      ),
    },
    {
      key: 'transaction_type',
      header: 'Type',
      renderCell: row => <TransactionTypeToken type={row.transaction_type} />,
    },
    {
      key: 'quantity',
      header: 'Units',
      renderCell: row => {
        const isAdd =
          row.transaction_type === 'STOCK_IN' ||
          row.transaction_type === 'TRANSFER_IN' ||
          (row.transaction_type === 'ADJUSTMENT' && row.after_quantity > row.before_quantity);
        return (
          <Text
            weight="semibold"
            style={{ color: isAdd ? 'var(--color-success)' : 'var(--color-destructive)' }}
          >
            {isAdd ? `+${row.quantity}` : `-${row.quantity}`}
          </Text>
        );
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      renderCell: row => (
        <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>
          {row.before_quantity} → <strong>{row.after_quantity}</strong>
        </Text>
      ),
    },
    {
      key: 'user_name',
      header: 'Operator',
      renderCell: row => <Text size="xsm">{row.user_name || 'System'}</Text>,
    },
  ];

  if (isLoading && !summary) {
    return (
      <VStack gap={4} hAlign="center" style={{ padding: 'var(--spacing-10)' }}>
        <Spinner size="lg" />
        <Text>Loading live inventory analytics...</Text>
      </VStack>
    );
  }

  const kpis = summary?.kpis;
  const movements = summary?.stock_movements || [];

  return (
    <VStack gap={6}>
      {/* Header bar with date filter and quick CTA */}
      <HStack hAlign="between" vAlign="center">
        <VStack gap={1}>
          <Heading level={2}>Inventory Intelligence Dashboard</Heading>
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Real-time stock analytics, inventory replenishment velocity, and facility telemetry.
          </Text>
        </VStack>

        <HStack gap={3} vAlign="center">
          <Selector
            label="Time Window"
            isLabelHidden
            options={daysOptions}
            value={days}
            onChange={setDays}
          />
          {can('stock_in') && (
            <Button
              label="+ Stock In"
              variant="primary"
              onClick={() => onOpenStockIn()}
            />
          )}
        </HStack>
      </HStack>

      {/* KPI 8-card Grid */}
      <Grid columns={4} gap={4}>
        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Total Catalog Products</Text>
            <Heading level={2}>{kpis?.total_products ?? 0}</Heading>
            <HStack gap={1} vAlign="center">
              <Badge label={String(kpis?.total_categories ?? 0)} />
              <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Categories configured</Text>
            </HStack>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Total Stock In Hand</Text>
            <Heading level={2}>{kpis?.total_stock_quantity ?? 0}</Heading>
            <HStack gap={1} vAlign="center">
              <Badge label={String(kpis?.total_warehouses ?? 0)} />
              <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Active warehouses</Text>
            </HStack>
          </VStack>
        </Card>

        <Card style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Low Stock Warnings</Text>
            <Heading level={2} style={{ color: 'var(--color-warning)' }}>
              {kpis?.low_stock_products_count ?? 0}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Below safety threshold</Text>
          </VStack>
        </Card>

        <Card style={{ borderLeft: '4px solid var(--color-destructive)' }}>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Out of Stock Items</Text>
            <Heading level={2} style={{ color: 'var(--color-destructive)' }}>
              {kpis?.out_of_stock_products_count ?? 0}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Requires urgent replenishment</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Inbound Goods (Month)</Text>
            <Heading level={2} style={{ color: 'var(--color-success)' }}>
              +{kpis?.stock_in_this_month ?? 0}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Received units this month</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Outbound Fulfillments (Month)</Text>
            <Heading level={2} style={{ color: 'var(--color-accent)' }}>
              -{kpis?.stock_out_this_month ?? 0}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Dispatched units this month</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Active Warehouses</Text>
            <Heading level={2}>{kpis?.total_warehouses ?? 0}</Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Storage & distribution sites</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={1}>
            <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>Inventory Health Score</Text>
            <Heading level={2} style={{ color: 'var(--color-success)' }}>
              {kpis && kpis.total_products > 0
                ? `${Math.round(
                    ((kpis.total_products - (kpis.low_stock_products_count + kpis.out_of_stock_products_count)) /
                      kpis.total_products) *
                      100
                  )}%`
                : '100%'}
            </Heading>
            <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>Stocked within safety bounds</Text>
          </VStack>
        </Card>
      </Grid>

      {/* Movement Velocity Chart / Overview */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={0}>
              <Heading level={3}>Stock Movement Velocity & Timeline</Heading>
              <Text size="sm" style={{ color: 'var(--color-text-secondary)' }}>
                Comparing Stock In (Received), Stock Out (Fulfilled), and Inter-Facility Transfers.
              </Text>
            </VStack>

            <HStack gap={4}>
              <HStack gap={1} vAlign="center">
                <Text size="xsm" style={{ color: 'var(--color-success)', fontWeight: 600 }}>■ Stock In</Text>
              </HStack>
              <HStack gap={1} vAlign="center">
                <Text size="xsm" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>■ Stock Out</Text>
              </HStack>
              <HStack gap={1} vAlign="center">
                <Text size="xsm" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>■ Transfers</Text>
              </HStack>
            </HStack>
          </HStack>

          {/* Clean Astryx Bar / Visual Flow */}
          <VStack gap={3}>
            {movements.length === 0 ? (
              <Text style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-secondary)' }}>
                No stock movement events recorded in this time range.
              </Text>
            ) : (
              movements.slice(-8).map((point: StockMovementPoint) => {
                const maxVal = Math.max(point.stock_in, point.stock_out, point.transfers, 1);
                return (
                  <HStack key={point.date} gap={3} vAlign="center">
                    <Text size="xsm" style={{ width: 85, color: 'var(--color-text-secondary)' }}>
                      {point.date}
                    </Text>
                    <VStack gap={1} style={{ flex: 1 }}>
                      {/* Bar tracks */}
                      <HStack gap={2} vAlign="center">
                        <HStack
                          style={{
                            height: 8,
                            width: `${Math.min(100, Math.max(4, (point.stock_in / maxVal) * 100))}%`,
                            backgroundColor: 'var(--color-success)',
                            borderRadius: 'var(--radius-inner)',
                          }}
                        />
                        <Text size="xsm" weight="medium">+{point.stock_in}</Text>
                      </HStack>
                      <HStack gap={2} vAlign="center">
                        <HStack
                          style={{
                            height: 8,
                            width: `${Math.min(100, Math.max(4, (point.stock_out / maxVal) * 100))}%`,
                            backgroundColor: 'var(--color-accent)',
                            borderRadius: 'var(--radius-inner)',
                          }}
                        />
                        <Text size="xsm" weight="medium">-{point.stock_out}</Text>
                      </HStack>
                    </VStack>
                  </HStack>
                );
              })
            )}
          </VStack>
        </VStack>
      </Card>

      {/* Two-column Section: Low Stock Alerts + Recent Transactions */}
      <Grid columns={2} gap={4}>
        <GridSpan columns={1}>
          <Card>
            <VStack gap={3}>
              <HStack hAlign="between" vAlign="center">
                <HStack gap={2} vAlign="center">
                  <Heading level={3}>Low Stock & Out of Stock Alerts</Heading>
                  <Badge label={String(summary?.low_stock_alerts.length ?? 0)} />
                </HStack>
                <Button
                  label="View Full Inventory"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('inventory')}
                />
              </HStack>

              <Table
                idKey="product_id"
                columns={lowStockColumns}
                data={summary?.low_stock_alerts || []}
                hasHover
                emptyState={<Text style={{ padding: 'var(--spacing-3)' }}>All products are stocked above minimum safety thresholds!</Text>}
              />
            </VStack>
          </Card>
        </GridSpan>

        <GridSpan columns={1}>
          <Card>
            <VStack gap={3}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>Recent Stock Transactions</Heading>
                <Button
                  label="View All Logs"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('transactions')}
                />
              </HStack>

              <Table
                idKey="id"
                columns={txColumns}
                data={recentTx}
                hasHover
                emptyState={<Text style={{ padding: 'var(--spacing-3)' }}>No transactions recorded yet.</Text>}
              />
            </VStack>
          </Card>
        </GridSpan>
      </Grid>
    </VStack>
  );
}
