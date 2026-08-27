import { useEffect, useState } from 'react';

export const LEAD_STATUSES = ['Baru', 'Proses', 'Nego', 'Sudah DP', 'Batal'];

const EMPTY = {
  entryDate: '',
  whatsapp: '',
  picSales: '',
  status: 'Baru',
  notes: '',
  followUp1: '',
  followUp2: '',
  followUp3: '',
  country: '',
};

function toInputDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

const CUSTOM_COUNTRY = '__custom__';

export default function LeadModal({ open, onClose, onSubmit, initial, saving, picOptions = [], countryOptions = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [customCountry, setCustomCountry] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const country = initial.country || '';
      setForm({
        entryDate: toInputDate(initial.entryDate),
        whatsapp: initial.whatsapp || '',
        picSales: initial.picSales || '',
        status: initial.status || 'Baru',
        notes: initial.notes || '',
        followUp1: toInputDate(initial.followUp1),
        followUp2: toInputDate(initial.followUp2),
        followUp3: toInputDate(initial.followUp3),
        country,
      });
      setCustomCountry(Boolean(country) && !countryOptions.includes(country));
    } else {
      setForm({ ...EMPTY, entryDate: new Date().toISOString().slice(0, 10) });
      setCustomCountry(false);
    }
    setError('');
  }, [open, initial, countryOptions]);

  if (!open) return null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.entryDate) return setError('Tanggal masuk wajib diisi.');
    if (!form.whatsapp.trim()) return setError('Nomor WhatsApp wajib diisi.');
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] bg-surface rounded-xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-lg font-semibold text-gray-dark">{initial ? 'Edit Lead' : 'Tambah Lead'}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Tanggal Masuk *</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => set('entryDate', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nomor WhatsApp *</label>
            <input
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="e.g. 628123456789"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">PIC Sales</label>
            <select
              value={form.picSales}
              onChange={(e) => set('picSales', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">Pilih CS</option>
              {(form.picSales && !picOptions.includes(form.picSales) ? [form.picSales, ...picOptions] : picOptions).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Negara</label>
            {customCountry ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="e.g. Jepang"
                  className="h-10 px-3 border border-gray-med rounded-lg text-sm flex-1 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => { setCustomCountry(false); set('country', ''); }}
                  className="h-10 px-3 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm text-xs font-semibold cursor-pointer shrink-0"
                >
                  Pilih dari daftar
                </button>
              </div>
            ) : (
              <select
                value={form.country}
                onChange={(e) => {
                  if (e.target.value === CUSTOM_COUNTRY) {
                    setCustomCountry(true);
                    set('country', '');
                  } else {
                    set('country', e.target.value);
                  }
                }}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Pilih negara</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={CUSTOM_COUNTRY}>+ Negara lain (ketik manual)</option>
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">FU 1</label>
            <input
              type="date"
              value={form.followUp1}
              onChange={(e) => set('followUp1', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">FU 2</label>
            <input
              type="date"
              value={form.followUp2}
              onChange={(e) => set('followUp2', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">FU 3</label>
            <input
              type="date"
              value={form.followUp3}
              onChange={(e) => set('followUp3', e.target.value)}
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Catatan minat, budget, dsb."
            className="px-3 py-2 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
            {saving ? 'Menyimpan...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
