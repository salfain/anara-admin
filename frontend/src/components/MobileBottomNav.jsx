import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { navItems, PRIMARY_COUNT } from '../data/navItems';
import MobileMoreSheet from './MobileMoreSheet';

export default function MobileBottomNav() {
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const visible = navItems.filter((item) => !item.adminOnly || user?.isAdmin);
  const primary = visible.slice(0, PRIMARY_COUNT);
  const overflow = visible.slice(PRIMARY_COUNT);

  const isOverflowActive = overflow.some((item) => location.pathname === item.to);

  return (
    <>
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-center px-3 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <nav
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-gray-med px-1.5 py-1.5 shadow-lg backdrop-blur-md max-w-full overflow-x-auto bg-surface/95"
        >
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold whitespace-nowrap transition-colors"
              >
                {({ isActive }) => (
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
                    style={{
                      background: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--color-secondary)',
                    }}
                  >
                    <Icon size={18} color={isActive ? '#ffffff' : 'var(--color-secondary)'} />
                    <span className="truncate max-w-[90px]" style={{ fontWeight: isActive ? 700 : 500 }}>
                      {item.label}
                    </span>
                  </span>
                )}
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold cursor-pointer whitespace-nowrap"
          >
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
              style={{
                background: isOverflowActive ? 'var(--color-primary)' : 'transparent',
                color: isOverflowActive ? '#ffffff' : 'var(--color-secondary)',
              }}
            >
              <Menu size={18} color={isOverflowActive ? '#ffffff' : 'var(--color-secondary)'} />
              <span style={{ fontWeight: isOverflowActive ? 700 : 500 }}>Lainnya</span>
            </span>
          </button>
        </nav>
      </div>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} overflowItems={overflow} />
    </>
  );
}
