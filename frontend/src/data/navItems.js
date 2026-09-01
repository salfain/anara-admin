import { LayoutDashboard, MessagesSquare, BarChart3, Users, FolderOpen, Send, ClipboardList, Receipt, CalendarCheck } from 'lucide-react';

// `short` is used by the mobile bottom nav, where full labels are too wide.
// `permission` hides the item when the user's role lacks that hak akses;
// `anyPermission` shows the item when the role has at least one of the listed ones.
export const navItems = [
  { to: '/', label: 'Dashboard', short: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/quick-replies', label: 'Quick Replies', short: 'Balasan', icon: MessagesSquare, permission: 'quick_replies.view' },
  { to: '/follow-up-kit', label: 'Follow-Up Kit', short: 'Kit FU', icon: Send, permission: 'follow_up.view' },
  { to: '/leads', label: 'Laporan Follow Up', short: 'Laporan', icon: ClipboardList, permission: 'leads.view' },
  { to: '/daily-report', label: 'Laporan Harian', short: 'Harian', icon: CalendarCheck, permission: 'leads.view' },
  { to: '/packages', label: 'Paket & Itinerary', short: 'Paket', icon: FolderOpen, permission: 'packages.view' },
  { to: '/billing', label: 'Penagihan', short: 'Tagihan', icon: Receipt, permission: 'billing.view' },
  { to: '/analytics', label: 'Analytics', short: 'Analitik', icon: BarChart3, permission: 'analytics.view' },
  {
    to: '/admin',
    label: 'Admin',
    short: 'Admin',
    icon: Users,
    anyPermission: ['admin.users', 'admin.roles', 'admin.permissions', 'admin.categories', 'packages.manage'],
  },
];

export const PRIMARY_COUNT = 5;
