import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { api, offlineService } from './services/api';
import { useCapacitor } from './hooks/useCapacitor';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { Layout } from './components/Layout';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SalesPage } from './pages/SalesPage';
import { CashierPage } from './pages/CashierPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Inicializar Capacitor en plataformas nativas
  useCapacitor();

  // Atajos de teclado globales
  useGlobalKeyboardShortcuts({
    onShowHelp: () => setShowShortcutsHelp(true),
  });

  // Sync offline orders
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        offlineService.sync();
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
    // Try to sync on mount
    if (navigator.onLine) {
      offlineService.sync();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <>
      <OfflineIndicator />
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="cashier" element={<CashierPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
