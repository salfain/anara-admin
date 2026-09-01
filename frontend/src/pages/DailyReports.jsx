import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, Trash2, Wand2 } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import usePermissions from '../hooks/usePermissions';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import { copyText } from '../utils/clipboard';
import { susunLaporan } from '../utils/dailyReport';

const KOLOM = [
  { field: 'newLeads', label: 'New Leads' },
  { field: 'janjiTf', label: 'Janji TF' },
  { field: 'totalClosing', label: 'Closing' },
  { field: 'totalFollowup', label: 'Follow Up' },
];

function bulanIni() {
  return new Date().toISOString().slice(0, 7);
}

function fmtTanggal(v) {
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * Riwayat laporan harian per CS.
 *
 * Angkanya disimpan, bukan dihitung ulang saat dibaca. Yang berlaku adalah
 * angka yang dilaporkan hari itu, meski data lead berubah setelahnya. Tombol
 * isi otomatis hanya menyiapkan nilai awal; yang tersimpan tetap angka yang
 * disetujui admin.
 */
export default function DailyReports() {
  const push = useToastStore((s) => s.push);
  const { can } = usePermissions();
  const canManage = can('leads.manage');

  const [month, setMonth] = useState(bulanIni);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [form, setForm] = useState({ reportDate: new Date().toISOString().slice(0, 10), userId: '' });
  const [prefilling, setPrefilling] = useState(false);

  useEffect(() => {
    api.get('/users/simple').then(({ data }) => setUsers(data.data)).catch(() => {});
  }, []);

  const fetchRows = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/daily-reports', { params: { month } });
      setRows(data.data);
    } catch {
      push('Gagal memuat laporan harian', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, push]);

  useEffect(() => { fetchRows(true); }, [fetchRows]);

  const total = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          newLeads: a.newLeads + (r.newLeads || 0),
          totalClosing: a.totalClosing + (r.totalClosing || 0),
          totalFollowup: a.totalFollowup + (r.totalFollowup || 0),
        }),
        { newLeads: 0, totalClosing: 0, totalFollowup: 0 }
      ),
    [rows]
  );

  async function simpan(row, field, value) {
    setSavingId(row.id);
    const sebelum = rows;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [field]: value } : r)));
    try {
      await api.post('/daily-reports', { ...row, [field]: value });
    } catch (err) {
      setRows(sebelum);
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function tambah(e, isiOtomatis) {
    e?.preventDefault();
    if (!form.userId) return push('Pilih CS dulu', 'error');

    let awal = { reportDate: form.reportDate, userId: Number(form.userId) };
    if (isiOtomatis) {
      setPrefilling(true);
      try {
        const { data } = await api.get('/leads/daily-report', {
          params: { date: form.reportDate, userId: form.userId },
        });
        awal = {
          ...awal,
          newLeads: data.data.newLeads,
          totalClosing: data.data.closing,
          totalFollowup: data.data.followedUp,
          breakdown: data.data.byPackage.map((p) => `${p.label} = ${p.count}`).join('\n'),
        };
      } catch {
        push('Gagal mengambil angka dari data lead', 'error');
      } finally {
        setPrefilling(false);
      }
    }

    try {
      await api.post('/daily-reports', awal);
      fetchRows(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal membuat laporan', 'error');
    }
  }

  async function salin(row) {
    const teks = susunLaporan({
      data: {
        date: row.reportDate,
        picName: row.picName,
        newLeads: row.newLeads,
        byPackage: (row.breakdown || '')
          .split('\n')
          .filter(Boolean)
          .map((baris) => {
            const [label, count] = baris.split('=');
            return { label: (label || '').trim(), count: (count || '').trim() };
          }),
        closing: row.totalClosing,
        followedUp: row.totalFollowup,
      },
      janjiTf: row.janjiTf ?? '',
    });
    if (!(await copyText(teks))) return push('Gagal menyalin', 'error');
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function hapus() {
    try {
      await api.delete(`/daily-reports/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchRows(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus', 'error');
    }
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Laporan Harian</div>
        <div className="text-sm text-secondary mt-1">
          Riwayat laporan tiap CS, tersimpan per hari.
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={input} />
        {!loading && rows.length > 0 && (
          <div className="text-xs text-secondary">
            {rows.length} laporan · {total.newLeads} lead baru · {total.totalClosing} closing ·{' '}
            {total.totalFollowup} follow up
          </div>
        )}
      </div>

      {canManage && (
        <form onSubmit={(e) => tambah(e, false)} className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Tanggal</label>
            <input
              type="date"
              value={form.reportDate}
              onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">CS</label>
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className={input}>
              <option value="">Pilih CS...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={(e) => tambah(e, true)}
            disabled={prefilling}
            title="Ambil angkanya dari data lead, lalu boleh diubah"
            className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Wand2 size={14} />
            {prefilling ? 'Mengambil...' : 'Isi otomatis'}
          </button>
          <button
            type="submit"
            className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer"
            style={{ background: '#2563eb' }}
          >
            Buat kosong
          </button>
        </form>
      )}

      {loading && <Skeleton className="w-full" style={{ height: 200 }} />}

      {!loading && rows.length === 0 && (
        <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
          Belum ada laporan pada bulan ini.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="hidden lg:block bg-surface border border-gray-med rounded-xl overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  <th className="text-left px-4 py-3 w-[110px]">Tanggal</th>
                  <th className="text-left px-4 py-3 w-[140px]">CS</th>
                  {KOLOM.map((k) => (
                    <th key={k.field} className="text-left px-3 py-3 w-[100px]">{k.label}</th>
                  ))}
                  <th className="text-left px-4 py-3">Rincian</th>
                  <th className="px-3 py-3 w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-t border-gray-med ${savingId === r.id ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 text-gray-dark">{fmtTanggal(r.reportDate)}</td>
                    <td className="px-4 py-2 text-gray-dark">{r.picName}</td>
                    {KOLOM.map((k) => (
                      <td key={k.field} className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          defaultValue={r[k.field] ?? ''}
                          disabled={!canManage}
                          placeholder={k.field === 'janjiTf' ? '—' : '0'}
                          onBlur={(e) => {
                            const v = e.target.value === '' ? null : Number(e.target.value);
                            if (v !== (r[k.field] ?? null)) simpan(r, k.field, v);
                          }}
                          className="w-full h-8 px-2 text-sm bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <input
                        defaultValue={(r.breakdown || '').replace(/\n/g, ', ')}
                        disabled={!canManage}
                        placeholder="3 negara = 2, Korea = 1"
                        onBlur={(e) => {
                          const v = e.target.value.split(',').map((s) => s.trim()).filter(Boolean).join('\n');
                          if (v !== (r.breakdown || '')) simpan(r, 'breakdown', v);
                        }}
                        className="w-full h-8 px-2 text-sm bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => salin(r)}
                          title="Salin untuk dikirim ke grup"
                          className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer"
                        >
                          {copiedId === r.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        {canManage && (
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer"
                            style={{ background: '#ef4444' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.id} className={`bg-surface border border-gray-med rounded-xl p-4 flex flex-col gap-3 ${savingId === r.id ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-dark">{r.picName}</div>
                    <div className="text-xs text-secondary">{fmtTanggal(r.reportDate)}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => salin(r)}
                      className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer"
                    >
                      {copiedId === r.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    {canManage && (
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer"
                        style={{ background: '#ef4444' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {KOLOM.map((k) => (
                    <label key={k.field} className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{k.label}</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={r[k.field] ?? ''}
                        disabled={!canManage}
                        placeholder={k.field === 'janjiTf' ? '—' : '0'}
                        onBlur={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          if (v !== (r[k.field] ?? null)) simpan(r, k.field, v);
                        }}
                        className="w-full h-8 px-2 text-sm bg-surface text-gray-dark border border-gray-med rounded-lg focus:outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus laporan?"
        message={`Laporan ${deleteTarget?.picName} tanggal ${deleteTarget ? fmtTanggal(deleteTarget.reportDate) : ''} akan dihapus.`}
        onConfirm={hapus}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
