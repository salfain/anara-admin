import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Copy, Check, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../api/client';
import useToastStore from '../store/toastStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import FollowUpTemplateModal from '../components/FollowUpTemplateModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { CADENCE } from '../data/followUpTemplates';
import usePermissions from '../hooks/usePermissions';

function highlight(text) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <span key={i} style={{ color: '#2563eb', fontWeight: 600 }}>{part}</span>
    ) : (
      part
    )
  );
}

function matches(t, q) {
  if (!q) return true;
  const query = q.toLowerCase();
  const parts = [t.title, t.useWhen, t.code, t.when, t.tag, t.text];
  if (t.steps) parts.push(...t.steps);
  if (t.variants) t.variants.forEach((v) => parts.push(v.label, v.text));
  return parts.filter(Boolean).join(' ').toLowerCase().includes(query);
}

function CopyButton({ text, small }) {
  const push = useToastStore((s) => s.push);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      push('Disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      push('Gagal menyalin', 'error');
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`${small ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]'} text-white rounded-full btn-3d font-semibold flex items-center gap-1.5 cursor-pointer shrink-0`}
      style={{ background: copied ? '#1d4ed8' : '#2563eb' }}
    >
      {copied ? <Check size={small ? 12 : 14} /> : <Copy size={small ? 12 : 14} />}
      {copied ? 'Disalin' : 'Salin'}
    </button>
  );
}

