import { useCallback, useEffect, useState } from 'react';
import { Trash2, Download } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import ConfirmDialog from './ConfirmDialog';
import Skeleton from './Skeleton';
import { eksporExcel, tanggalOnly } from '../utils/excelExport';

const SEAT_UMUM = ['AVAILABLE', 'WAITING LIST', 'ON REQUEST', 'FULL', 'CLOSED'];

function warnaSeat(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'AVAILABLE') return { background: 'var(--color-success-soft)', color: 'var(--color-success-soft-text)' };
  if (s === 'FULL' || s === 'CLOSED') return { background: '#fee2e2', color: '#b91c1c' };
  return { background: 'var(--color-warn-soft)', color: 'var(--color-warn-soft-text)' };
}

function fmtTanggal(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Jadwal keberangkatan per paket — pengganti spreadsheet Status Seat.
 *
 * Default-nya hanya menampilkan yang akan datang: pertanyaan yang dijawab di
 * sini hampir selalu "masih ada seat?", dan tanggal yang sudah lewat cuma
 * memperpanjang daftar. Riwayat tetap bisa dibuka lewat tombol.
 */
export default function DeparturesTab({ canManage }) {
  const push = useToastStore((s) => s.push);
  const [rows, setRows] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    packageId: '', departDate: '', returnDate: '', seatStatus: 'AVAILABLE', capacity: 40,
  });
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchRows = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [d, p] = await Promise.all([
        api.get('/departures', { params: upcomingOnly ? { upcoming: '1' } : {} }),
        api.get('/packages'),
      ]);
      setRows(d.data.data);
      setPackages(p.data.data);
    } catch {
      push('Gagal memuat jadwal keberangkatan', 'error');
    } finally {
      setLoading(false);
    }
  }, [push, upcomingOnly]);

  useEffect(() => { fetchRows(true); }, [fetchRows]);
  useAutoRefresh(() => fetchRows(false), 30000, [upcomingOnly]);

  const terlihat = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.packageName, r.destination, r.seatStatus].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  async function ubahStatus(row, seatStatus) {
    if (seatStatus === row.seatStatus) return;
    setSavingId(row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, seatStatus } : r)));
    try {
      await api.put(`/departures/${row.id}`, { seatStatus });
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
      push(err.response?.data?.error || 'Gagal menyimpan status seat', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function tambah(e) {
    e.preventDefault();
    if (!form.packageId || !form.departDate) return push('Paket dan tanggal wajib diisi', 'error');
    setAdding(true);
    try {
      await api.post('/departures', {
        ...form,
        packageId: Number(form.packageId),
        capacity: Number(form.capacity) || 40,
        returnDate: form.returnDate || null,
      });
      // Paket dibiarkan terpilih: menambah beberapa tanggal untuk satu paket
      // adalah pemakaian yang paling sering.
      setForm({ ...form, departDate: '', returnDate: '' });
      fetchRows(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menambah keberangkatan', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function ekspor() {
    setExporting(true);
    try {
      await eksporExcel({
        // Yang diekspor adalah baris yang sedang terlihat, termasuk hasil
        // pencarian dan filter. Kalau tidak, isi berkasnya tidak sama dengan
        // yang barusan dilihat di layar.
        namaFile: `jadwal-keberangkatan-${new Date().toISOString().slice(0, 10)}.xlsx`,
        namaSheet: 'Jadwal',
        header: ['Paket', 'Destinasi', 'Berangkat', 'Pulang', 'Status Seat', 'Kapasitas', 'Terisi', 'Sisa'],
        baris: terlihat.map((r) => [
          r.packageName || '',
          r.destination || '',
          tanggalOnly(r.departDate),
          tanggalOnly(r.returnDate),
          r.seatStatus || '',
          r.capacity ?? '',
          r.booked ?? '',
          r.seatsLeft ?? '',
        ]),
        lebar: [36, 16, 12, 12, 14, 10, 8, 8],
      });
    } catch {
      push('Gagal membuat file Excel', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function hapus() {
    try {
      await api.delete(`/departures/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchRows(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus', 'error');
    }
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari paket atau destinasi..."
          className={`${input} flex-1 min-w-[200px]`}
        />
        <button
          onClick={ekspor}
          disabled={exporting || terlihat.length === 0}
          className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-[13px] font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
        >
          <Download size={14} />
          {exporting ? 'Menyiapkan...' : 'Export Excel'}
        </button>
        <button
          onClick={() => setUpcomingOnly((v) => !v)}
          className="h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer border shrink-0"
          style={upcomingOnly
            ? { background: 'var(--color-info-soft)', color: 'var(--color-info-soft-text)', borderColor: 'transparent' }
            : { background: 'var(--color-surface)', color: 'var(--color-secondary)', borderColor: 'var(--color-gray-med)' }}
        >
          {upcomingOnly ? 'Akan datang' : 'Semua tanggal'}
        </button>
      </div>

      {canManage && (
        <form onSubmit={tambah} className="bg-surface border border-gray-med rounded-xl p-4 grid grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5 col-span-2 lg:flex-1 lg:min-w-[200px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Paket</label>
            <select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })} className={input}>
              <option value="">Pilih paket...</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Keberangkatan</label>
            <input
              type="date"
              value={form.departDate}
              onChange={(e) => setForm({ ...form, departDate: e.target.value })}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Kepulangan</label>
            <input
              type="date"
              value={form.returnDate}
              min={form.departDate || undefined}
              onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5 lg:w-[110px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Kapasitas</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Status Seat</label>
            <select value={form.seatStatus} onChange={(e) => setForm({ ...form, seatStatus: e.target.value })} className={input}>
              {SEAT_UMUM.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="h-9 px-4 col-span-2 lg:col-span-1 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: '#2563eb' }}
          >
            {adding ? 'Menambah...' : 'Tambah'}
          </button>
        </form>
      )}

      <div className="hidden lg:block bg-surface border border-gray-med rounded-xl overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm border-collapse">
          <thead>
            <tr className="bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
              <th className="text-left px-4 py-3">Paket</th>
              <th className="text-left px-4 py-3 w-[130px]">Berangkat</th>
              <th className="text-left px-4 py-3 w-[130px]">Pulang</th>
              <th className="text-left px-4 py-3 w-[130px]">Sisa Seat</th>
              <th className="text-left px-4 py-3 w-[160px]">Status Seat</th>
              {canManage && <th className="px-4 py-3 w-[60px]" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6"><Skeleton className="h-3.5" /></td>
              </tr>
            )}
            {!loading && terlihat.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-sm text-secondary py-12">
                  {upcomingOnly
                    ? 'Belum ada keberangkatan yang akan datang. Coba lihat semua tanggal.'
                    : 'Belum ada jadwal keberangkatan.'}
                </td>
              </tr>
            )}
            {!loading && terlihat.map((r) => (
              <tr key={r.id} className={`border-t border-gray-med ${savingId === r.id ? 'opacity-60' : ''}`}>
                <td className="px-4 py-2.5 text-gray-dark">
                  {r.packageName}
                  {r.destination && <span className="text-secondary text-xs"> · {r.destination}</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-dark">{fmtTanggal(r.departDate)}</td>
                <td className="px-4 py-2.5 text-secondary">{fmtTanggal(r.returnDate)}</td>
                <td className="px-4 py-2.5"><SisaSeat row={r} /></td>
                <td className="px-4 py-2.5">
                  {canManage ? (
                    <select
                      value={r.seatStatus}
                      onChange={(e) => ubahStatus(r, e.target.value)}
                      className="h-7 px-2 text-xs rounded-full border-0 font-semibold cursor-pointer"
                      style={warnaSeat(r.seatStatus)}
                    >
                      {SEAT_UMUM.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {/* Status dari spreadsheet yang belum masuk daftar tetap
                          terbaca, dan tidak diam-diam berubah saat disimpan. */}
                      {!SEAT_UMUM.includes(r.seatStatus) && <option value={r.seatStatus}>{r.seatStatus}</option>}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={warnaSeat(r.seatStatus)}>
                      {r.seatStatus}
                    </span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white inline-flex items-center justify-center cursor-pointer"
                      style={{ background: '#ef4444' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ponsel: satu kartu per keberangkatan. Tabel tujuh kolom di layar
          selebar telapak tangan hanya bisa dibaca dengan menggeser. */}
      <div className="lg:hidden flex flex-col gap-3">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-gray-med rounded-xl p-4">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
        {!loading && terlihat.length === 0 && (
          <div className="bg-surface border border-gray-med rounded-xl py-10 text-center text-sm text-secondary">
            {upcomingOnly ? 'Belum ada keberangkatan yang akan datang.' : 'Belum ada jadwal keberangkatan.'}
          </div>
        )}
        {!loading && terlihat.map((r) => (
          <div key={r.id} className={`bg-surface border border-gray-med rounded-xl p-4 flex flex-col gap-3 ${savingId === r.id ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-dark">{r.packageName}</div>
                <div className="text-xs text-secondary mt-0.5">
                  {fmtTanggal(r.departDate)}
                  {r.returnDate && ` - ${fmtTanggal(r.returnDate)}`}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer shrink-0"
                  style={{ background: '#ef4444' }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SisaSeat row={r} />
              {canManage ? (
                <select
                  value={r.seatStatus}
                  onChange={(e) => ubahStatus(r, e.target.value)}
                  className="h-7 px-2 text-xs rounded-full border-0 font-semibold cursor-pointer"
                  style={warnaSeat(r.seatStatus)}
                >
                  {SEAT_UMUM.map((st) => <option key={st} value={st}>{st}</option>)}
                  {!SEAT_UMUM.includes(r.seatStatus) && <option value={r.seatStatus}>{r.seatStatus}</option>}
                </select>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={warnaSeat(r.seatStatus)}>
                  {r.seatStatus}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus keberangkatan?"
        message={`${deleteTarget?.packageName} — ${fmtTanggal(deleteTarget?.departDate)}`}
        onConfirm={hapus}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/**
 * Sisa seat dihitung dari jumlah PESERTA di Penagihan, bukan jumlah invoice —
 * satu invoice bisa membawa empat orang.
 *
 * Angka terisi ikut ditampilkan, bukan hanya sisanya: "4 dari 40" menjawab
 * "sudah laku berapa" sekaligus "masih ada berapa", dan kalau sisanya salah,
 * pembilangnya langsung terlihat.
 */
function SisaSeat({ row }) {
  if (row.seatsLeft === undefined) return <span className="text-secondary">-</span>;

  const penuh = row.seatsLeft <= 0;
  const menipis = !penuh && row.seatsLeft <= 5;

  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className="text-sm font-semibold"
        style={{ color: penuh ? '#ef4444' : menipis ? '#f59e0b' : 'var(--color-gray-dark)' }}
      >
        {/* Kelebihan pesan tidak disembunyikan jadi nol — kalau peserta melebihi
            kapasitas, itu justru yang paling perlu terlihat. */}
        {row.seatsLeft}
      </span>
      <span className="text-[11px] text-secondary">
        sisa · {row.booked}/{row.capacity} terisi
      </span>
    </span>
  );
}
