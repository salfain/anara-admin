import { useEffect, useMemo, useState } from 'react';
import { Search, Send, Copy, Check } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { waLink, toWaNumber, fillPlaceholders, templateSnippets, supportsTextPrefill } from '../utils/whatsapp';
import { copyText } from '../utils/clipboard';

/**
 * Pilih template Follow-Up Kit, sesuaikan pesannya, buka WhatsApp — lalu catat
 * follow-up itu tanpa harus kembali mengisi tanggal satu per satu.
 */
export default function SendFollowUpModal({ open, lead, canManage, onClose, onMarkFollowedUp, marking }) {
  const push = useToastStore((s) => s.push);
  const currentUser = useAuthStore((s) => s.user);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setActiveId(null);
    setMessage('');
    setOpened(false);
    setLoading(true);
    api.get('/followup-templates')
      .then(({ data }) => setTemplates(data.data))
      .catch(() => push('Gagal memuat template follow-up', 'error'))
      .finally(() => setLoading(false));
  }, [open, push]);

  // Satu daftar datar: tiap langkah dan tiap varian adalah pesan tersendiri.
  const snippets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = [];
    for (const t of templates) {
      for (const s of templateSnippets(t)) {
        const haystack = [t.title, t.code, t.when, t.tag, s.label, s.text].filter(Boolean).join(' ').toLowerCase();
        if (!q || haystack.includes(q)) out.push({ ...s, template: t });
      }
    }
    return out;
  }, [templates, search]);

  if (!open || !lead) return null;

  const number = toWaNumber(lead.whatsapp);
  const prefilled = supportsTextPrefill();
  const link = waLink(lead.whatsapp, message);

  function pick(snippet) {
    setActiveId(snippet.id);
    setMessage(fillPlaceholders(snippet.text, {
      csName: currentUser?.name,
      leadName: lead.name,
      destination: lead.country,
      packageName: lead.packageName,
      packageDates: lead.packageDates,
      packagePrice: lead.packagePrice,
    }));
  }

  async function copy() {
    if (!(await copyText(message))) {
      return push('Gagal menyalin', 'error');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Salin dulu, baru buka chat. Keduanya dipanggil di tick yang sama supaya
  // masih terhitung sebagai satu gestur pengguna — kalau ditunggu (await),
  // penyalinan cadangan ditolak dan pemblokir popup bisa menahan jendelanya.
  function openWhatsApp() {
    if (!link) return push('Nomor WhatsApp tidak valid', 'error');
    const copying = copyText(message);
    window.open(link, '_blank', 'noopener');
    setOpened(true);
    // Pesannya tetap disalin walau sudah ikut di URL — kalau ternyata tidak
    // terisi, tinggal tempel tanpa harus kembali ke sini.
    copying.then((ok) => {
      if (prefilled) return;
      push(
        ok
          ? 'Pesan disalin — tempel di WhatsApp dengan Ctrl+V'
          : 'Chat dibuka, tapi gagal menyalin. Salin manual dari kotak pesan.',
        ok ? 'success' : 'error'
      );
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[720px] bg-surface rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 border-b border-gray-med">
          <div className="text-lg font-semibold text-gray-dark">Kirim Follow-Up</div>
          <div className="text-[13px] text-secondary mt-0.5">
            ke <span className="font-medium text-gray-dark">{lead.name || lead.whatsapp}</span>
            {lead.name ? ` · ${lead.whatsapp}` : ''}
            {lead.packageName ? ` · ${lead.packageName}` : ''}
            {lead.country ? ` · ${lead.country}` : ''}
            {lead.picSales ? ` · PIC ${lead.picSales}` : ''}
          </div>
          {!number && (
            <div
              className="text-xs mt-2 rounded-lg px-3 py-2"
              style={{ background: 'var(--color-warn-soft)', color: 'var(--color-warn-soft-text)' }}
            >
              Nomor ini tidak mengandung angka yang valid, jadi WhatsApp tidak bisa dibuka. Perbaiki dulu nomornya di tabel.
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col sm:flex-row min-h-0">
          <div className="sm:w-[260px] shrink-0 border-b sm:border-b-0 sm:border-r border-gray-med flex flex-col min-h-0">
            <div className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari template..."
                  className="w-full h-8 pl-8 pr-2 border border-gray-med rounded-lg text-xs bg-surface text-gray-dark focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[240px] sm:max-h-none">
              {loading && <div className="px-3 py-4 text-xs text-secondary">Memuat template...</div>}
              {!loading && snippets.length === 0 && (
                <div className="px-3 py-4 text-xs text-secondary">Tidak ada template yang cocok.</div>
              )}
              {snippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className="w-full text-left px-3 py-2.5 border-b border-gray-med last:border-b-0 cursor-pointer"
                  style={
                    activeId === s.id
                      ? { background: 'var(--color-info-soft)', color: 'var(--color-info-soft-text)' }
                      : undefined
                  }
                >
                  <div className={`text-xs font-semibold truncate ${activeId === s.id ? '' : 'text-gray-dark'}`}>
                    {s.template.title}
                  </div>
                  <div className={`text-[11px] truncate ${activeId === s.id ? 'opacity-80' : 'text-secondary'}`}>
                    {s.label} · {s.template.when}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder="Pilih template di kiri, atau tulis pesan sendiri di sini."
              className="w-full flex-1 min-h-[180px] px-3 py-2 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary resize-none"
            />
            <div className="text-[11px] text-secondary">
              Placeholder yang datanya kita punya sudah terisi. Sisanya masih dalam kurung siku — isi dulu sebelum kirim.
            </div>
            {!prefilled && (
              <div className="text-[11px] rounded-lg px-3 py-2" style={{ background: 'var(--color-info-soft)', color: 'var(--color-info-soft-text)' }}>
                Tombol di bawah menyalin pesan ini lalu membuka chat-nya — tinggal tempel (Ctrl+V) dan kirim.
                Di WhatsApp Desktop emoji rusak kalau pesannya dititipkan lewat alamat, jadi lewat clipboard.
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-med flex flex-wrap gap-2 justify-between items-center">
          <div>
            {canManage && (
              <button
                onClick={onMarkFollowedUp}
                disabled={marking}
                title="Isi kolom FU berikutnya dengan tanggal hari ini"
                className="h-9 px-4 rounded-full btn-3d-secondary border text-sm font-semibold cursor-pointer disabled:opacity-60"
                style={
                  opened
                    ? {
                        background: 'var(--color-success-soft)',
                        color: 'var(--color-success-soft-text)',
                        borderColor: 'transparent',
                      }
                    : {
                        background: 'var(--color-surface)',
                        color: 'var(--color-secondary)',
                        borderColor: 'var(--color-gray-med)',
                      }
                }
              >
                {marking ? 'Menyimpan...' : 'Tandai sudah di-follow-up hari ini'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={copy}
              disabled={!message}
              className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Disalin' : 'Salin'}
            </button>
            <button
              onClick={openWhatsApp}
              disabled={!number}
              className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              style={{ background: '#25D366' }}
            >
              <Send size={14} />
              {prefilled ? 'Buka WhatsApp' : 'Salin & Buka WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
