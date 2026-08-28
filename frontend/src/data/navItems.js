import { LayoutDashboard, MessagesSquare, BarChart3, Users, FolderOpen, Send, ClipboardList } from 'lucide-react';

// `short` is used by the mobile bottom nav, where full labels are too wide.
export const navItems = [
  { to: '/', label: 'Dashboard', short: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/quick-replies', label: 'Quick Replies', short: 'Balasan', icon: MessagesSquare },
  { to: '/follow-up-kit', label: 'Follow-Up Kit', short: 'Kit FU', icon: Send },
  { to: '/leads', label: 'Laporan Follow Up', short: 'Laporan', icon: ClipboardList },
  { to: '/packages', label: 'Paket & Itinerary', short: 'Paket', icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', short: 'Analitik', icon: BarChart3, adminOnly: true },
  { to: '/admin', label: 'Admin', short: 'Admin', icon: Users, adminOnly: true },
];

export const PRIMARY_COUNT = 5;
