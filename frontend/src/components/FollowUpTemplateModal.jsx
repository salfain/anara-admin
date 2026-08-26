import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const KINDS = [
  { value: 'text', label: 'Pesan Tunggal' },
  { value: 'steps', label: 'Multi-Langkah' },
  { value: 'variants', label: 'Multi-Varian' },
];

const EMPTY = {
  no: '', code: '', when: '', title: '', useWhen: '', tag: '',
  kind: 'text', text: '', steps: [''], variants: [{ label: '', text: '' }],
};

export default function FollowUpTemplateModal({ open, onClose, onSubmit, initial, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        no: initial?.no || '',
        code: initial?.code || '',
        when: initial?.when || '',
        title: initial?.title || '',
        useWhen: initial?.useWhen || '',
        tag: initial?.tag || '',
        kind: initial?.kind || 'text',
        text: initial?.text || '',
        steps: initial?.steps?.length ? initial.steps : [''],
        variants: initial?.variants?.length ? initial.variants : [{ label: '', text: '' }],
      });
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;
  const isEdit = Boolean(initial);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateStep(i, value) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? value : s)) }));
  }
  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, ''] }));
  }
  function removeStep(i) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  }

  function updateVariant(i, field, value) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)) }));
  }
  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { label: '', text: '' }] }));
  }
  function removeVariant(i) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.no.trim() || !form.code.trim() || !form.title.trim()) {
      setError('No, Kode, dan Judul wajib diisi.');
      return;
    }
    if (form.kind === 'text' && !form.text.trim()) {
      setError('Isi pesan wajib diisi.');
      return;
    }
    if (form.kind === 'steps' && form.steps.filter((s) => s.trim()).length === 0) {
      setError('Minimal 1 langkah harus diisi.');
      return;
    }
    if (form.kind === 'variants' && form.variants.filter((v) => v.label.trim() && v.text.trim()).length === 0) {
      setError('Minimal 1 varian (nama + isi) harus diisi.');
      return;
    }
    setError('');
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[640px] max-h-[88vh] overflow-auto bg-surface rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-med">
          <div className="text-xl font-semibold text-gray-dark">{isEdit ? 'Edit Template' : 'Tambah Template Follow-Up'}</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-secondary hover:bg-gray-light cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="No *">
              <input value={form.no} onChange={(e) => update('no', e.target.value)} placeholder="09" className={inputCls} />
            </Field>
            <Field label="Kode *">
              <input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="PROMO" className={inputCls} />
            </Field>
          </div>

          <Field label="Judul *">
            <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Judul template" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Timing">
              <input value={form.when} onChange={(e) => update('when', e.target.value)} placeholder="mis. H+7" className={inputCls} />
            </Field>
            <Field label="Tag (opsional)">
              <input value={form.tag} onChange={(e) => update('tag', e.target.value)} placeholder="mis. urgent" className={inputCls} />
            </Field>
          </div>

          <Field label="Kapan dipakai">
            <textarea rows={2} value={form.useWhen} onChange={(e) => update('useWhen', e.target.value)} className={inputCls} />
          </Field>

          <Field label="Tipe Template">
            <div className="flex gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => update('kind', k.value)}
                  className="h-9 px-3.5 rounded-lg text-[13px] font-semibold cursor-pointer"
                  style={form.kind === k.value ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-gray-light)', color: 'var(--color-secondary)', border: '1px solid var(--color-gray-med)' }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>

          {form.kind === 'text' && (
            <Field label="Isi Pesan *">
              <textarea rows={6} value={form.text} onChange={(e) => update('text', e.target.value)} className={inputCls} />
            </Field>
          )}

          {form.kind === 'steps' && (
            <Field label="Langkah-langkah *">
              <div className="flex flex-col gap-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="border border-gray-med rounded-lg p-3 bg-gray-light flex flex-col gap-2">
                    <textarea
                      rows={3}
                      value={step}
                      onChange={(e) => updateStep(i, e.target.value)}
                      placeholder={`Langkah ${i + 1}`}
                      className={inputCls}
                    />
                    {form.steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)} className="text-xs font-medium self-start cursor-pointer flex items-center gap-1" style={{ color: '#ef4444' }}>
                        <Trash2 size={12} /> Hapus langkah
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addStep} className="h-9 px-3 border border-dashed border-gray-med rounded-lg text-[13px] font-semibold text-secondary flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus size={14} /> Tambah langkah
                </button>
              </div>
            </Field>
          )}

          {form.kind === 'variants' && (
            <Field label="Varian *">
              <div className="flex flex-col gap-2">
                {form.variants.map((v, i) => (
                  <div key={i} className="border border-gray-med rounded-lg p-3 bg-gray-light flex flex-col gap-2">
                    <input
                      value={v.label}
                      onChange={(e) => updateVariant(i, 'label', e.target.value)}
                      placeholder="Nama varian"
                      className={inputCls}
                    />
                    <textarea
                      rows={3}
                      value={v.text}
                      onChange={(e) => updateVariant(i, 'text', e.target.value)}
                      placeholder="Isi pesan"
                      className={inputCls}
                    />
                    {form.variants.length > 1 && (
                      <button type="button" onClick={() => removeVariant(i)} className="text-xs font-medium self-start cursor-pointer flex items-center gap-1" style={{ color: '#ef4444' }}>
                        <Trash2 size={12} /> Hapus varian
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addVariant} className="h-9 px-3 border border-dashed border-gray-med rounded-lg text-[13px] font-semibold text-secondary flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus size={14} /> Tambah varian
                </button>
              </div>
            </Field>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-5 bg-surface text-gray-dark border border-gray-med rounded-lg text-sm font-semibold cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-10 px-5 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
              {saving ? 'Menyimpan...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">{label}</label>
      {children}
    </div>
  );
}
