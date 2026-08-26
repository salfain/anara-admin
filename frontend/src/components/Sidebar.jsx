import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Users, LogOut, MessageSquare, FolderOpen } from 'lucide-react';
import useAuthStore from '../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/packages', label: 'Paket & Itinerary', icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { to: '/admin', label: 'Admin', icon: Users, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[250px] shrink-0 bg-gray-dark text-white flex flex-col gap-8 p-4 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: '#111827' }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0" style={{ background: '#2563eb' }}>
            <MessageSquare size={18} color="#fff" />
          </div>
          <div className="text-base font-semibold">Anara</div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-slate-300 hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => (isActive ? { background: '#2563eb' } : {})}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
              style={{ background: '#2563eb' }}
            >
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="text-[13px] font-semibold truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 capitalize">{user?.role === 'admin' ? 'Admin' : 'CS Team'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 cursor-pointer text-left"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
