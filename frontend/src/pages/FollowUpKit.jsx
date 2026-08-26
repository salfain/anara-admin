import { useMemo, useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import useToastStore from '../store/toastStore';
import { CADENCE, FOLLOWUP_TEMPLATES } from '../data/followUpTemplates';

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
      className={`${small ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]'} text-white rounded-md font-semibold flex items-center gap-1.5 cursor-pointer shrink-0`}
      style={{ background: copied ? '#1d4ed8' : '#2563eb' }}
    >
      {copied ? <Check size={small ? 12 : 14} /> : <Copy size={small ? 12 : 14} />}
      {copied ? 'Disalin' : 'Salin'}
    </button>
  );
}

function TemplateCard({ template }) {
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
          {template.tag && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: '#fef2f2', color: '#dc2626' }}
            >
              {template.tag}
            </span>
          )}
        </div>
        <div className="text-[13px] text-secondary mb-4">{template.useWhen}</div>

        {template.steps && (
          <div className="flex flex-col gap-3">
            {template.steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-3.5"
                  style={{ background: '#dbeafe', color: '#1e40af' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-2">
                    {highlight(step)}
                  </pre>
                  <CopyButton text={step} small />
                </div>
              </div>
            ))}
          </div>
        )}

        {template.variants && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {template.variants.map((v, vi) => (
                <button
                  key={v.label}
                  onClick={() => setVariantIndex(vi)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                  style={vi === variantIndex ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-gray-light)', color: 'var(--color-secondary)', border: '1px solid var(--color-gray-med)' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-3">
              {highlight(template.variants[variantIndex].text)}
            </pre>
            <CopyButton text={template.variants[variantIndex].text} />
          </>
        )}

        {template.text && !template.steps && !template.variants && (
          <>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 mb-3">
              {highlight(template.text)}
            </pre>
            <CopyButton text={template.text} />
          </>
        )}
      </div>
    </div>
  );
}

export default function FollowUpKit() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => FOLLOWUP_TEMPLATES.filter((t) => matches(t, search)),
    [search]
  );

  return (
    <div className="p-8 flex flex-col gap-6 max-w-[820px]">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Follow-Up Kit</div>
        <div className="text-sm text-secondary mt-1">
          Script dan pesan WhatsApp siap pakai untuk menangani calon peserta — dari sapaan pertama sampai closing.
          Ganti bagian bertanda <span style={{ color: '#2563eb', fontWeight: 600 }}>[dalam kurung]</span> sebelum dikirim.
        </div>
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

      <div className="bg-surface border border-gray-med rounded-xl p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-3">Alur waktu yang disarankan</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 overflow-x-auto">
          {CADENCE.map((c, i) => (
            <div key={i} className="flex items-center gap-6">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: '#2563eb' }}>{c.time}</div>
                <div className="text-[13px] text-secondary mt-0.5">{c.what}</div>
              </div>
              {i < CADENCE.length - 1 && <span className="text-gray-med hidden sm:inline">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-secondary py-16 bg-surface rounded-xl border border-gray-med">
            Tidak ada template yang cocok dengan &ldquo;{search}&rdquo;.
          </div>
        )}
        {filtered.map((t) => (
          <TemplateCard key={t.no} template={t} />
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
    </div>
  );
}
