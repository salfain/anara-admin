import { useEffect, useState } from 'react';
import { Upload, Eye, Download, Trash2 } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Packages() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const push = useToastStore((s) => s.push);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchFiles() {
    setLoading(true);
    try {
      const { data } = await api.get('/package-files');
      setFiles(data.data);
    } catch {
      push('Gagal memuat file paket', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  function openModal() {
    setName('');
    setFile(null);
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!file) return setError('File wajib diupload.');

    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('file', file);
      await api.post('/package-files', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      push('File ditambahkan!');
      setShowModal(false);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengupload file');
    } finally {
      setSaving(false);
    }
  }

  async function fetchBlobUrl(f) {
    const res = await api.get(`/package-files/${f.id}/download`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([res.data]));
  }

  async function handleView(f) {
    try {
      const url = await fetchBlobUrl(f);
      window.open(url, '_blank', 'noopener');
    } catch {
      push('Gagal membuka file', 'error');
    }
  }

  async function handleDownload(f) {
    try {
      const url = await fetchBlobUrl(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      push('Gagal mengunduh file', 'error');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/package-files/${deleteTarget.id}`);
      push('File dihapus.');
      setDeleteTarget(null);
      fetchFiles();
    } catch (err) {
      push(err.response?.data?.error || 'Gagal menghapus file', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[28px] font-bold text-gray-dark">Paket & Itinerary</div>
          <div className="text-sm text-secondary mt-1">Kelola file itinerary dan price list per paket</div>
        </div>
        <button
          onClick={openModal}
          className="h-10 px-5 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
          style={{ background: '#2563eb' }}
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loading && <div className="text-center text-sm text-secondary py-10">Memuat...</div>}
        {!loading && files.length === 0 && (
          <div className="text-center text-sm text-secondary py-16 bg-white rounded-xl border border-gray-med">
            Belum ada file itinerary yang diupload.
          </div>
        )}
        {files.map((f) => (
          <div key={f.id} className="bg-white border border-gray-med rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-primary text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#2563eb' }}>
                FILE
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-dark truncate">{f.name}</div>
                <div className="text-xs text-secondary mt-0.5">
                  {f.file_name} · diupload {new Date(f.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleView(f)}
                className="h-8 px-3 bg-white text-gray-dark border border-gray-med rounded-md text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={13} />
                Lihat
              </button>
              <button
                onClick={() => handleDownload(f)}
                className="h-8 px-3 bg-white border border-primary rounded-md text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                style={{ color: '#2563eb', borderColor: '#2563eb' }}
              >
                <Download size={13} />
                Download
              </button>
              {isAdmin && (
                <button
                  onClick={() => setDeleteTarget(f)}
                  className="h-8 px-3 bg-white border border-gray-med rounded-md text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-[500px] bg-white rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="text-lg font-semibold text-gray-dark">Tambah File</div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nama (judul isi file) *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hongkong 5D Mega Sale - Itinerary & Price List"
                className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Upload File *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="p-2 border border-dashed border-gray-med rounded-lg text-[13px]"
              />
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="h-9 px-4 bg-white text-gray-dark border border-gray-med rounded-lg text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="h-9 px-4 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60" style={{ background: '#2563eb' }}>
                {saving ? 'Mengupload...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus file ini?"
        message="Itinerary & pricelist paket akan hilang."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