function TemplateCard({ template, canManage, onEdit, onDelete }) {
  const [variantIndex, setVariantIndex] = useState(0);

  return (
    <div className="bg-surface border border-gray-med rounded-xl overflow-hidden flex flex-col sm:flex-row">
      <div
        className="sm:w-[140px] shrink-0 p-5 flex sm:flex-col justify-between sm:justify-start gap-2 border-b sm:border-b-0 sm:border-r border-dashed border-gray-med"
        style={{ background: 'var(--color-gray-light)' }}
      >
        <div>
          <div className="text-2xl font-bold" style={{ color: '#1d4ed8' }}>{template.no}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-secondary mt-2">{template.code}</div>
        </div>
        <div className="text-[11px] text-secondary sm:mt-auto">{template.when}</div>
      </div>

      <div className="flex-1 p-5 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
          <div className="text-lg font-semibold text-gray-dark">{template.title}</div>
          <div className="flex items-center gap-2">
            {template.tag && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: '#fef2f2', color: '#dc2626' }}
              >
                {template.tag}
              </span>
            )}
            {canManage && (
              <div className="flex gap-1.5">
                <button onClick={() => onEdit(template)} className="w-7 h-7 bg-surface text-secondary border border-gray-med rounded-full btn-3d-secondary btn-3d-sm flex items-center justify-center cursor-pointer">
                  <Pencil size={12} />
                </button>
                <button onClick={() => onDelete(template)} className="w-7 h-7 rounded-full btn-3d-danger btn-3d-sm text-white flex items-center justify-center cursor-pointer" style={{ background: '#ef4444' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-[13px] text-secondary mb-4">{template.useWhen}</div>

        {template.kind === 'steps' && (
          <div className="flex flex-col gap-3">
            {(template.steps || []).map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-3.5"
                  style={{ background: '#dbeafe', color: '#1e40af' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <pre className="text-sm text-gray-dark whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-2">
                    {highlight(step)}
                  </pre>
                  <CopyButton text={step} small />
                </div>
              </div>
            ))}
          </div>
        )}

        {template.kind === 'variants' && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(template.variants || []).map((v, vi) => (
                <button
                  key={v.label + vi}
                  onClick={() => setVariantIndex(vi)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer ${vi === variantIndex ? 'btn-3d-sm btn-3d' : ''}`}
                  style={vi === variantIndex ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-gray-light)', color: 'var(--color-secondary)', border: '1px solid var(--color-gray-med)' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {template.variants?.[variantIndex] && (
              <>
                <pre className="text-sm text-gray-dark whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-3">
                  {highlight(template.variants[variantIndex].text)}
                </pre>
                <CopyButton text={template.variants[variantIndex].text} />
              </>
            )}
          </>
        )}

        {template.kind === 'text' && (
          <>
            <pre className="text-sm text-gray-dark whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-3">
              {highlight(template.text || '')}
            </pre>
            <CopyButton text={template.text || ''} />
          </>
        )}
      </div>
    </div>
  );
}

export default function FollowUpKit() {
  const { can } = usePermissions();
  const canManage = can('follow_up.manage');
  const push = useToastStore((s) => s.push);

  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/followup-templates');
      setTemplates(data.data);
    } catch {
      push('Gagal memuat template', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { fetchTemplates(true); }, [fetchTemplates]);
  useAutoRefresh(() => fetchTemplates(false), 15000);

  const filtered = useMemo(
    () => templates.filter((t) => matches(t, search)),
    [templates, search]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t) {
    setEditing(t);
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    setSaving(true);
    try {
      const payload = {
        no: form.no.trim(),
        code: form.code.trim(),
        when: form.when.trim() || null,
        title: form.title.trim(),
        useWhen: form.useWhen.trim() || null,
        tag: form.tag.trim() || null,
        kind: form.kind,
        text: form.kind === 'text' ? form.text : undefined,
        steps: form.kind === 'steps' ? form.steps : undefined,
        variants: form.kind === 'variants' ? form.variants : undefined,
      };
      if (editing) {
        await api.put(`/followup-templates/${editing.id}`, payload);
        push('Template berhasil diperbarui');
      } else {
        await api.post('/followup-templates', payload);
        push('Template berhasil ditambahkan');
      }
      setModalOpen(false);
      fetchTemplates(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menyimpan template', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/followup-templates/${deleteTarget.id}`);
      push('Template dihapus');
      setDeleteTarget(null);
      fetchTemplates(false);
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus template', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[28px] font-bold text-gray-dark">Follow-Up Kit</div>
          <div className="text-sm text-secondary mt-1 max-w-[560px]">
            Script dan pesan WhatsApp siap pakai untuk menangani calon peserta — dari sapaan pertama sampai closing.
            Ganti bagian bertanda <span style={{ color: '#2563eb', fontWeight: 600 }}>[dalam kurung]</span> sebelum dikirim.
          </div>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="h-10 px-5 text-white rounded-full btn-3d text-sm font-semibold flex items-center gap-2 cursor-pointer shrink-0"
            style={{ background: '#2563eb' }}
          >
            <Plus size={16} />
            Tambah Template
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari template... (judul, isi pesan, kode)"
          className="w-full h-10 pl-9 pr-3 border border-gray-med rounded-lg text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="bg-surface border border-gray-med rounded-xl p-5 sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-5">Alur waktu yang disarankan</div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="inline-flex min-w-full">
            {CADENCE.map((c, i) => (
              <div key={i} className="flex flex-col items-center flex-none w-[124px] group">
                <div className="flex items-center w-full">
                  <div
                    className="flex-1 h-[2px] rounded-full"
                    style={{ background: i === 0 ? 'transparent' : '#2563eb', opacity: i === 0 ? 0 : 0.35 }}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-transform duration-150 group-hover:scale-110"
                    style={{ background: '#2563eb', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="flex-1 h-[2px] rounded-full"
                    style={{ background: i === CADENCE.length - 1 ? 'transparent' : '#2563eb', opacity: i === CADENCE.length - 1 ? 0 : 0.35 }}
                  />
                </div>
                <div className="text-center mt-3 px-1.5">
                  <div className="text-[13px] font-semibold leading-snug" style={{ color: '#2563eb' }}>{c.time}</div>
                  <div className="text-xs text-secondary leading-snug mt-1">{c.what}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {loading && <div className="text-center text-sm text-secondary py-10">Memuat...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
            {search ? `Tidak ada template yang cocok dengan "${search}".` : 'Belum ada template.'}
          </div>
        )}
        {!loading && filtered.map((t) => (
          <TemplateCard key={t.id} template={t} canManage={canManage} onEdit={openEdit} onDelete={setDeleteTarget} />
        ))}
      </div>

      <div className="bg-surface border border-gray-med rounded-xl p-6">
        <div className="text-lg font-semibold text-gray-dark mb-3">Catatan pemakaian</div>
        <ul className="text-sm text-secondary flex flex-col gap-2 list-disc pl-5">
          <li><strong className="text-gray-dark">Personalisasi dulu.</strong> Isi nama dan paket sesuai minat asli calon peserta — pesan hasil copy-paste massal biasanya diabaikan.</li>
          <li><strong className="text-gray-dark">Satu template per hari.</strong> Jangan kirim dua template sekaligus di hari yang sama ke lead yang sama.</li>
          <li><strong className="text-gray-dark">Tutup dengan pertanyaan terbuka.</strong> Supaya lead gampang membalas.</li>
          <li><strong className="text-gray-dark">Hormati kalau sudah menolak.</strong> Hentikan follow-up rutin kalau lead sudah bilang tidak lanjut.</li>
        </ul>
      </div>

      <FollowUpTemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Template?"
        message={`Template "${deleteTarget?.title}" akan dihapus permanen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
