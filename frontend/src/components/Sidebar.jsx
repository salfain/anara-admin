import { NavLink } from 'react-router-dom';
import { LogOut, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useSidebarStore from '../store/sidebarStore';
import { navItems } from '../data/navItems';
import InstallPwaButton from './InstallPwaButton';
import AnaraLogo from './AnaraLogo';

function Tooltip({ label, show }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-gray-dark text-white text-xs font-medium px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
      {label}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`hidden lg:flex shrink-0 bg-surface border-r border-gray-med flex-col h-full transition-[width] duration-150 ${
        collapsed ? 'w-[76px]' : 'w-[250px]'
      }`}
    >
      <div className={`flex items-center shrink-0 pt-4 pb-2 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        {!collapsed && <AnaraLogo height={34} />}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-gray-light cursor-pointer shrink-0 ${collapsed ? '' : 'ml-auto'}`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 py-2 ${collapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
          if (item.adminOnly && !user?.isAdmin) return null;
          const Icon = item.icon;
          return (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  } ${isActive ? 'text-white' : 'text-secondary hover:bg-gray-light'}`
                }
                style={({ isActive }) => (isActive ? { background: '#2563eb' } : {})}
              >
                <Icon size={18} />
                {!collapsed && item.label}
              </NavLink>
              <Tooltip label={item.label} show={collapsed} />
            </div>
          );
        })}
      </nav>

      <div className={`shrink-0 flex flex-col gap-1 border-t border-gray-med pt-3 pb-4 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className={`relative group flex items-center gap-2.5 py-2 ${collapsed ? 'justify-center px-0' : 'px-1'}`}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 text-white"
            style={{ background: '#2563eb' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <div className="text-[13px] font-semibold truncate text-gray-dark">{user?.name}</div>
              <div className="text-[11px] text-secondary capitalize">{user?.roleLabel || (user?.isAdmin ? 'Admin' : 'CS Team')}</div>
            </div>
          )}
          <Tooltip label={user?.name || ''} show={collapsed} />
        </div>

        {collapsed ? (
          <div className="relative group">
            <button
              onClick={toggleTheme}
              className="w-full h-9 rounded-full text-xs font-semibold flex items-center justify-center cursor-pointer text-secondary hover:bg-gray-light"
            >
              {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Tooltip label={theme === 'light' ? 'Mode Terang' : 'Mode Gelap'} show />
          </div>
        ) : (
          <div className="flex gap-1 bg-gray-light rounded-full p-1 mb-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex-1 h-8 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${theme === 'light' ? 'btn-3d-sm btn-3d' : ''}`}
              style={theme === 'light' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Sun size={14} />
              Terang
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex-1 h-8 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${theme === 'dark' ? 'btn-3d-sm btn-3d' : ''}`}
              style={theme === 'dark' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Moon size={14} />
              Gelap
            </button>
          </div>
        )}

        {!collapsed && <InstallPwaButton />}

        <div className="relative group">
          <button
            onClick={logout}
            className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-left w-full ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={18} />
            {!collapsed && 'Logout'}
          </button>
          <Tooltip label="Logout" show={collapsed} />
        </div>
      </div>
    </div>
  );
}
