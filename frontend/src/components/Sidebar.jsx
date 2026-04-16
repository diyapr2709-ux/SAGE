import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, BarChart3, MessageSquare, Calendar, Settings } from 'lucide-react';

const navItems = {
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/manager/staff', label: 'Staff', icon: Users },
    { to: '/manager/schedule', label: 'Schedule', icon: Calendar },
    { to: '/manager/reviews', label: 'Reviews', icon: MessageSquare },
  ],
  employee: [
    { to: '/employee', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/employee/schedule', label: 'My Schedule', icon: Calendar },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const items = navItems[user?.role] || navItems.employee;

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold text-indigo-600">SAGE</h2>
        <p className="text-xs text-gray-500">Autonomous Growth Engine</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-gray-500">v1.0</div>
    </aside>
  );
}