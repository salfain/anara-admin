// Katalog hak akses (permission) aplikasi.
// `key` disimpan di tabel role_permissions; grup hanya untuk tampilan di UI.
const PERMISSION_GROUPS = [
  {
    key: 'quick_replies',
    label: 'Quick Replies',
    permissions: [
      { key: 'quick_replies.view', label: 'Lihat quick replies' },
      { key: 'quick_replies.manage', label: 'Tambah & ubah quick replies' },
      { key: 'quick_replies.delete', label: 'Hapus quick replies' },
    ],
  },
  {
    key: 'follow_up',
    label: 'Follow-Up Kit',
    permissions: [
      { key: 'follow_up.view', label: 'Lihat template follow-up' },
      { key: 'follow_up.manage', label: 'Kelola template follow-up' },
    ],
  },
  {
    key: 'leads',
    label: 'Laporan Follow Up',
    permissions: [
      { key: 'leads.view', label: 'Lihat laporan follow up' },
      { key: 'leads.manage', label: 'Tambah, ubah & hapus lead' },
    ],
  },
  {
    key: 'packages',
    label: 'Paket & Itinerary',
    permissions: [
      { key: 'packages.view', label: 'Lihat paket & file itinerary' },
      { key: 'packages.manage', label: 'Kelola paket & file itinerary' },
    ],
  },
  {
    key: 'billing',
    label: 'Penagihan',
    permissions: [
      { key: 'billing.view', label: 'Lihat penagihan & peserta' },
      { key: 'billing.manage', label: 'Kelola penagihan & peserta' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    permissions: [
      { key: 'analytics.view', label: 'Lihat analytics & aktivitas tim' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin Panel',
    permissions: [
      { key: 'admin.users', label: 'Kelola user (undang, setujui, hapus)' },
      { key: 'admin.roles', label: 'Kelola role' },
      { key: 'admin.permissions', label: 'Kelola hak akses role' },
      { key: 'admin.categories', label: 'Kelola kategori' },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

// Dipakai saat role baru dibuat tanpa daftar permission eksplisit.
const DEFAULT_PERMISSIONS = [
  'quick_replies.view',
  'quick_replies.manage',
  'follow_up.view',
  'leads.view',
  'leads.manage',
  'packages.view',
];

function isValidPermission(key) {
  return ALL_PERMISSIONS.includes(key);
}

module.exports = { PERMISSION_GROUPS, ALL_PERMISSIONS, DEFAULT_PERMISSIONS, isValidPermission };
