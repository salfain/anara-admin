import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Admin() {
  const { user: currentUser } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'cs' });
  const [inviting, setInviting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [activity, setActivity] = useState([]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: search || undefined, page, limit: 10 } });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {
      push('Gagal memuat users', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => {
    if (currentUser) {
      api.get(`/users/${currentUser.id}/activity`, { params: { limit: 8 } })
        .then(({ data }) => setActivity(data.data))
        .catch(() => {});
    }
  }, [currentUser]);

  async function handleRoleChange(u, role) {
    try {
      await api.put(`/users/${u.id}/role`, { role });
      push('Role berhasil diubah');
      fetchUsers();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal mengubah role', 'error');
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/users', inviteForm);
      push('User berhasil ditambahkan');
      setShowInvite(false);
      setInviteForm({ email: '', name: '', role: 'cs' });
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
    <div className="p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Admin Panel</div>
        <div className="text-sm text-secondary mt-1">Kelola anggota tim dan pantau aktivitas</div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 flex-wrap gap-3">
          <div className="text-base font-semibold text-gray-dark">User Management</div>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari email/nama..."
              className="h-9 px-3 border border-gray-med rounded-lg text-[13px] w-[220px]"
            />
            <button
              onClick={() => setShowInvite(true)}
              className="h-9 px-4 text-white rounded-lg text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
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
                {['Email', 'Name', 'Role', 'Join Date', 'Actions'].map((h) => (
                  <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-sm text-secondary text-center py-8">Memuat...</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-100">{u.email}</td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-100">{u.name}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-gray-100">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer disabled:cursor-not-allowed"
                      style={u.role === 'admin' ? { background: '#dbeafe', color: '#1e40af' } : { background: '#f1f5f9', color: '#475569' }}
                    >
                      <option value="cs">CS</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-100">
                    {new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id}
                        className="w-7 h-7 border border-gray-med bg-white rounded-md flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="text-sm text-secondary text-center py-8">Tidak ada user ditemukan.</td></tr>
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
                style={n === page ? { background: '#2563eb', color: '#fff' } : { background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
        <div className="text-base font-semibold text-gray-dark">Team Activity Log</div>
        <div className="flex flex-col">
          {activity.length === 0 && <div className="text-sm text-secondary py-4">Belum ada aktivitas.</div>}
          {activity.map((a, i) => (
            <div key={a.id} className={`flex gap-3 py-3 ${i < activity.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span
                className="w-2 h-2 rounded-sm mt-1.5 shrink-0"
                style={{ background: a.action === 'delete' ? '#ef4444' : a.action === 'update' ? '#f59e0b' : '#10b981' }}
              />
              <div className="text-sm text-gray-dark">
                {a.description} <span className="text-slate-400">· {new Date(a.created_at).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <form
            onSubmit={handleInvite}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] bg-white rounded-xl shadow-2xl p-6 flex flex-col gap-4"
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
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm bg-white"
              >
                <option value="cs">CS</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)} className="h-9 px-4 bg-white text-gray-dark border border-gray-med rounded-lg text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={inviting} className="h-9 px-4 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
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
    </div>
  );
}
