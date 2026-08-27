import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import LeadModal, { LEAD_STATUSES } from '../components/LeadModal';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_STYLE = {
  Baru: { background: '#eff6ff', color: '#2563eb' },
  Proses: { background: '#fefce8', color: '#a16207' },
  Nego: { background: '#fff7ed', color: '#c2410c' },
  'Sudah DP': { background: '#f0fdf4', color: '#15803d' },
  Batal: { background: '#fef2f2', color: '#dc2626' },
};

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Leads() {
  const push = useToastStore((s) => s.push);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/leads');
      setLeads(data.data);
    } catch {
      push('Gagal memuat data lead', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { fetchLeads(true); }, [fetchLeads]);
  useAutoRefresh(() => fetchLeads(false), 15000);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [l.whatsapp, l.picSales, l.notes, l.country].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [leads, search, statusFilter]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(l) {
    setEditing(l);
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    setSaving(true);
    try {
      const payload = {
        entryDate: form.entryDate,
        whatsapp: form.whatsapp.trim(),
        picSales: form.picSales.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        followUp1: form.followUp1 || null,
        followUp2: form.followUp2 || null,
        followUp3: form.followUp3 || null,
        country: form.country.trim() || null,
      };
      if (editing) {
        await api.put(`/leads/${editing.id}`, payload);
        push('Lead berhasil diperbarui');
      } else {
        await api.post('/leads', payload);
        push('Lead berhasil ditambahkan');
      }
      setModalOpen(false);
      fetchLeads(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan lead', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/leads/${deleteTarget.id}`);
      push('Lead dihapus');
      setDeleteTarget(null);
      fetchLeads(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus lead', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[28px] font-bold text-gray-dark">Laporan Follow Up</div>
          <div className="text-sm text-secondary mt-1 max-w-[560px]">
            Rekap lead dan progres follow-up tim sales — dari lead masuk sampai closing.
          </div>
        </div>
        <button
          onClick={openAdd}
          className="h-10 px-5 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shrink-0"
          style={{ background: '#2563eb' }}
        >
          <Plus size={16} />
          Tambah Lead
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor WA, PIC, negara, catatan..."
            className="w-full h-10 pl-9 pr-3 border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="all">Semua Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-med bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
                <th className="text-left px-4 py-3 whitespace-nowrap">Tanggal Masuk</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">No. WhatsApp</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">PIC Sales</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Negara</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">FU 1</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">FU 2</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">FU 3</th>
                <th className="text-left px-4 py-3 min-w-[180px]">Notes</th>
                <th className="text-right px-4 py-3 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center text-sm text-secondary py-10">Memuat...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center text-sm text-secondary py-16">
                  {search || statusFilter !== 'all' ? 'Tidak ada lead yang cocok.' : 'Belum ada lead.'}
                </td></tr>
              )}
              {!loading && filtered.map((l) => (
                <tr key={l.id} className="border-b border-gray-med last:border-b-0 hover:bg-gray-light/60">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-dark">{fmtDate(l.entryDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-dark font-medium">{l.whatsapp}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-secondary">{l.picSales || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="text-[11px] font-semibold px-2 py-1 rounded-full"
                      style={STATUS_STYLE[l.status] || { background: '#f3f4f6', color: '#374151' }}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-secondary">{l.country || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-secondary">{fmtDate(l.followUp1)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-secondary">{fmtDate(l.followUp2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-secondary">{fmtDate(l.followUp3)}</td>
                  <td className="px-4 py-3 text-secondary max-w-[240px] truncate" title={l.notes || ''}>{l.notes || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(l)} className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-md flex items-center justify-center cursor-pointer">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(l)} className="w-7 h-7 bg-surface border border-gray-med rounded-md flex items-center justify-center cursor-pointer" style={{ color: '#ef4444' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Lead?"
        message={`Data lead "${deleteTarget?.whatsapp}" akan dihapus permanen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
