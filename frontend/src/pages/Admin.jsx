import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import ConfirmDialog from '../components/ConfirmDialog';
import useAutoRefresh from '../hooks/useAutoRefresh';

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'categories', label: 'Categories' },
  { key: 'packages', label: 'Packages' },
];

export default function Admin() {
  const { user: currentUser } = useAuthStore();
  const [tab, setTab] = useState('users');

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Admin Panel</div>
        <div className="text-sm text-secondary mt-1">Kelola anggota tim, kategori, paket, dan pantau aktivitas</div>
      </div>

      <div className="flex gap-1 bg-surface rounded-xl p-1.5 w-fit border border-gray-med">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold cursor-pointer"
            style={tab === t.key ? { background: '#2563eb', color: '#fff' } : { background: 'transparent', color: 'var(--color-secondary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab currentUser={currentUser} />}
      {tab === 'roles' && <RolesTab currentUser={currentUser} />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'packages' && <PackagesTab />}
    </div>
  );
}

function UsersTab({ currentUser }) {
  const push = useToastStore((s) => s.push);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'cs', password: '' });
  const [inviting, setInviting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [activity, setActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPagination, setActivityPagination] = useState({ page: 1, totalPages: 1 });

  const fetchUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: search || undefined, page, limit: 10 } });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {
      push('Gagal memuat users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, push]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(true), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useAutoRefresh(() => fetchUsers(false), 15000, [search, page]);

  const fetchActivity = useCallback(() => {
    api.get('/activity', { params: { page: activityPage, limit: 10 } })
      .then(({ data }) => {
        setActivity(data.data);
        setActivityPagination(data.pagination);
      })
      .catch(() => {});
  }, [activityPage]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);
  useAutoRefresh(fetchActivity, 15000, [activityPage]);

  async function handleApprove(u) {
    try {
      await api.put(`/users/${u.id}/approve`);
      push(`Akun "${u.email}" disetujui`);
      fetchUsers();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyetujui akun', 'error');
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/users', inviteForm);
      push('User berhasil ditambahkan');
      setShowInvite(false);
      setInviteForm({ email: '', name: '', role: 'cs', password: '' });
      fetchUsers();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menambah user', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      push('User berhasil dihapus');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus user', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="bg-surface rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 flex-wrap gap-3">
          <div>
            <div className="text-base font-semibold text-gray-dark">User Management</div>
            <div className="text-xs text-secondary mt-0.5">Untuk mengubah role, buka tab Roles.</div>
          </div>
          <div className="flex gap-3 items-center flex-wrap w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari email/nama..."
              className="h-9 px-3 border border-gray-med rounded-lg text-[13px] flex-1 sm:flex-none sm:w-[220px] min-w-0"
            />
            <button
              onClick={() => setShowInvite(true)}
              className="h-9 px-4 text-white rounded-full btn-3d text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              style={{ background: '#2563eb' }}
            >
              <Plus size={14} />
              Tambah User
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Email', 'Name', 'Role', 'Status', 'Join Date', 'Actions'].map((h) => (
                  <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-sm text-secondary text-center py-8">Memuat...</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{u.email}</td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{u.name}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-gray-med">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={u.role === 'admin' ? { background: '#dbeafe', color: '#1e40af' } : { background: '#f1f5f9', color: '#475569' }}
                    >
                      {u.role === 'admin' ? 'Admin' : 'CS'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-med">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={u.status === 'pending' ? { background: '#fef3c7', color: '#b45309' } : { background: '#dcfce7', color: '#16a34a' }}
                    >
                      {u.status === 'pending' ? 'Pending' : 'Active'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">
                    {new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-med">
                    <div className="flex gap-2">
                      {u.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(u)}
                          className="h-7 px-2.5 border border-gray-med bg-surface rounded-md text-xs font-semibold cursor-pointer"
                          style={{ color: '#16a34a' }}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id}
                        className="w-7 h-7 border border-gray-med bg-surface rounded-md flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="text-sm text-secondary text-center py-8">Tidak ada user ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="w-7 h-7 rounded-md text-xs font-semibold cursor-pointer"
                style={n === page ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-gray-dark)', border: '1px solid var(--color-gray-med)' }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-xl overflow-hidden mt-6">
        <div className="text-base font-semibold text-gray-dark p-6 pb-4">Team Activity Log</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['User', 'Aktivitas', 'Waktu'].map((h) => (
                  <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr><td colSpan={3} className="text-sm text-secondary text-center py-8">Belum ada aktivitas.</td></tr>
              )}
              {activity.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3.5 border-b border-gray-med">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: a.action === 'delete' ? '#ef4444' : a.action === 'update' ? '#f59e0b' : '#10b981' }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-dark truncate">{a.user_name || 'Unknown'}</div>
                        <div className="text-xs text-secondary truncate">{a.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{a.description}</td>
                  <td className="text-sm text-secondary px-4 py-3.5 border-b border-gray-med whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activityPagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: activityPagination.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setActivityPage(n)}
                className="w-7 h-7 rounded-md text-xs font-semibold cursor-pointer"
                style={n === activityPage ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-gray-dark)', border: '1px solid var(--color-gray-med)' }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <form
            onSubmit={handleInvite}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] bg-surface rounded-xl shadow-2xl p-6 flex flex-col gap-4"
          >
            <div className="text-lg font-semibold text-gray-dark">Tambah User</div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nama</label>
              <input
                required
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Email</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                className="h-10 px-3 border border-gray-med rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm bg-surface"
              >
                <option value="cs">CS</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)} className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={inviting} className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
                {inviting ? 'Menyimpan...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus User?"
        message={`User "${deleteTarget?.email}" akan dihapus permanen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </>
  );
}

function RolesTab({ currentUser }) {
  const push = useToastStore((s) => s.push);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { limit: 100 } });
      setUsers(data.data);
    } catch {
      push('Gagal memuat users', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { fetchUsers(true); }, [fetchUsers]);
  useAutoRefresh(() => fetchUsers(false), 15000);

  async function handleRoleChange(u, role) {
    setUpdatingId(u.id);
    try {
      await api.put(`/users/${u.id}/role`, { role });
      push(`${u.name} sekarang menjadi ${role === 'admin' ? 'Admin' : 'CS'}`);
      fetchUsers(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal mengubah role', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  const admins = users.filter((u) => u.role === 'admin');
  const csTeam = users.filter((u) => u.role === 'cs');

  function RoleColumn({ title, count, badgeStyle, list, targetRole, targetLabel }) {
    return (
      <div className="flex-1 min-w-[280px] bg-surface border border-gray-med rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-med">
          <div className="text-sm font-semibold text-gray-dark">{title}</div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={badgeStyle}>{count}</span>
        </div>
        <div className="flex flex-col divide-y divide-gray-med">
          {list.length === 0 && <div className="text-sm text-secondary text-center py-8">Belum ada user.</div>}
          {list.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-dark truncate">{u.name}</div>
                <div className="text-xs text-secondary truncate">{u.email}</div>
              </div>
              <button
                onClick={() => handleRoleChange(u, targetRole)}
                disabled={u.id === currentUser?.id || updatingId === u.id}
                title={u.id === currentUser?.id ? 'Tidak bisa mengubah role sendiri' : undefined}
                className="h-8 px-3 text-xs font-semibold border border-gray-med rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {updatingId === u.id ? '...' : `Jadikan ${targetLabel}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-secondary">Kelola siapa yang punya akses Admin dan siapa yang bertugas sebagai CS Team.</div>
      {loading ? (
        <div className="text-sm text-secondary text-center py-10">Memuat...</div>
      ) : (
        <div className="flex gap-4 flex-wrap items-start">
          <RoleColumn
            title="Admin"
            count={admins.length}
            badgeStyle={{ background: '#dbeafe', color: '#1e40af' }}
            list={admins}
            targetRole="cs"
            targetLabel="CS"
          />
          <RoleColumn
            title="CS Team"
            count={csTeam.length}
            badgeStyle={{ background: '#f1f5f9', color: '#475569' }}
            list={csTeam}
            targetRole="admin"
            targetLabel="Admin"
          />
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const push = useToastStore((s) => s.push);
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchCategories = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch {
      push('Gagal memuat kategori', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { fetchCategories(true); }, [fetchCategories]);
  useAutoRefresh(() => fetchCategories(false), 15000);

  function startEdit(c) {
    setEditing(c);
    setName(c.name);
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setName('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Nama kategori wajib diisi.');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, { name: name.trim() });
        push('Kategori diperbarui.');
      } else {
        await api.post('/categories', { name: name.trim() });
        push('Kategori ditambahkan.');
      }
      setName('');
      setError('');
      setEditing(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      push('Kategori dihapus.');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus kategori', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-6 flex-wrap items-start">
      <form onSubmit={handleSubmit} className="w-[280px] shrink-0 bg-surface border border-gray-med rounded-xl p-5 flex flex-col gap-3">
        <div className="text-base font-semibold text-gray-dark">{editing ? 'Edit Category' : 'Add Category'}</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Category name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Refund"
            className="h-9 px-3 border border-gray-med rounded-lg text-sm"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex gap-2">
          {editing && (
            <button type="button" onClick={cancelEdit} className="h-9 flex-1 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer">
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className="h-9 flex-1 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
            {saving ? 'Menyimpan...' : editing ? 'Save' : 'Add Category'}
          </button>
        </div>
      </form>

      <div className="flex-1 min-w-[280px] bg-surface border border-gray-med rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Category', 'Replies', 'Actions'].map((h) => (
                <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="text-sm text-secondary text-center py-8">Memuat...</td></tr>}
            {!loading && categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 border-b border-gray-med">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>{c.name}</span>
                </td>
                <td className="text-sm text-gray-dark px-4 py-3 border-b border-gray-med">{c.reply_count}</td>
                <td className="px-4 py-3 border-b border-gray-med">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(c)} className="text-[13px] font-medium cursor-pointer text-secondary flex items-center gap-1">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="text-[13px] font-medium cursor-pointer" style={{ color: '#ef4444' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && categories.length === 0 && (
              <tr><td colSpan={3} className="text-sm text-secondary text-center py-8">Belum ada kategori.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Category?"
        message={`Kategori "${deleteTarget?.name}" akan dihapus.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}

function PackagesTab() {
  const push = useToastStore((s) => s.push);
  const [packages, setPackages] = useState([]);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchPackages = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/packages');
      setPackages(data.data);
    } catch {
      push('Gagal memuat paket', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { fetchPackages(true); }, [fetchPackages]);
  useAutoRefresh(() => fetchPackages(false), 15000);

  function startEdit(p) {
    setEditing(p);
    setName(p.name);
    setDestination(p.destination || '');
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setName('');
    setDestination('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Nama paket wajib diisi.');
    setSaving(true);
    try {
      const payload = { name: name.trim(), destination: destination.trim() || null };
      if (editing) {
        await api.put(`/packages/${editing.id}`, payload);
        push('Paket diperbarui.');
      } else {
        await api.post('/packages', payload);
        push('Paket ditambahkan.');
      }
      setName('');
      setDestination('');
      setError('');
      setEditing(null);
      fetchPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan paket');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/packages/${deleteTarget.id}`);
      push('Paket dihapus.');
      setDeleteTarget(null);
      fetchPackages();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus paket', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-6 flex-wrap items-start">
      <form onSubmit={handleSubmit} className="w-[280px] shrink-0 bg-surface border border-gray-med rounded-xl p-5 flex flex-col gap-3">
        <div className="text-base font-semibold text-gray-dark">{editing ? 'Edit Package' : 'Add Package'}</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Package name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paket Korea 6D5N"
            className="h-9 px-3 border border-gray-med rounded-lg text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Destination (negara)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Korea"
            className="h-9 px-3 border border-gray-med rounded-lg text-sm"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex gap-2">
          {editing && (
            <button type="button" onClick={cancelEdit} className="h-9 flex-1 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer">
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className="h-9 flex-1 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
            {saving ? 'Menyimpan...' : editing ? 'Save' : 'Add Package'}
          </button>
        </div>
      </form>

      <div className="flex-1 min-w-[280px] bg-surface border border-gray-med rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Package', 'Destination', 'Actions'].map((h) => (
                <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="text-sm text-secondary text-center py-8">Memuat...</td></tr>}
            {!loading && packages.map((p) => (
              <tr key={p.id}>
                <td className="text-sm text-gray-dark font-medium px-4 py-3 border-b border-gray-med">{p.name}</td>
                <td className="text-sm text-secondary px-4 py-3 border-b border-gray-med">{p.destination || '-'}</td>
                <td className="px-4 py-3 border-b border-gray-med">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(p)} className="text-[13px] font-medium cursor-pointer text-secondary flex items-center gap-1">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="text-[13px] font-medium cursor-pointer" style={{ color: '#ef4444' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && packages.length === 0 && (
              <tr><td colSpan={3} className="text-sm text-secondary text-center py-8">Belum ada paket.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Package?"
        message={`Paket "${deleteTarget?.name}" akan dihapus.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
