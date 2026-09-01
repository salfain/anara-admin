import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import usePermissions from '../hooks/usePermissions';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import { eksporExcel } from '../utils/excelExport';

// Kolom centang, sesuai pengelompokan di spreadsheet.
const CENTANG = [
  { field: 'paidDp', group: 'Penagihan', label: 'DP' },
  { field: 'paidTicket', group: 'Penagihan', label: 'Tiket' },
  { field: 'paidSettlement', group: 'Penagihan', label: 'Pelunasan' },
  { field: 'bookedOutbound', group: 'Booking Tiket', label: 'Berangkat' },
  { field: 'bookedReturn', group: 'Booking Tiket', label: 'Pulang' },
];

// Urutannya mengikuti spreadsheet: tiap kelompok punya kolom berangkat
// (START) dan pulang (FINISH).
const TEKS = [
  { field: 'ticketOutbound', label: 'Tiket Brkt' },
  { field: 'ticketReturn', label: 'Tiket Plg' },
  { field: 'airlineOutbound', label: 'Pesawat Brkt' },
  { field: 'airlineReturn', label: 'Pesawat Plg' },
  { field: 'codeOutbound', label: 'Kode Brkt' },
  { field: 'codeReturn', label: 'Kode Plg' },
];

// START dan FINISH peserta, kota asal dan kota kembali.
const RUTE = [
  { field: 'origin', label: 'Start' },
  { field: 'destination', label: 'Finish' },
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
  // 'dp' | 'tiket' | null — menyaring ke peserta yang belum bayar, supaya
  // pertanyaan "siapa yang belum" terjawab namanya, bukan cuma angkanya.
  const [tunggakan, setTunggakan] = useState(null);
  const [form, setForm] = useState({ invoiceNo: '', customerName: '' });
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      belumTiket: peserta.filter((p) => !p.paidTicket).length,
    };
  }, [bookings]);

  function belumBayar(p) {
    if (tunggakan === 'dp') return !p.paidDp;
    if (tunggakan === 'tiket') return !p.paidTicket;
    return false;
  }

  // Invoice yang seluruh pesertanya sudah bayar ikut disembunyikan saat
  // menyaring — kartu kosong hanya menambah gulir.
  const terlihat = tunggakan
    ? bookings
        .map((b) => ({ ...b, participants: b.participants.filter(belumBayar) }))
        .filter((b) => b.participants.length > 0)
    : bookings;

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

  const ya = (v) => (v ? 'TRUE' : 'FALSE');

  async function ekspor() {
    setExporting(true);
    try {
      const dipilih = departures.find((d) => String(d.id) === departureId);
      await eksporExcel({
        namaFile: `penagihan-${dipilih ? dipilih.packageName.replace(/\s+/g, '-') : 'semua'}.xlsx`,
        namaSheet: 'Penagihan',
        header: [
          'No', 'Nomor Invoice', 'Customer', 'Nama Peserta', 'Start', 'Finish',
          'DP', 'Tiket', 'Pelunasan', 'Booking Berangkat', 'Booking Pulang',
          'Tiket Brkt', 'Tiket Plg', 'Pesawat Brkt', 'Pesawat Plg', 'Kode Brkt', 'Kode Plg',
        ],
        // Nomor invoice dan customer diulang di tiap baris peserta, tidak
        // dikosongkan seperti di spreadsheet. Berkas yang tiap barisnya utuh
        // bisa disaring dan diurutkan; yang mengandalkan sel gabungan tidak.
        baris: terlihat.flatMap((b) =>
          b.participants.map((p, i) => [
            i + 1, b.invoiceNo || '', b.customerName || '', p.name || '',
            p.origin || '', p.destination || '',
            ya(p.paidDp), ya(p.paidTicket), ya(p.paidSettlement),
            ya(p.bookedOutbound), ya(p.bookedReturn),
            p.ticketOutbound || '', p.ticketReturn || '',
            p.airlineOutbound || '', p.airlineReturn || '',
            p.codeOutbound || '', p.codeReturn || '',
          ])
        ),
        lebar: [5, 22, 16, 26, 12, 12, 8, 8, 11, 17, 15, 12, 12, 14, 14, 12, 12],
      });
    } catch {
      push('Gagal membuat file Excel', 'error');
    } finally {
      setExporting(false);
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
        <select value={departureId} onChange={(e) => setDepartureId(e.target.value)} className={`${input} w-full sm:w-auto sm:min-w-[260px]`}>
          <option value="">Semua keberangkatan</option>
          {departures.map((d) => (
            <option key={d.id} value={d.id}>
              {d.packageName} — {fmtTanggal(d.departDate)}
            </option>
          ))}
        </select>
        {!loading && bookings.length > 0 && (
          <button
            onClick={ekspor}
            disabled={exporting}
            className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-[13px] font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
          >
            <Download size={14} />
            {exporting ? 'Menyiapkan...' : 'Export Excel'}
          </button>
        )}
        {!loading && bookings.length > 0 && (
          <div className="text-xs text-secondary">
            {ringkasan.invoice} invoice · {ringkasan.peserta} peserta · {ringkasan.lunas} lunas
          </div>
        )}
      </div>

      {!loading && (ringkasan.belumDp > 0 || ringkasan.belumTiket > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-secondary">Belum bayar:</span>
          <TombolTunggakan
            aktif={tunggakan === 'dp'}
            jumlah={ringkasan.belumDp}
            label="belum DP"
            onClick={() => setTunggakan(tunggakan === 'dp' ? null : 'dp')}
          />
          <TombolTunggakan
            aktif={tunggakan === 'tiket'}
            jumlah={ringkasan.belumTiket}
            label="belum bayar tiket"
            onClick={() => setTunggakan(tunggakan === 'tiket' ? null : 'tiket')}
          />
          {tunggakan && (
            <button onClick={() => setTunggakan(null)} className="h-7 px-2 text-xs text-secondary underline cursor-pointer">
              Tampilkan semua
            </button>
          )}
        </div>
      )}

      {canManage && (
        <form onSubmit={tambahBooking} className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nomor Invoice</label>
            <input
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              placeholder="01454/NAD-INV/VII/26"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[180px]">
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

      {!loading && terlihat.length === 0 && (
        <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
          {tunggakan
            ? 'Semua peserta sudah bayar untuk kategori ini.'
            : 'Belum ada invoice untuk keberangkatan ini.'}
        </div>
      )}

      {!loading && terlihat.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          canManage={canManage}
          savingId={savingId}
          onToggle={ubahPeserta}
          onAddParticipant={tambahPeserta}
          onDelete={setDeleteTarget}
          sorot={tunggakan}
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

/** Hitungan tunggakan yang sekaligus jadi penyaring — angkanya bisa dibuka. */
function TombolTunggakan({ aktif, jumlah, label, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={jumlah === 0}
      className="h-7 px-3 rounded-full text-xs font-semibold cursor-pointer border disabled:opacity-50 disabled:cursor-default"
      style={aktif
        ? { background: 'var(--color-warn-soft)', color: 'var(--color-warn-soft-text)', borderColor: 'transparent' }
        : { background: 'transparent', color: 'var(--color-secondary)', borderColor: 'var(--color-gray-med)' }}
    >
      {jumlah} {label}
    </button>
  );
}

function BookingCard({ booking, canManage, savingId, onToggle, onAddParticipant, onDelete, sorot }) {
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

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-[1180px] text-xs border-collapse">
          <thead>
            <tr className="bg-gray-light text-[10px] font-semibold uppercase tracking-wide text-secondary">
              <th className="text-left px-3 py-2 w-[180px]">Peserta</th>
              {RUTE.map((t) => (
                <th key={t.field} className="text-left px-2 py-2 w-[90px]">{t.label}</th>
              ))}
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
                <td colSpan={14} className="text-center text-secondary py-4">Belum ada peserta.</td>
              </tr>
            )}
            {booking.participants.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-gray-med ${savingId === p.id ? 'opacity-60' : ''}`}
                style={sorot ? { borderLeft: '3px solid #f59e0b' } : undefined}
              >
                <td className="px-3 py-2 text-gray-dark">{p.name}</td>
                {RUTE.map((t) => (
                  <td key={t.field} className="px-1 py-1">
                    <input
                      defaultValue={p[t.field] || ''}
                      disabled={!canManage}
                      onBlur={(e) => e.target.value !== (p[t.field] || '') && onToggle(booking, p, t.field, e.target.value)}
                      className="w-full h-7 px-1.5 text-xs bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                    />
                  </td>
                ))}
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

      {/* Ponsel: satu kartu per peserta. Dua belas kolom tidak terbaca di layar
          selebar ini, dan menggeser ke samping sambil mencentang mudah salah. */}
      <div className="lg:hidden flex flex-col">
        {booking.participants.length === 0 && (
          <div className="px-4 py-4 text-center text-xs text-secondary">Belum ada peserta.</div>
        )}
        {booking.participants.map((p) => (
          <div
            key={p.id}
            className={`px-4 py-3 border-t border-gray-med flex flex-col gap-2.5 ${savingId === p.id ? 'opacity-60' : ''}`}
            style={sorot ? { borderLeft: '3px solid #f59e0b' } : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-gray-dark truncate">{p.name}</div>
              {canManage && (
                <button
                  onClick={() => onDelete({ kind: 'participant', id: p.id, bookingId: booking.id, label: p.name })}
                  className="w-6 h-6 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer shrink-0"
                  style={{ background: '#ef4444' }}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>

            {/* Centang jadi tombol, bukan kotak kecil — jempol butuh sasaran
                yang lebih besar daripada kursor. */}
            <div className="flex flex-wrap gap-1.5">
              {CENTANG.map((c) => (
                <button
                  key={c.field}
                  disabled={!canManage}
                  onClick={() => onToggle(booking, p, c.field, !p[c.field])}
                  className="h-7 px-2.5 rounded-full text-[11px] font-semibold border cursor-pointer disabled:cursor-default"
                  style={p[c.field]
                    ? { background: 'var(--color-success-soft)', color: 'var(--color-success-soft-text)', borderColor: 'transparent' }
                    : { background: 'transparent', color: 'var(--color-secondary)', borderColor: 'var(--color-gray-med)' }}
                >
                  {p[c.field] ? '✓ ' : ''}{c.group === 'Booking Tiket' ? `Booking ${c.label}` : c.label}
                </button>
              ))}
            </div>

            <DetailTiket peserta={p} booking={booking} canManage={canManage} onToggle={onToggle} />
          </div>
        ))}
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

/**
 * Kode booking dan nama pesawat, disembunyikan sampai diminta.
 *
 * Empat kolom teks per peserta memenuhi layar ponsel, padahal kebanyakan waktu
 * yang dicari cuma status pembayaran. Dibuka saat memang perlu diisi.
 */
function DetailTiket({ peserta, booking, canManage, onToggle }) {
  const [buka, setBuka] = useState(false);
  const terisi = [...RUTE, ...TEKS].filter((t) => peserta[t.field]).length;

  if (!buka) {
    return (
      <button
        onClick={() => setBuka(true)}
        className="text-[11px] text-secondary underline text-left cursor-pointer"
      >
        {terisi > 0 ? `Detail tiket (${terisi} terisi)` : 'Isi detail tiket'}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {[...RUTE, ...TEKS].map((t) => (
        <label key={t.field} className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{t.label}</span>
          <input
            defaultValue={peserta[t.field] || ''}
            disabled={!canManage}
            onBlur={(e) =>
              e.target.value !== (peserta[t.field] || '') && onToggle(booking, peserta, t.field, e.target.value)
            }
            className="h-8 px-2 text-xs bg-surface text-gray-dark border border-gray-med rounded-lg focus:outline-none focus:border-primary"
          />
        </label>
      ))}
    </div>
  );
}
