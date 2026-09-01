import { useEffect, useState } from 'react';
import { X, Pencil, Trash2, Send } from 'lucide-react';
import api from '../api/client';

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-med last:border-b-0">
      <div className="text-xs text-secondary shrink-0">{label}</div>
      <div className="text-sm text-gray-dark text-right break-words min-w-0">{value || '-'}</div>
    </div>
  );
}

export default function LeadDetailSheet({ open, lead, index, statusStyle, fmtDate, canManage, onClose, onEdit, onDelete, onSend }) {
  const [history, setHistory] = useState([]);

  // Di ponsel inilah lead dibuka sebelum ditelepon atau di-chat, jadi riwayatnya
  // harus ada di sini juga — bukan hanya di dialog kirim.
  useEffect(() => {
    if (!open || !lead?.id) return;
    setHistory([]);
    api.get(`/leads/${lead.id}/notes`)
      .then(({ data }) => setHistory(data.data))
      .catch(() => {});
  }, [open, lead?.id]);

  if (!open || !lead) return null;

  const followUps = [lead.followUp1, lead.followUp2, lead.followUp3];

  return (
    <div className="lg:hidden fixed inset-0 z-40 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-med">
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-dark break-all">{lead.name || lead.whatsapp}</div>
            {lead.name && <div className="text-xs text-secondary mt-0.5 break-all">{lead.whatsapp}</div>}
            <div className="text-xs text-secondary mt-1">
              {index != null && `#${index + 1} · `}Masuk {fmtDate(lead.entryDate)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
              style={statusStyle[lead.status] || { background: '#f3f4f6', color: '#374151' }}
            >
              {lead.status}
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-secondary cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-2">
          <Row label="PIC Sales" value={lead.picSales} />
          <Row label="Paket" value={lead.packageName} />
          <Row label="Destinasi" value={lead.country} />
          <Row label="Follow-up 1" value={fmtDate(lead.followUp1)} />
          <Row label="Follow-up 2" value={fmtDate(lead.followUp2)} />
          <Row label="Follow-up 3" value={fmtDate(lead.followUp3)} />
          <Row
            label="Progres"
            value={`${followUps.filter(Boolean).length} dari 3 follow-up`}
          />
        </div>

        {lead.notes && (
          <div className="px-5 pb-2">
            <div className="text-xs text-secondary mb-1">Notes</div>
            <div className="text-sm text-gray-dark bg-gray-light rounded-lg p-3 whitespace-pre-wrap break-words">
              {lead.notes}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="px-5 pt-4">
            <div className="text-xs font-semibold text-gray-dark mb-2">Riwayat</div>
            <div className="flex flex-col gap-1.5">
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="text-[11px] flex gap-2">
                  <span className="text-secondary shrink-0 w-[62px]">
                    {new Date(h.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={h.kind === 'status' ? 'text-secondary italic' : 'text-gray-dark'}>
                    {h.body}
                    {h.author && <span className="text-secondary"> · {h.author}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pt-4 flex">
          <button
            onClick={() => onSend(lead)}
            className="flex-1 h-10 rounded-full btn-3d text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: '#25D366' }}
          >
            <Send size={14} /> Kirim Follow-Up
          </button>
        </div>
        {canManage && (
          <div className="px-5 py-4 flex gap-2">
            <button
              onClick={() => onEdit(lead)}
              className="flex-1 h-10 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="flex-1 h-10 rounded-full btn-3d-danger text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: '#ef4444' }}
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
