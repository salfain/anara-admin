import { NavLink } from 'react-router-dom';
import { LogOut, Sun, Moon, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import InstallPwaButton from './InstallPwaButton';

export default function MobileMoreSheet({ open, onClose, overflowItems }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-40 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface rounded-t-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-base font-semibold text-gray-dark">Menu</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-secondary cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-med">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 text-white"
            style={{ background: '#2563eb' }}
          >
            {initials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="text-sm font-semibold truncate text-gray-dark">{user?.name}</div>
            <div className="text-xs text-secondary capitalize">{user?.role === 'admin' ? 'Admin' : 'CS Team'}</div>
          </div>
        </div>

        {overflowItems.length > 0 && (
          <div className="flex flex-col px-3 py-2 border-b border-gray-med">
            {overflowItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive ? 'text-white' : 'text-gray-dark'
                    }`
                  }
                  style={({ isActive }) => (isActive ? { background: '#2563eb' } : {})}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        )}

        <div className="px-3 py-3 flex flex-col gap-2">
          <div className="flex gap-1 bg-gray-light rounded-full p-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${theme === 'light' ? 'btn-3d-sm btn-3d' : ''}`}
              style={theme === 'light' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Sun size={14} />
              Terang
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${theme === 'dark' ? 'btn-3d-sm btn-3d' : ''}`}
              style={theme === 'dark' ? { background: '#2563eb', color: '#fff' } : { color: 'var(--color-secondary)' }}
            >
              <Moon size={14} />
              Gelap
            </button>
          </div>

          <InstallPwaButton className="py-3" />

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium cursor-pointer text-left"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
