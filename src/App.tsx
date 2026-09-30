import React, { useState } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from './themes/neutral/neutralTheme';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Selector } from '@astryxdesign/core/Selector';
import { RoleToken, HealthStatusIndicator } from './components/common/StatusToken';

import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

import type { UserRole } from './types';

function AppContent() {
  const { user, logout, switchDemoUser, can } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [inventoryAction, setInventoryAction] = useState<
    'stock-in' | 'stock-out' | 'transfer' | 'adjustment' | null
  >(null);
  const [inventoryProductId, setInventoryProductId] = useState<number | null>(null);
  const [colorMode, setColorMode] = useState<'light' | 'dark' | 'system'>('system');

  if (!user) {
    return <LoginPage />;
  }

  const handleOpenStockIn = (productId?: number) => {
    setCurrentPage('inventory');
    setInventoryAction('stock-in');
    setInventoryProductId(productId || null);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setInventoryAction(null);
    setInventoryProductId(null);
  };

  const roleSwitcherOptions = [
    { value: 'admin', label: 'Admin (admin@example.com)' },
    { value: 'manager', label: 'Manager (manager@example.com)' },
    { value: 'staff', label: 'Staff (staff@example.com)' },
  ];

  return (
    <AppShell
      contentPadding={6}
      height="fill"
      topNav={
        <TopNav
          label="Top navigation"
          heading={
            <TopNavHeading
              heading="Astryx Inventory"
              logo={
                <NavIcon
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m7.5 4.27 9 5.15" />
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                  }
                />
              }
            />
          }
          endContent={
            <HStack gap={3} vAlign="center">
              {/* Quick RBAC role switcher in top bar for immediate testing */}
              <Selector
                label="Role Switcher"
                isLabelHidden
                options={roleSwitcherOptions}
                value={user.role}
                onChange={val => switchDemoUser(val as UserRole)}
                style={{ width: 220 }}
              />

              <RoleToken role={user.role} />

              <VStack gap={0} style={{ paddingLeft: 'var(--spacing-1)' }}>
                <Text size="sm" weight="semibold">{user.full_name}</Text>
                <Text size="xsm" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</Text>
              </VStack>

              <Button
                label={colorMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
                variant="ghost"
                size="sm"
                onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
              />

              <Button
                label="Sign Out"
                variant="secondary"
                size="sm"
                onClick={logout}
              />
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav>
          <SideNavSection title="Executive Overview">
            <SideNavItem
              label="Dashboard"
              isSelected={currentPage === 'dashboard'}
              onClick={() => handleNavigate('dashboard')}
            />
          </SideNavSection>

          <SideNavSection title="Inventory Control">
            <SideNavItem
              label="Stock Levels"
              isSelected={currentPage === 'inventory' && !inventoryAction}
              onClick={() => handleNavigate('inventory')}
            />
            {can('stock_in') && (
              <SideNavItem
                label="Stock In"
                isSelected={currentPage === 'inventory' && inventoryAction === 'stock-in'}
                onClick={() => {
                  setCurrentPage('inventory');
                  setInventoryAction('stock-in');
                }}
              />
            )}
            {can('stock_out') && (
              <SideNavItem
                label="Stock Out"
                isSelected={currentPage === 'inventory' && inventoryAction === 'stock-out'}
                onClick={() => {
                  setCurrentPage('inventory');
                  setInventoryAction('stock-out');
                }}
              />
            )}
            {can('perform_transfers') && (
              <SideNavItem
                label="Transfers"
                isSelected={currentPage === 'inventory' && inventoryAction === 'transfer'}
                onClick={() => {
                  setCurrentPage('inventory');
                  setInventoryAction('transfer');
                }}
              />
            )}
            {can('perform_adjustments') && (
              <SideNavItem
                label="Cycle Adjustments"
                isSelected={currentPage === 'inventory' && inventoryAction === 'adjustment'}
                onClick={() => {
                  setCurrentPage('inventory');
                  setInventoryAction('adjustment');
                }}
              />
            )}
          </SideNavSection>

          <SideNavSection title="Product Catalog">
            <SideNavItem
              label="Products"
              isSelected={currentPage === 'products'}
              onClick={() => handleNavigate('products')}
            />
            <SideNavItem
              label="Categories"
              isSelected={currentPage === 'categories'}
              onClick={() => handleNavigate('categories')}
            />
          </SideNavSection>

          <SideNavSection title="Procurement & Logistics">
            <SideNavItem
              label="Suppliers"
              isSelected={currentPage === 'suppliers'}
              onClick={() => handleNavigate('suppliers')}
            />
            <SideNavItem
              label="Warehouses"
              isSelected={currentPage === 'warehouses'}
              onClick={() => handleNavigate('warehouses')}
            />
            <SideNavItem
              label="Purchase Orders"
              isSelected={currentPage === 'purchase-orders'}
              onClick={() => handleNavigate('purchase-orders')}
            />
          </SideNavSection>

          <SideNavSection title="Audit & Intelligence">
            <SideNavItem
              label="Transaction History"
              isSelected={currentPage === 'transactions'}
              onClick={() => handleNavigate('transactions')}
            />
            {can('view_reports') && (
              <SideNavItem
                label="Valuation & Reports"
                isSelected={currentPage === 'reports'}
                onClick={() => handleNavigate('reports')}
              />
            )}
          </SideNavSection>

          <SideNavSection title="Administration">
            {can('manage_users') && (
              <SideNavItem
                label="Users & Roles"
                isSelected={currentPage === 'users'}
                onClick={() => handleNavigate('users')}
              />
            )}
            <SideNavItem
              label="System Settings"
              isSelected={currentPage === 'settings'}
              onClick={() => handleNavigate('settings')}
            />
          </SideNavSection>
        </SideNav>
      }
    >
      <VStack gap={4} style={{ paddingBottom: 'var(--spacing-8)' }}>
        {currentPage === 'dashboard' && (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenStockIn={handleOpenStockIn}
          />
        )}

        {currentPage === 'inventory' && (
          <InventoryPage
            initialAction={inventoryAction}
            initialProductId={inventoryProductId}
            onClearInitialAction={() => {
              setInventoryAction(null);
              setInventoryProductId(null);
            }}
          />
        )}

        {currentPage === 'products' && (
          <ProductsPage onStockInRequest={handleOpenStockIn} />
        )}

        {currentPage === 'categories' && <CategoriesPage />}

        {currentPage === 'suppliers' && <SuppliersPage />}

        {currentPage === 'warehouses' && <WarehousesPage />}

        {currentPage === 'purchase-orders' && <PurchaseOrdersPage />}

        {currentPage === 'transactions' && <TransactionsPage />}

        {currentPage === 'reports' && <ReportsPage />}

        {currentPage === 'users' && <UsersPage />}

        {currentPage === 'settings' && (
          <SettingsPage
            colorMode={colorMode}
            onColorModeChange={setColorMode}
          />
        )}
      </VStack>
    </AppShell>
  );
}

export default function App() {
  const [colorMode, setColorMode] = useState<'light' | 'dark' | 'system'>('system');

  return (
    <Theme theme={neutralTheme} mode={colorMode}>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Theme>
  );
}
