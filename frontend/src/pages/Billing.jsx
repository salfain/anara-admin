import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import usePermissions from '../hooks/usePermissions';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';

// Kolom centang, sesuai pengelompokan di spreadsheet.
const CENTANG = [
  { field: 'paidDp', group: 'Penagihan', label: 'DP' },
  { field: 'paidTicket', group: 'Penagihan', label: 'Tiket' },
  { field: 'paidSettlement', group: 'Penagihan', label: 'Pelunasan' },
  { field: 'bookedOutbound', group: 'Booking Tiket', label: 'Berangkat' },
  { field: 'bookedReturn', group: 'Booking Tiket', label: 'Pulang' },
];

const TEKS = [
  { field: 'codeOutbound', label: 'Kode Brkt' },
  { field: 'codeReturn', label: 'Kode Plg' },
  { field: 'airlineOutbound', label: 'Pesawat Brkt' },
  { field: 'airlineReturn', label: 'Pesawat Plg' },
];

function fmtTanggal(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Penagihan — pengganti spreadsheet PENAGIHAN.
 *
 * Di spreadsheet, tiap keberangkatan punya tab sendiri dan nomor invoice hanya
 * ditulis di baris pertama tiap grup. Di sini keberangkatan jadi satu pilihan,
 * dan tiap peserta punya barisnya sendiri — invoice-nya ditampilkan sebagai
 * kepala grup, bukan sel kosong yang harus ditebak isinya.
 */
export default function Billing() {
  const push = useToastStore((s) => s.push);
  const { can } = usePermissions();
  const canManage = can('billing.manage');

  const [departures, setDepartures] = useState([]);
  const [departureId, setDepartureId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ invoiceNo: '', customerName: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get('/departures')
      .then(({ data }) => {
        setDepartures(data.data);
        setDepartureId((prev) => prev || String(data.data[0]?.id || ''));
      })
      .catch(() => push('Gagal memuat jadwal keberangkatan', 'error'));
  }, [push]);

  const fetchBookings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/bookings', {
        params: departureId ? { departureId } : {},
      });
      setBookings(data.data);
    } catch {
      push('Gagal memuat data penagihan', 'error');
    } finally {
      setLoading(false);
    }
  }, [departureId, push]);

  useEffect(() => { fetchBookings(true); }, [fetchBookings]);
  useAutoRefresh(() => { if (!savingId) fetchBookings(false); }, 30000, [departureId, savingId]);

  const ringkasan = useMemo(() => {
    const peserta = bookings.flatMap((b) => b.participants);
    return {
      invoice: bookings.length,
      peserta: peserta.length,
      lunas: peserta.filter((p) => p.paidSettlement).length,
      belumDp: peserta.filter((p) => !p.paidDp).length,
    };
  }, [bookings]);

  async function ubahPeserta(booking, peserta, field, value) {
    setSavingId(peserta.id);
    setBookings((prev) =>
      prev.map((b) =>
        b.id !== booking.id
          ? b
          : { ...b, participants: b.participants.map((p) => (p.id === peserta.id ? { ...p, [field]: value } : p)) }
      )
    );
    try {
      await api.put(`/bookings/${booking.id}/participants/${peserta.id}`, { [field]: value });
    } catch (err) {
      // Kembalikan ke nilai sebelumnya; centang yang terlihat tersimpan padahal
      // gagal jauh lebih berbahaya di data pembayaran.
      setBookings((prev) =>
        prev.map((b) =>
          b.id !== booking.id
            ? b
            : { ...b, participants: b.participants.map((p) => (p.id === peserta.id ? peserta : p)) }
        )
      );
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function tambahBooking(e) {
    e.preventDefault();
    if (!form.customerName.trim()) return push('Nama customer wajib diisi', 'error');
    setAdding(true);
    try {
      await api.post('/bookings', { ...form, departureId: departureId ? Number(departureId) : null });
      setForm({ invoiceNo: '', customerName: '' });
      fetchBookings(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal membuat booking', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function tambahPeserta(booking, nama) {
    if (!nama.trim()) return;
    try {
      await api.post(`/bookings/${booking.id}/participants`, { name: nama.trim() });
      fetchBookings(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menambah peserta', 'error');
    }
  }

  async function hapus() {
    try {
      if (deleteTarget.kind === 'booking') {
        await api.delete(`/bookings/${deleteTarget.id}`);
      } else {
        await api.delete(`/bookings/${deleteTarget.bookingId}/participants/${deleteTarget.id}`);
      }
      setDeleteTarget(null);
      fetchBookings(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus', 'error');
    }
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Penagihan</div>
        <div className="text-sm text-secondary mt-1">
          Invoice, peserta, dan progres pembayaran per keberangkatan
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={departureId} onChange={(e) => setDepartureId(e.target.value)} className={`${input} min-w-[260px]`}>
          <option value="">Semua keberangkatan</option>
          {departures.map((d) => (
            <option key={d.id} value={d.id}>
              {d.packageName} — {fmtTanggal(d.departDate)}
            </option>
          ))}
        </select>
        {!loading && bookings.length > 0 && (
          <div className="text-xs text-secondary">
            {ringkasan.invoice} invoice · {ringkasan.peserta} peserta · {ringkasan.lunas} lunas
            {ringkasan.belumDp > 0 && ` · ${ringkasan.belumDp} belum DP`}
          </div>
        )}
      </div>

      {canManage && (
        <form onSubmit={tambahBooking} className="bg-surface border border-gray-med rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nomor Invoice</label>
            <input
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              placeholder="01454/NAD-INV/VII/26"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Customer</label>
            <input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Nama customer"
              className={input}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: '#2563eb' }}
          >
            {adding ? 'Membuat...' : 'Buat Invoice'}
          </button>
        </form>
      )}

      {loading && <Skeleton className="w-full" style={{ height: 200 }} />}

      {!loading && bookings.length === 0 && (
        <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
          Belum ada invoice untuk keberangkatan ini.
        </div>
      )}

      {!loading && bookings.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          canManage={canManage}
          savingId={savingId}
          onToggle={ubahPeserta}
          onAddParticipant={tambahPeserta}
          onDelete={setDeleteTarget}
        />
      ))}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'booking' ? 'Hapus invoice?' : 'Hapus peserta?'}
        message={
          deleteTarget?.kind === 'booking'
            ? `Invoice "${deleteTarget?.label}" beserta seluruh pesertanya akan dihapus.`
            : `Peserta "${deleteTarget?.label}" akan dihapus.`
        }
        onConfirm={hapus}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BookingCard({ booking, canManage, savingId, onToggle, onAddParticipant, onDelete }) {
  const [namaBaru, setNamaBaru] = useState('');

  return (
    <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-med flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-dark truncate">{booking.customerName}</div>
          <div className="text-xs text-secondary truncate">
            {booking.invoiceNo || 'Tanpa nomor invoice'}
            {booking.packageName && ` · ${booking.packageName}`}
            {booking.departDate && ` · ${fmtTanggal(booking.departDate)}`}
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => onDelete({ kind: 'booking', id: booking.id, label: booking.customerName })}
            className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: '#ef4444' }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs border-collapse">
          <thead>
            <tr className="bg-gray-light text-[10px] font-semibold uppercase tracking-wide text-secondary">
              <th className="text-left px-3 py-2 w-[200px]">Peserta</th>
              {CENTANG.map((c) => (
                <th key={c.field} className="px-2 py-2 w-[70px]">
                  <div className="text-[8px] opacity-70">{c.group}</div>
                  {c.label}
                </th>
              ))}
              {TEKS.map((t) => (
                <th key={t.field} className="text-left px-2 py-2 w-[110px]">{t.label}</th>
              ))}
              {canManage && <th className="px-2 py-2 w-[44px]" />}
            </tr>
          </thead>
          <tbody>
            {booking.participants.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-secondary py-4">Belum ada peserta.</td>
              </tr>
            )}
            {booking.participants.map((p) => (
              <tr key={p.id} className={`border-t border-gray-med ${savingId === p.id ? 'opacity-60' : ''}`}>
                <td className="px-3 py-2 text-gray-dark">
                  {p.name}
                  {p.origin && <span className="text-secondary"> · {p.origin}</span>}
                </td>
                {CENTANG.map((c) => (
                  <td key={c.field} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(p[c.field])}
                      disabled={!canManage}
                      onChange={(e) => onToggle(booking, p, c.field, e.target.checked)}
                      className="cursor-pointer"
                    />
                  </td>
                ))}
                {TEKS.map((t) => (
                  <td key={t.field} className="px-1 py-1">
                    <input
                      defaultValue={p[t.field] || ''}
                      disabled={!canManage}
                      // Disimpan saat selesai mengetik, bukan tiap ketukan.
                      onBlur={(e) => e.target.value !== (p[t.field] || '') && onToggle(booking, p, t.field, e.target.value)}
                      className="w-full h-7 px-1.5 text-xs bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                    />
                  </td>
                ))}
                {canManage && (
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => onDelete({ kind: 'participant', id: p.id, bookingId: booking.id, label: p.name })}
                      className="w-6 h-6 rounded-full btn-3d-danger btn-3d-sm text-white inline-flex items-center justify-center cursor-pointer"
                      style={{ background: '#ef4444' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="px-3 py-2 border-t border-gray-med flex gap-2">
          <input
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddParticipant(booking, namaBaru);
                setNamaBaru('');
              }
            }}
            placeholder="Tambah nama peserta..."
            className="flex-1 h-8 px-2.5 text-xs bg-transparent text-gray-dark border border-gray-med rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => { onAddParticipant(booking, namaBaru); setNamaBaru(''); }}
            disabled={!namaBaru.trim()}
            className="h-8 px-3 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary btn-3d-sm text-xs font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1"
          >
            <Plus size={12} />
            Tambah
          </button>
        </div>
      )}
    </div>
  );
}
