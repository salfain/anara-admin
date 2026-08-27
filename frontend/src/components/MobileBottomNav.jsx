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
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-gray-med flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} color={isActive ? '#2563eb' : 'var(--color-secondary)'} />
                  <span className="truncate max-w-full px-1" style={{ color: isActive ? '#2563eb' : 'var(--color-secondary)' }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium cursor-pointer"
        >
          <Menu size={20} color={isOverflowActive ? '#2563eb' : 'var(--color-secondary)'} />
          <span style={{ color: isOverflowActive ? '#2563eb' : 'var(--color-secondary)' }}>Lainnya</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} overflowItems={overflow} />
    </>
  );
}
