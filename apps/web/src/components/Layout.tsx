import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Package,
  FolderTree,
  Warehouse,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  History,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ROLES, type UserRole } from '@snackflow/shared';
import { ShiftClockWidget } from './ShiftClockWidget';

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SELLER] },
  { name: 'Historial', href: '/history', icon: History, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER] },
  { name: 'Caja', href: '/cashier', icon: CreditCard, roles: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.CASHIER] },
  { name: 'Productos', href: '/products', icon: Package, roles: [ROLES.ADMIN] },
  { name: 'Categorias', href: '/categories', icon: FolderTree, roles: [ROLES.ADMIN] },
  { name: 'Inventario', href: '/inventory', icon: Warehouse, roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { name: 'Reportes', href: '/reports', icon: BarChart3, roles: [ROLES.ADMIN, ROLES.SUPERVISOR] },
  { name: 'Usuarios', href: '/users', icon: Users, roles: [ROLES.ADMIN] },
  { name: 'Configuracion', href: '/settings', icon: Settings, roles: [ROLES.ADMIN] },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-850 shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100 dark:border-gray-850">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-white font-black text-lg">S</span>
              </div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent tracking-tight">SnackFlow</h1>
            </div>
            <button
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 ${isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/15 scale-[1.02]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-950/50">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow shadow-amber-500/10">
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize font-medium">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 justify-center w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between h-20 px-6">
            <button
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <ShiftClockWidget />
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-750">
                🏢 {user?.tenant?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
