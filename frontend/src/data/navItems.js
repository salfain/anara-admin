import { LayoutDashboard, MessagesSquare, BarChart3, Users, FolderOpen, Send, ClipboardList } from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quick-replies', label: 'Quick Replies', icon: MessagesSquare },
  { to: '/follow-up-kit', label: 'Follow-Up Kit', icon: Send },
  { to: '/leads', label: 'Laporan Follow Up', icon: ClipboardList },
  { to: '/packages', label: 'Paket & Itinerary', icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { to: '/admin', label: 'Admin', icon: Users, adminOnly: true },
];

export const PRIMARY_COUNT = 5;
