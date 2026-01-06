import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, AlertCircle, Settings, Users,
  Bell, LogOut, Menu, X, Shield, TrendingUp, CheckCircle
} from 'lucide-react';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_RISK'] },
    { name: 'Fees', href: '/fees', icon: FileText, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE', 'AGM', 'MANAGER'] },
    { name: 'Exemptions', href: '/exemptions', icon: AlertCircle, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE', 'RM', 'BRANCH_MGR'] },
    { name: 'Thresholds', href: '/thresholds', icon: TrendingUp, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_RISK'] },
    { name: 'Satisfaction', href: '/satisfaction', icon: CheckCircle, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['CEO', 'GM_RETAIL', 'GM_CORPORATE', 'GM_RISK', 'GM_COMPLIANCE'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role?.roleCode)
  );

  return (
    <div className="min-h-screen bg-executive-cream">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-executive-navy transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-executive-charcoal">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Fees Gov</h1>
              <p className="text-executive-silver text-xs">M.A System</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-primary-600 text-white font-medium'
                        : 'text-executive-silver hover:bg-executive-charcoal hover:text-white'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-executive-charcoal">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-executive-charcoal rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user?.fullName}
                </p>
                <p className="text-executive-silver text-xs truncate">
                  {user?.role?.roleName}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-executive-silver hover:bg-executive-charcoal hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-executive-pearl shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-executive-cream"
            >
              <Menu className="w-6 h-6 text-executive-navy" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="text-xl font-semibold text-executive-navy">
                {filteredNavigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-executive-cream">
                <Bell className="w-5 h-5 text-executive-muted" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
