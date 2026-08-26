import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessagesSquare, BarChart3, Users, LogOut, MessageSquare, FolderOpen, Sun, Moon, Send } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quick-replies', label: 'Quick Replies', icon: MessagesSquare },
  { to: '/follow-up-kit', label: 'Follow-Up Kit', icon: Send },
  { to: '/packages', label: 'Paket & Itinerary', icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { to: '/admin', label: 'Admin', icon: Users, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[250px] shrink-0 bg-surface border-r border-gray-med flex flex-col h-full transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#2563eb' }}>
            <MessageSquare size={18} color="#fff" />
          </div>
          <div className="text-base font-semibold text-gray-dark">Anara</div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-4 py-2">
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    isActive ? 'text-white' : 'text-secondary hover:bg-gray-light'
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

        <div className="shrink-0 flex flex-col gap-1 border-t border-gray-med px-4 pt-3 pb-4">
          <div className="flex items-center gap-2.5 px-1 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 text-white"
              style={{ background: '#2563eb' }}
            >
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="text-[13px] font-semibold truncate text-gray-dark">{user?.name}</div>
              <div className="text-[11px] text-secondary capitalize">{user?.role === 'admin' ? 'Admin' : 'CS Team'}</div>
            </div>
          </div>

          <div className="flex gap-1 bg-gray-light rounded-lg p-1 mb-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className="flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              style={theme === 'light' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Sun size={14} />
              Terang
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className="flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              style={theme === 'dark' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Moon size={14} />
              Gelap
            </button>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-left"
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
