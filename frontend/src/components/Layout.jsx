import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Toast from './Toast';

export default function Layout() {
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
