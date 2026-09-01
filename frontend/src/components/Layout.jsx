import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Toast from './Toast';
import useFollowUpStore from '../store/followUpStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import usePermissions from '../hooks/usePermissions';

export default function Layout() {
  const refresh = useFollowUpStore((s) => s.refresh);
  const { can } = usePermissions();
  const boleh = can('leads.view');

  // Diambil di sini, bukan di halaman Leads, supaya lencananya ikut ke mana pun
  // pengguna berada.
  useEffect(() => { if (boleh) refresh(); }, [boleh, refresh]);
  useAutoRefresh(() => { if (boleh) refresh(); }, 60000, [boleh]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-light">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </div>
      <MobileBottomNav />
      <Toast />
    </div>
  );
}
