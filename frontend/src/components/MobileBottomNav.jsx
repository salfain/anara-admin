import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { navItems, PRIMARY_COUNT } from '../data/navItems';
import MobileMoreSheet from './MobileMoreSheet';
import { canSeeNavItem } from '../hooks/usePermissions';
import useFollowUpStore from '../store/followUpStore';
import { badgeCounts } from '../utils/followUpBadge';

export default function MobileBottomNav() {
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const visible = navItems.filter((item) => canSeeNavItem(user, item));
  const badge = badgeCounts({
    due: useFollowUpStore((s) => s.due),
    overdue: useFollowUpStore((s) => s.overdue),
    mineDue: useFollowUpStore((s) => s.mineDue),
    mineOverdue: useFollowUpStore((s) => s.mineOverdue),
    mineTotal: useFollowUpStore((s) => s.mineTotal),
  });
  const dueCount = badge.due;
  const overdueCount = badge.overdue;
  const primary = visible.slice(0, PRIMARY_COUNT);
  const overflow = visible.slice(PRIMARY_COUNT);

  const isOverflowActive = overflow.some((item) => location.pathname === item.to);

  return (
    <>
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-center px-3 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <nav className="pointer-events-auto w-full max-w-md flex items-stretch gap-0.5 rounded-3xl border border-gray-med p-1.5 shadow-lg backdrop-blur-md bg-surface/95">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="flex-1 min-w-0">
                {({ isActive }) => (
                  <span
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-0.5"
                    style={{
                      background: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--color-secondary)',
                    }}
                  >
                    <span className="relative flex">
                      <Icon size={19} color={isActive ? '#ffffff' : 'var(--color-secondary)'} />
                      {item.to === '/leads' && dueCount > 0 && (
                        <span
                          className="absolute -top-1 -right-2 text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center text-white"
                          style={{ background: overdueCount > 0 ? '#ef4444' : '#f59e0b' }}
                        >
                          {dueCount > 9 ? '9+' : dueCount}
                        </span>
                      )}
                    </span>
                    <span
                      className="text-[10px] leading-none truncate max-w-full"
                      style={{ fontWeight: isActive ? 700 : 500 }}
                    >
                      {item.short || item.label}
                    </span>
                  </span>
                )}
              </NavLink>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex-1 min-w-0 cursor-pointer">
            <span
              className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-0.5"
              style={{
                background: isOverflowActive ? 'var(--color-primary)' : 'transparent',
                color: isOverflowActive ? '#ffffff' : 'var(--color-secondary)',
              }}
            >
              <Menu size={19} color={isOverflowActive ? '#ffffff' : 'var(--color-secondary)'} />
              <span
                className="text-[10px] leading-none truncate max-w-full"
                style={{ fontWeight: isOverflowActive ? 700 : 500 }}
              >
                Lainnya
              </span>
            </span>
          </button>
        </nav>
      </div>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} overflowItems={overflow} />
    </>
  );
}
