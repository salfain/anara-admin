import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, Trash2, Download } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import usePermissions from '../hooks/usePermissions';
import Skeleton from '../components/Skeleton';
import { copyText } from '../utils/clipboard';
import { susunLaporan } from '../utils/dailyReport';
import { eksporExcel } from '../utils/excelExport';

// New Leads tidak ada di sini: angkanya selalu jumlah kolom paket, jadi tidak
// ada yang perlu mengetiknya.
const KOLOM = [
  { field: 'janjiTf', label: 'Janji TF' },
  { field: 'totalClosing', label: 'Closing' },
  { field: 'totalFollowup', label: 'Follow Up' },
];

function jumlahRincian(rincian) {
  return Object.values(rincian || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

function hariIni() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTanggal(v) {
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * Nilai yang ditampilkan untuk satu baris.
 *
 * Laporan yang sudah disimpan menang. Kalau belum ada, angkanya diambil dari
 * data lead sebagai usulan, jadi barisnya tidak pernah kosong dan tidak ada
 * yang perlu dibuat lebih dulu.
 */
function nilaiBaris(row) {
  if (row.saved) return row.saved;
  return { ...row.computed, janjiTf: null, notes: null };
}

export default function DailyReports() {
  const push = useToastStore((s) => s.push);
  const { can } = usePermissions();
  const canManage = can('leads.manage');

  const [tanggal, setTanggal] = useState(hariIni);
  const [rows, setRows] = useState([]);
  const [packages, setPackages] = useState([]);
  const [kelolaKolom, setKelolaKolom] = useState(false);
  const [kolomBaru, setKolomBaru] = useState('');
  const [kategori, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  // Ekspor sebulan, bukan sehari: satu hari sudah terlihat di layar, yang
  // dibutuhkan dalam berkas justru perbandingan antar hari.
  const [bulanEkspor, setBulanEkspor] = useState(() => new Date().toISOString().slice(0, 7));

  const fetchDay = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/daily-reports/day', { params: { date: tanggal } });
      setRows(data.data.rows);
      setPackages(data.data.packages);
    } catch {
      push('Gagal memuat laporan harian', 'error');
    } finally {
      setLoading(false);
    }
  }, [tanggal, push]);

  useEffect(() => { fetchDay(true); }, [fetchDay]);

  const fetchKategori = useCallback(() => {
    api.get('/daily-reports/categories')
      .then(({ data }) => setKategori(data.data))
      .catch(() => {});
  }, []);

  useEffect(() => { if (kelolaKolom) fetchKategori(); }, [kelolaKolom, fetchKategori]);

  async function tambahKolom(e) {
    e.preventDefault();
    if (!kolomBaru.trim()) return;
    try {
      await api.post('/daily-reports/categories', { label: kolomBaru.trim() });
      setKolomBaru('');
      fetchKategori();
      fetchDay(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menambah kolom', 'error');
    }
  }

  async function hapusKolom(id) {
    try {
      await api.delete(`/daily-reports/categories/${id}`);
      fetchKategori();
      fetchDay(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus kolom', 'error');
    }
  }

  const total = useMemo(
    () =>
      rows.reduce(
        (a, r) => {
          const v = nilaiBaris(r);
          return {
            newLeads: a.newLeads + jumlahRincian(v.breakdownCounts),
            totalClosing: a.totalClosing + (v.totalClosing || 0),
            totalFollowup: a.totalFollowup + (v.totalFollowup || 0),
            tersimpan: a.tersimpan + (r.saved ? 1 : 0),
          };
        },
        { newLeads: 0, totalClosing: 0, totalFollowup: 0, tersimpan: 0 }
      ),
    [rows]
  );

  async function simpan(row, perubahan) {
    setSavingId(row.userId);
    const nilai = nilaiBaris(row);
    try {
      const { data } = await api.post('/daily-reports', {
        reportDate: tanggal,
        userId: row.userId,
        janjiTf: nilai.janjiTf,
        totalClosing: nilai.totalClosing,
        totalFollowup: nilai.totalFollowup,
        breakdownCounts: nilai.breakdownCounts,
        ...perubahan,
      });
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, saved: data.data } : r)));
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  }

  /** Menyimpan semua baris yang belum tersimpan, apa adanya dari data lead. */
  async function simpanSemua() {
    const belum = rows.filter((r) => !r.saved);
    if (belum.length === 0) return;
    setSavingId('semua');
    try {
      await Promise.all(
        belum.map((r) =>
          api.post('/daily-reports', {
            reportDate: tanggal,
            userId: r.userId,
            ...r.computed,
          })
        )
      );
      fetchDay(false);
      push(`${belum.length} laporan disimpan.`);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function hapus(row) {
    if (!row.saved) return;
    setSavingId(row.userId);
    try {
      await api.delete(`/daily-reports/${row.saved.id}`);
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, saved: null } : r)));
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function ekspor() {
    setExporting(true);
    try {
      const { data } = await api.get('/daily-reports', { params: { month: bulanEkspor } });
      const kolom = packages;
      await eksporExcel({
        namaFile: `laporan-harian-${bulanEkspor}.xlsx`,
        namaSheet: 'Laporan Harian',
        header: ['Tanggal', 'CS', 'New Leads', ...kolom, 'Janji TF', 'Closing', 'Follow Up'],
        baris: data.data.map((r) => [
          String(r.reportDate).slice(0, 10),
          r.picName || '',
          r.newLeads ?? 0,
          ...kolom.map((k) => r.breakdownCounts?.[k] ?? 0),
          // Kosong tetap kosong, bukan nol. Nol berarti tidak ada yang janji
          // transfer, sedangkan kosong berarti belum dihitung.
          r.janjiTf ?? '',
          r.totalClosing ?? 0,
          r.totalFollowup ?? 0,
        ]),
        lebar: [12, 16, 11, ...kolom.map(() => 12), 10, 10, 11],
      });
    } catch {
      push('Gagal membuat file Excel', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function salin(row) {
    const v = nilaiBaris(row);
    const teks = susunLaporan({
      data: {
        date: tanggal,
        picName: row.picName,
        newLeads: jumlahRincian(v.breakdownCounts),
        byPackage: Object.entries(v.breakdownCounts || {}).map(([label, count]) => ({ label, count })),
        closing: v.totalClosing,
        followedUp: v.totalFollowup,
      },
      janjiTf: v.janjiTf ?? '',
    });
    if (!(await copyText(teks))) return push('Gagal menyalin', 'error');
    setCopiedId(row.userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function geserTanggal(hari) {
    const d = new Date(tanggal);
    d.setDate(d.getDate() + hari);
    setTanggal(d.toISOString().slice(0, 10));
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';
  const belumTersimpan = rows.length - total.tersimpan;

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Laporan Harian</div>
        <div className="text-sm text-secondary mt-1">
          Semua CS untuk satu hari. Isi angka per tujuan, sisanya sudah dihitung dari data lead.
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => geserTanggal(-1)} className="h-9 px-3 bg-surface text-gray-dark border border-gray-med rounded-lg text-sm cursor-pointer">
          ‹
        </button>
        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={input} />
        <button onClick={() => geserTanggal(1)} className="h-9 px-3 bg-surface text-gray-dark border border-gray-med rounded-lg text-sm cursor-pointer">
          ›
        </button>
        {tanggal !== hariIni() && (
          <button onClick={() => setTanggal(hariIni())} className="h-9 px-3 text-xs text-secondary underline cursor-pointer">
            Hari ini
          </button>
        )}
        {!loading && (
          <div className="text-xs text-secondary ml-1">
            {total.newLeads} lead baru · {total.totalClosing} closing · {total.totalFollowup} follow up
          </div>
        )}
        <input
          type="month"
          value={bulanEkspor}
          onChange={(e) => setBulanEkspor(e.target.value)}
          title="Bulan yang diekspor"
          className={`${input} w-[150px]`}
        />
        <button
          onClick={ekspor}
          disabled={exporting}
          className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-[13px] font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
        >
          <Download size={14} />
          {exporting ? 'Menyiapkan...' : 'Export Excel'}
        </button>
        {canManage && (
          <button
            onClick={() => setKelolaKolom((v) => !v)}
            className="h-9 px-3 text-xs text-secondary underline cursor-pointer"
          >
            {kelolaKolom ? 'Tutup kolom' : 'Atur kolom'}
          </button>
        )}
        {canManage && belumTersimpan > 0 && (
          <button
            onClick={simpanSemua}
            disabled={savingId === 'semua'}
            className="h-9 px-4 ml-auto text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: '#2563eb' }}
          >
            {savingId === 'semua' ? 'Menyimpan...' : `Simpan ${belumTersimpan} laporan`}
          </button>
        )}
      </div>

      {kelolaKolom && canManage && (
        <div className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col gap-3">
          <div className="text-xs text-secondary">
            Kolom rincian di laporan. Menghapus kolom tidak menghapus angka yang sudah tersimpan.
          </div>
          <div className="flex flex-wrap gap-2">
            {kategori.map((k) => (
              <span key={k.id} className="h-7 pl-3 pr-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-gray-med text-gray-dark">
                {k.label}
                <button
                  onClick={() => hapusKolom(k.id)}
                  className="w-5 h-5 rounded-full text-secondary hover:text-red-600 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={tambahKolom} className="flex gap-2">
            <input
              value={kolomBaru}
              onChange={(e) => setKolomBaru(e.target.value)}
              placeholder="Tambah tujuan, misal: Jepang"
              className={`${input} flex-1 max-w-[280px]`}
            />
            <button type="submit" className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer" style={{ background: '#2563eb' }}>
              Tambah
            </button>
          </form>
        </div>
      )}

      {loading && <Skeleton className="w-full" style={{ height: 220 }} />}

      {!loading && rows.length === 0 && (
        <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
          Belum ada CS aktif.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="hidden lg:block bg-surface border border-gray-med rounded-xl overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  <th className="text-left px-4 py-3 w-[150px]">CS</th>
                  <th className="text-left px-3 py-3 w-[90px]">New Leads</th>
                  {/* Satu kolom per paket, isinya angka saja. */}
                  {packages.map((nama) => (
                    <th key={nama} className="text-left px-2 py-3 w-[80px] normal-case">{nama}</th>
                  ))}
                  {KOLOM.map((k) => (
                    <th key={k.field} className="text-left px-3 py-3 w-[90px]">{k.label}</th>
                  ))}
                  <th className="px-3 py-3 w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = nilaiBaris(r);
                  return (
                    <tr key={r.userId} className={`border-t border-gray-med ${savingId === r.userId ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-2">
                        <div className="text-gray-dark">{r.picName}</div>
                        {/* Yang belum disimpan tetap tampil, tapi jelas bahwa
                            angkanya masih usulan. */}
                        {!r.saved && <div className="text-[10px] text-secondary">belum disimpan</div>}
                      </td>
                      {/* Dihitung dari kolom paket, jadi tidak bisa diketik dan
                          tidak mungkin berbeda dengan rinciannya. */}
                      <td className="px-3 py-2 text-gray-dark font-semibold">
                        {jumlahRincian(v.breakdownCounts)}
                      </td>
                      {packages.map((nama) => (
                        <td key={nama} className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            key={`${r.userId}-${nama}-${r.saved ? 'saved' : 'draft'}`}
                            defaultValue={v.breakdownCounts?.[nama] ?? ''}
                            disabled={!canManage}
                            placeholder="0"
                            onBlur={(e) => {
                              const nilai = e.target.value === '' ? 0 : Number(e.target.value);
                              const sekarang = v.breakdownCounts?.[nama] ?? 0;
                              if (nilai === sekarang) return;
                              simpan(r, { breakdownCounts: { ...v.breakdownCounts, [nama]: nilai } });
                            }}
                            className="w-full h-8 px-1.5 text-sm bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                          />
                        </td>
                      ))}
                      {KOLOM.map((k) => (
                        <td key={k.field} className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            key={`${r.userId}-${k.field}-${r.saved ? 'saved' : 'draft'}`}
                            defaultValue={v[k.field] ?? ''}
                            disabled={!canManage}
                            placeholder={k.field === 'janjiTf' ? '—' : '0'}
                            onBlur={(e) => {
                              const nilai = e.target.value === '' ? null : Number(e.target.value);
                              if (nilai !== (v[k.field] ?? null)) simpan(r, { [k.field]: nilai });
                            }}
                            className="w-full h-8 px-2 text-sm bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => salin(r)}
                            title="Salin untuk dikirim ke grup"
                            className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer"
                          >
                            {copiedId === r.userId ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          {canManage && r.saved && (
                            <button
                              onClick={() => hapus(r)}
                              title="Batalkan laporan tersimpan"
                              className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer"
                              style={{ background: '#ef4444' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden flex flex-col gap-3">
            {rows.map((r) => {
              const v = nilaiBaris(r);
              return (
                <div key={r.userId} className={`bg-surface border border-gray-med rounded-xl p-4 flex flex-col gap-3 ${savingId === r.userId ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-dark">{r.picName}</div>
                      <div className="text-[11px] text-secondary">
                        {r.saved ? `Tersimpan · ${fmtTanggal(tanggal)}` : 'Belum disimpan'}
                      </div>
                    </div>
                    <button
                      onClick={() => salin(r)}
                      className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer shrink-0"
                    >
                      {copiedId === r.userId ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  {packages.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-secondary mb-1">
                        Lead baru per paket ({jumlahRincian(v.breakdownCounts)} total)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {packages.map((nama) => (
                          <label key={nama} className="flex flex-col gap-1">
                            <span className="text-[10px] text-secondary truncate" title={nama}>{nama}</span>
                            <input
                              type="number"
                              min={0}
                              key={`${r.userId}-${nama}-${r.saved ? 'saved' : 'draft'}`}
                              defaultValue={v.breakdownCounts?.[nama] ?? ''}
                              disabled={!canManage}
                              placeholder="0"
                              onBlur={(e) => {
                                const nilai = e.target.value === '' ? 0 : Number(e.target.value);
                                if (nilai === (v.breakdownCounts?.[nama] ?? 0)) return;
                                simpan(r, { breakdownCounts: { ...v.breakdownCounts, [nama]: nilai } });
                              }}
                              className="w-full h-8 px-2 text-sm bg-surface text-gray-dark border border-gray-med rounded-lg focus:outline-none focus:border-primary"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {KOLOM.map((k) => (
                      <label key={k.field} className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{k.label}</span>
                        <input
                          type="number"
                          min={0}
                          key={`${r.userId}-${k.field}-${r.saved ? 'saved' : 'draft'}`}
                          defaultValue={v[k.field] ?? ''}
                          disabled={!canManage}
                          placeholder={k.field === 'janjiTf' ? '—' : '0'}
                          onBlur={(e) => {
                            const nilai = e.target.value === '' ? null : Number(e.target.value);
                            if (nilai !== (v[k.field] ?? null)) simpan(r, { [k.field]: nilai });
                          }}
                          className="w-full h-8 px-2 text-sm bg-surface text-gray-dark border border-gray-med rounded-lg focus:outline-none focus:border-primary"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
