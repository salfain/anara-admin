import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { hasPermission } from '../hooks/usePermissions';

export default function ProtectedRoute({ children, adminOnly, permission }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  if (permission && !hasPermission(user, permission)) return <Navigate to="/" replace />;

  return children;
}
