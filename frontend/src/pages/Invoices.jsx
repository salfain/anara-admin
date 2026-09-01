import { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, FileText } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import usePermissions from '../hooks/usePermissions';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import InvoiceEditor from '../components/InvoiceEditor';
import { rupiah, tanggalPanjang } from '../utils/invoice';

export default function Invoices() {
  const push = useToastStore((s) => s.push);
  const { can } = usePermissions();
  const canManage = can('billing.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ invoiceNo: '', customerName: '' });
  const [adding, setAdding] = useState(false);

  const fetchRows = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/invoices', { params: search.trim() ? { search: search.trim() } : {} });
      setRows(data.data);
    } catch {
      push('Gagal memuat invoice', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, push]);

  useEffect(() => {
    const t = setTimeout(() => fetchRows(true), 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  async function tambah(e) {
    e.preventDefault();
    if (!form.invoiceNo.trim() || !form.customerName.trim()) {
      return push('Nomor invoice dan nama customer wajib diisi', 'error');
    }
    setAdding(true);
    try {
      const { data } = await api.post('/invoices', form);
      setForm({ invoiceNo: '', customerName: '' });
      fetchRows(false);
      // Langsung dibuka: yang dibuat baru selalu perlu diisi rinciannya.
      setOpenId(data.data.id);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal membuat invoice', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function hapus() {
    try {
      await api.delete(`/invoices/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchRows(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus invoice', 'error');
    }
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';

  if (openId) {
    return <InvoiceEditor id={openId} canManage={canManage} onClose={() => { setOpenId(null); fetchRows(false); }} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Invoice</div>
        <div className="text-sm text-secondary mt-1">Rincian harga, pembayaran, dan sisa tagihan per customer.</div>
      </div>

      <div className="relative w-full sm:max-w-[360px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor invoice atau customer..."
          className={`${input} w-full pl-9`}
        />
      </div>

      {canManage && (
        <form onSubmit={tambah} className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[200px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nomor Invoice</label>
            <input
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              placeholder="01468/NAD-INV/VIII/26"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[200px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nama Customer</label>
            <input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="NANA ANDRIANI"
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

      {!loading && rows.length === 0 && (
        <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
          {search ? 'Tidak ada invoice yang cocok.' : 'Belum ada invoice.'}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="bg-surface border border-gray-med rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm border-collapse">
            <thead>
              <tr className="bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
                <th className="text-left px-4 py-3 w-[190px]">Nomor</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3 w-[130px]">Tanggal</th>
                <th className="text-left px-4 py-3 w-[90px]">CS</th>
                <th className="text-right px-4 py-3 w-[140px]">Subtotal</th>
                <th className="text-right px-4 py-3 w-[150px]">Sisa</th>
                <th className="px-3 py-3 w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-med hover:bg-gray-light/60">
                  <td className="px-4 py-2.5 text-gray-dark">{r.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-gray-dark">
                    {r.customerName}
                    {r.departureLabel && <div className="text-[11px] text-secondary">{r.departureLabel}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-secondary">{tanggalPanjang(r.invoiceDate) || '-'}</td>
                  <td className="px-4 py-2.5 text-secondary">{r.csName || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-dark text-right">{rupiah(r.subtotal)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: r.outstanding > 0 ? '#f59e0b' : '#16a34a' }}>
                    {rupiah(r.outstanding)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setOpenId(r.id)}
                        title="Buka invoice"
                        className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer"
                      >
                        <FileText size={12} />
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
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus invoice?"
        message={`Invoice ${deleteTarget?.invoiceNo} beserta rincian dan pembayarannya akan dihapus.`}
        onConfirm={hapus}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
