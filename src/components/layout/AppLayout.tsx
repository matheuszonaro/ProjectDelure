import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useFavorites } from '../../hooks/useFavorites';

export default function AppLayout() {
  const { count } = useFavorites();

  return (
    <div className="flex h-screen bg-surface-primary font-sans">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar favCount={count} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav favCount={count} />
      </div>
    </div>
  );
}
