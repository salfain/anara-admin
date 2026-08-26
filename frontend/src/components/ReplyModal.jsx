import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = ['Harga', 'Jadwal', 'Visa', 'Pembayaran', 'Umum'];

export default function ReplyModal({ open, onClose, onSubmit, packages, initial, saving }) {
  const [form, setForm] = useState({ question: '', answer: '', package_id: '', category: '', tags: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        question: initial?.question || '',
        answer: initial?.answer || '',
        package_id: initial?.package_id || '',
        category: initial?.category || '',
        tags: initial?.tags || '',
      });
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const isEdit = Boolean(initial);

  function validate() {
    const next = {};
    if (form.question.trim().length < 10) next.question = 'Minimal 10 karakter';
    if (form.answer.trim().length < 50) next.answer = 'Minimal 50 karakter';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      package_id: form.package_id || null,
      category: form.category || null,
      tags: form.tags || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[600px] max-h-[85vh] overflow-auto bg-white rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-med">
          <div className="text-xl font-semibold text-gray-dark">{isEdit ? 'Edit Quick Reply' : 'Tambah Quick Reply'}</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-secondary hover:bg-gray-light cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">
              Question <span className="text-danger" style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Contoh: Berapa harga paket Bali?"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {errors.question && <div className="text-xs text-red-600">{errors.question}</div>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">
                Answer <span className="text-danger" style={{ color: '#ef4444' }}>*</span>
              </label>
              <span className="text-xs text-secondary">{form.answer.length}/5000</span>
            </div>
            <textarea
              rows={5}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value.slice(0, 5000) })}
              placeholder="Tulis jawaban lengkap di sini..."
              className="p-3 border border-gray-med rounded-lg text-sm resize-y focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {errors.answer && <div className="text-xs text-red-600">{errors.answer}</div>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Package</label>
              <select
                value={form.package_id}
                onChange={(e) => setForm({ ...form, package_id: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Pilih paket...</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-10 px-3 border border-gray-med rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Pilih kategori...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="reschedule, jadwal, biaya (pisahkan dengan koma)"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 bg-white text-gray-dark border border-gray-med rounded-lg text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-primary text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
              style={{ background: '#2563eb' }}
            >
              {saving ? 'Menyimpan...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
