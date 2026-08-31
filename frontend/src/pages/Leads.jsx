import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Upload, Download } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import LeadModal, { LEAD_STATUSES } from '../components/LeadModal';
import ConfirmDialog from '../components/ConfirmDialog';
import LeadDetailSheet from '../components/LeadDetailSheet';
import usePermissions from '../hooks/usePermissions';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function monthKey(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

const STATUS_STYLE = {
  Baru: { background: '#eff6ff', color: '#2563eb' },
  Proses: { background: '#fefce8', color: '#a16207' },
  Nego: { background: '#fff7ed', color: '#c2410c' },
  'Sudah DP': { background: '#f0fdf4', color: '#15803d' },
  Batal: { background: '#fef2f2', color: '#dc2626' },
};

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function Leads() {
  const push = useToastStore((s) => s.push);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { can } = usePermissions();
  const canManage = can('leads.manage');
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [picOptions, setPicOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

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

  useEffect(() => {
    api.get('/users/simple')
      .then(({ data }) => setPicOptions(data.data.filter((u) => u.role === 'cs').map((u) => u.name)))
      .catch(() => {});
    api.get('/packages')
      .then(({ data }) => {
        const names = [...new Set(data.data.map((p) => p.destination).filter(Boolean))].sort();
        setCountryOptions(names);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (picFilter !== 'all' && l.picSales !== picFilter) return false;
      if (monthFilter !== 'all' && monthKey(l.entryDate) !== monthFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [l.whatsapp, l.picSales, l.notes, l.country].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [leads, search, statusFilter, picFilter, monthFilter]);

  const picFilterOptions = useMemo(() => {
    const fromLeads = leads.map((l) => l.picSales).filter(Boolean);
    return [...new Set([...picOptions, ...fromLeads])].sort();
  }, [leads, picOptions]);

  const monthFilterOptions = useMemo(() => {
    const keys = [...new Set(leads.map((l) => monthKey(l.entryDate)).filter(Boolean))];
    return keys.sort().reverse();
  }, [leads]);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const { parseLeadsExcel } = await import('../utils/leadsExcel');
      const { records, skipped } = await parseLeadsExcel(file);
      if (records.length === 0) {
        push('Tidak ada baris valid untuk diimport. Pastikan kolom Tanggal Masuk dan Nomor WhatsApp terisi.', 'error');
        return;
      }
      const { data } = await api.post('/leads/bulk', { rows: records });
      const totalSkipped = skipped + (data.data.skipped || 0);
      push(`${data.data.imported} lead berhasil diimport${totalSkipped ? `, ${totalSkipped} dilewati` : ''}.`);
      fetchLeads(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal mengimport file', 'error');
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { leadsToExcel, downloadExcel } = await import('../utils/leadsExcel');
      const buffer = leadsToExcel(filtered);
      const suffix = monthFilter !== 'all' ? monthFilter : 'semua';
      downloadExcel(`laporan-follow-up-${suffix}.xlsx`, buffer);
    } finally {
      setExporting(false);
    }
  }

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
        {/* Import/Export shrink to icons below sm so all three fit one row. */}
        <div className="flex gap-2 items-center w-full sm:w-auto sm:shrink-0">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          {canManage && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              title="Import Excel"
              aria-label="Import Excel"
              className="h-10 w-10 sm:w-auto sm:px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">{importing ? 'Mengimport...' : 'Import Excel'}</span>
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Export Excel"
            aria-label="Export Excel"
            className="h-10 w-10 sm:w-auto sm:px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{exporting ? 'Menyiapkan...' : 'Export Excel'}</span>
          </button>
          {canManage && (
            <button
              onClick={openAdd}
              className="h-10 px-5 flex-1 sm:flex-none text-white rounded-full btn-3d text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: '#2563eb' }}
            >
              <Plus size={16} />
              Tambah Lead
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
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
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="h-10 px-3 flex-1 min-w-[140px] sm:flex-none border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="all">Semua Bulan</option>
          {monthFilterOptions.map((key) => (
            <option key={key} value={key}>{monthLabel(key)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 flex-1 min-w-[140px] sm:flex-none border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="all">Semua Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={picFilter}
          onChange={(e) => setPicFilter(e.target.value)}
          className="h-10 px-3 flex-1 min-w-[140px] sm:flex-none border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="all">Semua PIC Sales</option>
          {picFilterOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {monthFilter !== 'all' && (
        <div className="text-sm text-secondary -mt-2">
          Menampilkan <strong className="text-gray-dark">{filtered.length}</strong> lead untuk <strong className="text-gray-dark">{monthLabel(monthFilter)}</strong>.
        </div>
      )}

      {/* Mobile: stacked cards. An 11-column table is unreadable at phone width. */}
      <div className="lg:hidden flex flex-col gap-3">
        {loading && (
          <div className="bg-surface border border-gray-med rounded-xl py-10 text-center text-sm text-secondary">Memuat...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="bg-surface border border-gray-med rounded-xl py-12 text-center text-sm text-secondary">
            {search || statusFilter !== 'all' || picFilter !== 'all' || monthFilter !== 'all' ? 'Tidak ada lead yang cocok.' : 'Belum ada lead.'}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
            {filtered.map((l, idx) => {
              const doneCount = [l.followUp1, l.followUp2, l.followUp3].filter(Boolean).length;
              return (
                <button
                  key={l.id}
                  onClick={() => setDetailTarget({ lead: l, index: idx })}
                  className="w-full text-left px-4 py-3 border-b border-gray-med last:border-b-0 flex flex-col gap-1 cursor-pointer active:bg-gray-light"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-dark truncate min-w-0">{l.whatsapp}</div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                      style={STATUS_STYLE[l.status] || { background: '#f3f4f6', color: '#374151' }}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-secondary">
                    <div className="truncate min-w-0">
                      {[l.picSales, l.country, fmtDate(l.entryDate)].filter(Boolean).join(' · ')}
                    </div>
                    <div className="flex gap-1 shrink-0" title={`${doneCount} dari 3 follow-up`}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: i < doneCount ? '#2563eb' : 'var(--color-gray-med)' }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden lg:block bg-surface border border-gray-med rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs table-fixed">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[8%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[19%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-med bg-gray-light text-[10px] font-semibold uppercase tracking-wide text-secondary sticky top-0 z-10">
              <th className="text-left px-2 py-2.5">No.</th>
              <th className="text-left px-2 py-2.5">Masuk</th>
              <th className="text-left px-2 py-2.5">No. WhatsApp</th>
              <th className="text-left px-2 py-2.5">PIC</th>
              <th className="text-left px-2 py-2.5">Status</th>
              <th className="text-left px-2 py-2.5">Negara</th>
              <th className="text-left px-2 py-2.5">FU 1</th>
              <th className="text-left px-2 py-2.5">FU 2</th>
              <th className="text-left px-2 py-2.5">FU 3</th>
              <th className="text-left px-2 py-2.5">Notes</th>
              <th className="text-right px-2 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} className="text-center text-sm text-secondary py-10">Memuat...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} className="text-center text-sm text-secondary py-16">
                {search || statusFilter !== 'all' || picFilter !== 'all' || monthFilter !== 'all' ? 'Tidak ada lead yang cocok.' : 'Belum ada lead.'}
              </td></tr>
            )}
            {!loading && filtered.map((l, idx) => (
              <tr key={l.id} className="border-b border-gray-med last:border-b-0 hover:bg-gray-light/60">
                <td className="px-2 py-2 text-secondary truncate">{idx + 1}</td>
                <td className="px-2 py-2 text-gray-dark truncate" title={fmtDate(l.entryDate)}>{fmtDate(l.entryDate)}</td>
                <td className="px-2 py-2 text-gray-dark font-medium truncate" title={l.whatsapp}>{l.whatsapp}</td>
                <td className="px-2 py-2 text-secondary truncate" title={l.picSales || ''}>{l.picSales || '-'}</td>
                <td className="px-2 py-2 truncate">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={STATUS_STYLE[l.status] || { background: '#f3f4f6', color: '#374151' }}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-secondary truncate" title={l.country || ''}>{l.country || '-'}</td>
                <td className="px-2 py-2 text-secondary truncate">{fmtDate(l.followUp1)}</td>
                <td className="px-2 py-2 text-secondary truncate">{fmtDate(l.followUp2)}</td>
                <td className="px-2 py-2 text-secondary truncate">{fmtDate(l.followUp3)}</td>
                <td className="px-2 py-2 text-secondary truncate" title={l.notes || ''}>{l.notes || '-'}</td>
                <td className="px-2 py-2">
                  <div className="flex justify-end gap-1">
                    {canManage ? (
                      <>
                        <button onClick={() => openEdit(l)} className="w-6 h-6 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer shrink-0">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setDeleteTarget(l)} className="w-6 h-6 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer shrink-0" style={{ background: '#ef4444' }}>
                          <Trash2 size={11} />
                        </button>
                      </>
                    ) : (
                      <span className="text-secondary text-xs">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeadDetailSheet
        open={Boolean(detailTarget)}
        lead={detailTarget?.lead}
        index={detailTarget?.index}
        statusStyle={STATUS_STYLE}
        fmtDate={fmtDate}
        onClose={() => setDetailTarget(null)}
        canManage={canManage}
        onEdit={(l) => { setDetailTarget(null); openEdit(l); }}
        onDelete={(l) => { setDetailTarget(null); setDeleteTarget(l); }}
      />

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={saving}
        picOptions={picOptions}
        countryOptions={countryOptions}
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
