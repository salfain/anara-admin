import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Printer, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import Skeleton from './Skeleton';
import InvoicePrint from './InvoicePrint';
import { rupiah } from '../utils/invoice';

const FIELD = [
  { key: 'customerName', label: 'Nama Customer' },
  { key: 'customerAddress', label: 'Alamat' },
  { key: 'customerPhone', label: 'Nomor Telepon' },
  { key: 'departureLabel', label: 'Date Of Departure', placeholder: '29 DESEMBER 2026 - 03 JANUARI 2027' },
  { key: 'revision', label: 'Revision' },
  { key: 'csName', label: 'CS' },
];

const TANGGAL = [
  { key: 'invoiceDate', label: 'Invoice Out' },
  { key: 'ticketPaymentDate', label: 'Ticket Payment' },
  { key: 'repaymentDate', label: 'Repayment' },
];

/**
 * Menyunting satu invoice, dengan pratinjau cetak di bawahnya.
 *
 * Pratinjaunya bukan hiasan: yang dikirim ke customer adalah halaman itu, jadi
 * kesalahan ketik terlihat di bentuk akhirnya, bukan di form.
 */
export default function InvoiceEditor({ id, canManage, onClose }) {
  const push = useToastStore((s) => s.push);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data.data);
    } catch {
      push('Gagal memuat invoice', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, push]);

  useEffect(() => { muat(); }, [muat]);

  async function simpanField(key, value) {
    if (value === (invoice[key] || '')) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/invoices/${id}`, { [key]: value });
      setInvoice(data.data);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  /** Baris rincian dan pembayaran dikirim utuh, bukan per baris. */
  async function simpanBaris(jenis, baris) {
    setSaving(true);
    try {
      const { data } = await api.put(`/invoices/${id}/${jenis}`, { [jenis]: baris });
      setInvoice(data.data);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  const ubahItem = (i, patch) =>
    simpanBaris('items', invoice.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const ubahBayar = (i, patch) =>
    simpanBaris('payments', invoice.payments.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';
  const sel =
    'w-full h-8 px-2 text-sm bg-transparent text-gray-dark border border-transparent rounded hover:border-gray-med focus:border-primary focus:outline-none';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="w-full" style={{ height: 320 }} />
      </div>
    );
  }
  if (!invoice) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onClose} className="h-9 px-3 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer flex items-center gap-1.5">
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-sm text-secondary">
          {invoice.invoiceNo}
          {saving && <span className="ml-2">menyimpan...</span>}
        </div>
        <button
          onClick={() => window.print()}
          className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer flex items-center gap-1.5"
          style={{ background: '#2563eb' }}
        >
          <Printer size={14} />
          Cetak / Simpan PDF
        </button>
      </div>

      {canManage && (
        <div className="bg-surface border border-gray-med rounded-xl p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIELD.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark">{f.label}</span>
                <input
                  defaultValue={invoice[f.key] || ''}
                  placeholder={f.placeholder}
                  onBlur={(e) => simpanField(f.key, e.target.value)}
                  className={input}
                />
              </label>
            ))}
            {TANGGAL.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark">{f.label}</span>
                <input
                  type="date"
                  defaultValue={invoice[f.key] ? String(invoice[f.key]).slice(0, 10) : ''}
                  onBlur={(e) => simpanField(f.key, e.target.value)}
                  className={input}
                />
              </label>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-dark">Rincian</div>
              <button
                onClick={() => simpanBaris('items', [...invoice.items, { code: '', description: '', qty: 1, unitPrice: 0 }])}
                className="h-8 px-3 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary btn-3d-sm text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} /> Baris
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-light text-[10px] font-semibold uppercase tracking-wide text-secondary">
                    <th className="text-left px-2 py-2 w-[24%]">Code</th>
                    <th className="text-left px-2 py-2">Description</th>
                    <th className="text-left px-2 py-2 w-[70px]">Qty</th>
                    <th className="text-left px-2 py-2 w-[130px]">Unit Price</th>
                    <th className="text-right px-2 py-2 w-[130px]">Amount</th>
                    <th className="px-2 py-2 w-[44px]" />
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-xs text-secondary py-4">Belum ada rincian.</td></tr>
                  )}
                  {invoice.items.map((it, i) => (
                    <tr key={it.id} className="border-t border-gray-med">
                      <td className="px-1 py-1">
                        <input defaultValue={it.code || ''} onBlur={(e) => ubahItem(i, { code: e.target.value })} className={sel} />
                      </td>
                      <td className="px-1 py-1">
                        <input defaultValue={it.description || ''} onBlur={(e) => ubahItem(i, { description: e.target.value })} className={sel} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min={0} defaultValue={it.qty} onBlur={(e) => ubahItem(i, { qty: Number(e.target.value) })} className={sel} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min={0} defaultValue={it.unitPrice} onBlur={(e) => ubahItem(i, { unitPrice: Number(e.target.value) })} className={sel} />
                      </td>
                      <td className="px-2 py-1 text-right text-gray-dark">{rupiah(it.amount)}</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          onClick={() => simpanBaris('items', invoice.items.filter((_, idx) => idx !== i))}
                          className="w-6 h-6 rounded-full btn-3d-danger btn-3d-sm text-white inline-flex items-center justify-center cursor-pointer"
                          style={{ background: '#ef4444' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-dark">Pembayaran</div>
              <button
                onClick={() => simpanBaris('payments', [...invoice.payments, { paidOn: '', amount: 0 }])}
                className="h-8 px-3 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary btn-3d-sm text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} /> Baris
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {invoice.payments.length === 0 && (
                <div className="text-xs text-secondary">Belum ada pembayaran.</div>
              )}
              {invoice.payments.map((p, i) => (
                <div key={p.id} className="flex gap-2 items-center">
                  <input
                    type="date"
                    defaultValue={p.paidOn ? String(p.paidOn).slice(0, 10) : ''}
                    onBlur={(e) => ubahBayar(i, { paidOn: e.target.value })}
                    className={`${input} w-[160px]`}
                  />
                  <input
                    type="number"
                    min={0}
                    defaultValue={p.amount}
                    onBlur={(e) => ubahBayar(i, { amount: Number(e.target.value) })}
                    className={`${input} w-[160px]`}
                  />
                  <button
                    onClick={() => simpanBaris('payments', invoice.payments.filter((_, idx) => idx !== i))}
                    className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer shrink-0"
                    style={{ background: '#ef4444' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-dark mt-3">
              Subtotal {rupiah(invoice.subtotal)} &middot; Dibayar {rupiah(invoice.paid)} &middot;{' '}
              <span className="font-semibold">Sisa {rupiah(invoice.outstanding)}</span>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark">
              Catatan (kosongkan untuk memakai catatan bawaan)
            </span>
            <textarea
              defaultValue={invoice.notes || ''}
              rows={4}
              onBlur={(e) => simpanField('notes', e.target.value)}
              className="px-3 py-2 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary resize-y"
            />
          </label>
        </div>
      )}

      <div className="border border-gray-med rounded-xl overflow-x-auto">
        <InvoicePrint invoice={invoice} />
      </div>
    </div>
  );
}
