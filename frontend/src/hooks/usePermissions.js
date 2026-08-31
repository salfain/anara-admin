import { useCallback } from 'react';
import useAuthStore from '../store/authStore';

// Role dengan akses Admin selalu dianggap punya semua hak akses, sama seperti backend.
export function hasPermission(user, permission) {
  if (!user) return false;
  if (!permission) return true;
  if (user.isAdmin) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

// Nav item terlihat kalau user punya `permission`-nya, atau salah satu dari `anyPermission`.
export function canSeeNavItem(user, item) {
  if (item.permission && !hasPermission(user, item.permission)) return false;
  if (item.anyPermission && !item.anyPermission.some((p) => hasPermission(user, p))) return false;
  return true;
}

export default function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const can = useCallback((permission) => hasPermission(user, permission), [user]);
  return { can, permissions: user?.permissions || [], isAdmin: Boolean(user?.isAdmin) };
}
