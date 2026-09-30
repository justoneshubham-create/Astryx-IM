import React from 'react';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { HStack } from '@astryxdesign/core/Stack';

export function StockStatusToken({ status }: { status: string }) {
  const norm = status.toLowerCase();
  if (norm.includes('out')) {
    return <Token label="Out of Stock" color="red" size="sm" />;
  }
  if (norm.includes('low')) {
    return <Token label="Low Stock" color="yellow" size="sm" />;
  }
  if (norm.includes('over')) {
    return <Token label="Over Stock" color="purple" size="sm" />;
  }
  return <Token label="In Stock" color="green" size="sm" />;
}

export function RoleToken({ role }: { role: string }) {
  const norm = role.toLowerCase();
  if (norm === 'admin') {
    return <Token label="Admin" color="purple" size="sm" />;
  }
  if (norm === 'manager') {
    return <Token label="Manager" color="blue" size="sm" />;
  }
  return <Token label="Staff" color="teal" size="sm" />;
}

export function TransactionTypeToken({ type }: { type: string }) {
  switch (type) {
    case 'STOCK_IN':
      return <Token label="Stock In" color="green" size="sm" />;
    case 'STOCK_OUT':
      return <Token label="Stock Out" color="orange" size="sm" />;
    case 'TRANSFER_IN':
      return <Token label="Transfer In" color="blue" size="sm" />;
    case 'TRANSFER_OUT':
      return <Token label="Transfer Out" color="cyan" size="sm" />;
    case 'ADJUSTMENT':
      return <Token label="Adjustment" color="yellow" size="sm" />;
    default:
      return <Token label={type} color="default" size="sm" />;
  }
}

export function POStatusToken({ status }: { status: string }) {
  switch (status) {
    case 'Received':
      return <Token label="Received" color="green" size="sm" />;
    case 'Partially Received':
      return <Token label="Partially Received" color="yellow" size="sm" />;
    case 'Approved':
      return <Token label="Approved" color="blue" size="sm" />;
    case 'Pending':
      return <Token label="Pending" color="orange" size="sm" />;
    case 'Cancelled':
      return <Token label="Cancelled" color="red" size="sm" />;
    case 'Draft':
    default:
      return <Token label={status || 'Draft'} color="gray" size="sm" />;
  }
}

export function HealthStatusIndicator({ isHealthy }: { isHealthy: boolean }) {
  return (
    <HStack gap={1} vAlign="center">
      <StatusDot
        variant={isHealthy ? 'success' : 'error'}
        label={isHealthy ? 'System Online' : 'Service Disrupted'}
        isPulsing={isHealthy}
      />
    </HStack>
  );
}
