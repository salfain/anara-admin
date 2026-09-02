import { useCallback, useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import ReplyCard from '../components/ReplyCard';
import ReplyModal from '../components/ReplyModal';
import ReplyDetailModal from '../components/ReplyDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import useAutoRefresh from '../hooks/useAutoRefresh';
import usePermissions from '../hooks/usePermissions';
import { SkeletonCards } from '../components/Skeleton';
import { copyText } from '../utils/clipboard';
import { fillPlaceholders } from '../utils/whatsapp';
import useAuthStore from '../store/authStore';

export default function QuickReplies() {
  const push = useToastStore((s) => s.push);
  const { can } = usePermissions();
  const currentUser = useAuthStore((s) => s.user);
  // Lead yang sedang dilayani. Tanpa ini hanya [Nama CS] yang bisa diisi,
  // karena placeholder lain butuh tahu customernya siapa.
  const [leadUntuk, setLeadUntuk] = useState('');
  const [leadOptions, setLeadOptions] = useState([]);
  const canManage = can('quick_replies.manage');
  const canDelete = can('quick_replies.delete');

  const [replies, setReplies] = useState([]);
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [packageId, setPackageId] = useState('');
  const [sort, setSort] = useState('most_used');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    api.get('/packages').then(({ data }) => setPackages(data.data)).catch(() => {});
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quick-replies', {
        params: {
          search: search || undefined,
          category: category || undefined,
          package_id: packageId || undefined,
          sort,
          page,
          limit: 10,
        },
      });
      setReplies(data.data);
      setPagination(data.pagination);
    } catch {
      push('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, packageId, sort, page, push]);

  useEffect(() => {
    const timer = setTimeout(fetchReplies, 300);
    return () => clearTimeout(timer);
  }, [fetchReplies]);

  useAutoRefresh(fetchReplies, 15000, [search, category, packageId, sort, page]);

  // Dibatasi ke lead yang masih berjalan: yang sudah closing atau batal tidak
  // akan dikirimi quick reply lagi, dan daftarnya jadi lebih pendek.
  useEffect(() => {
    if (!can('leads.view')) return;
    api.get('/leads')
      .then(({ data }) => setLeadOptions(
        data.data.filter((l) => l.status !== 'Sudah DP' && l.status !== 'Batal').slice(0, 200)
      ))
      .catch(() => {});
  }, [can]);

  function clearFilters() {
    setSearch('');
    setCategory('');
    setPackageId('');
    setPage(1);
  }

  const leadDipilih = leadOptions.find((l) => String(l.id) === leadUntuk) || null;

  function isiPlaceholder(teks) {
    return fillPlaceholders(teks, {
      csName: currentUser?.name,
      leadName: leadDipilih?.name,
      destination: leadDipilih?.country,
      packageName: leadDipilih?.packageName,
      packageDates: leadDipilih?.packageDates,
      packagePrice: leadDipilih?.packagePrice,
    });
  }

  async function handleCopy(reply) {
    if (!(await copyText(isiPlaceholder(reply.answer)))) {
      return push('Gagal menyalin', 'error');
    }
    try {
      await api.post(`/quick-replies/${reply.id}/use`);
      push('Copied!');
      setViewing(null);
      fetchReplies();
    } catch {
      // Penyalinan sudah berhasil — kegagalan mencatat pemakaian tidak perlu
      // dilaporkan sebagai "gagal menyalin".
      setViewing(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(reply) {
    setEditing(reply);
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/quick-replies/${editing.id}`, form);
        push('Reply berhasil diperbarui');
      } else {
        await api.post('/quick-replies', form);
        push('Reply berhasil ditambahkan');
      }
      setModalOpen(false);
      fetchReplies();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan reply', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/quick-replies/${deleteTarget.id}`);
      push('Reply berhasil dihapus');
      setDeleteTarget(null);
      fetchReplies();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus reply', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="sticky top-0 z-10 bg-surface border-b border-gray-med px-8 py-4 flex items-center gap-4">
        <div className="flex-1 relative max-w-[520px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari pertanyaan atau jawaban..."
            className="w-full h-10 pl-9 pr-3 border border-gray-med rounded-lg text-sm bg-gray-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-2xl sm:text-[28px] font-bold text-gray-dark leading-tight">Quick Replies</div>
            <div className="text-sm text-secondary mt-1">Cari, salin, dan kelola template jawaban customer</div>
          </div>
          {canManage && (
            <button
              onClick={openAdd}
              className="h-10 px-5 text-white rounded-full btn-3d text-sm font-semibold flex items-center gap-2 cursor-pointer shrink-0"
              style={{ background: '#2563eb' }}
            >
              <Plus size={16} />
              Tambah Reply
            </button>
          )}
        </div>

        <div className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="h-9 px-3 border border-gray-med rounded-lg text-sm bg-gray-light w-full sm:w-auto sm:min-w-[170px]"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Package</label>
              <select
                value={packageId}
                onChange={(e) => { setPackageId(e.target.value); setPage(1); }}
                className="h-9 px-3 border border-gray-med rounded-lg text-sm bg-gray-light w-full sm:w-auto sm:min-w-[170px]"
              >
                <option value="">Semua Paket</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {leadOptions.length > 0 && (
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Untuk lead</label>
              <select
                value={leadUntuk}
                onChange={(e) => setLeadUntuk(e.target.value)}
                title="Placeholder seperti [Nama] dan [Paket] terisi dari lead ini saat disalin"
                className="h-9 px-2.5 border border-gray-med rounded-md text-[13px] bg-surface text-gray-dark max-w-[220px]"
              >
                <option value="">Tanpa lead</option>
                {leadOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name || l.whatsapp}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={clearFilters}
            disabled={!category && !packageId}
            className="h-9 px-4 w-full sm:w-auto sm:ml-auto bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Clear filters
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-dark"><span className="font-semibold">{pagination.total}</span> replies ditemukan</div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary">Sort:</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 px-2.5 border border-gray-med rounded-md text-[13px] bg-surface">
              <option value="most_used">Most Used</option>
              <option value="recent">Recently Added</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {loading && <SkeletonCards count={4} />}
          {!loading && replies.length === 0 && (
            <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
              Belum ada quick reply yang cocok. Coba ubah pencarian atau filter.
            </div>
          )}
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={{ ...reply, answer: isiPlaceholder(reply.answer) }}
              canEdit={canManage}
              canDelete={canDelete}
              onCopy={handleCopy}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onView={setViewing}
            />
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 border border-gray-med bg-surface rounded-full btn-3d-secondary btn-3d-sm text-secondary disabled:opacity-40 cursor-pointer"
            >
              ‹
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-full text-[13px] font-semibold cursor-pointer ${n === page ? 'btn-3d-sm btn-3d' : ''}`}
                style={n === page ? { background: '#2563eb', color: '#fff', border: 'none' } : { background: 'var(--color-surface)', color: 'var(--color-gray-dark)', border: '1px solid var(--color-gray-med)' }}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 border border-gray-med bg-surface rounded-full btn-3d-secondary btn-3d-sm text-secondary disabled:opacity-40 cursor-pointer"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <ReplyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        packages={packages}
        categories={categories}
        initial={editing}
        saving={saving}
      />

      <ReplyDetailModal
        reply={viewing ? { ...viewing, answer: isiPlaceholder(viewing.answer) } : null}
        onClose={() => setViewing(null)}
        onCopy={handleCopy}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Quick Reply?"
        message={`Reply "${deleteTarget?.question}" akan dihapus permanen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
