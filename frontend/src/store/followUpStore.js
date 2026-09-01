import { create } from 'zustand';
import api from '../api/client';

/**
 * Jumlah lead yang menunggu di-follow-up, dipakai sebagai lencana di navigasi.
 *
 * Pengingatnya selama ini hanya terlihat kalau seseorang kebetulan membuka
 * halaman Laporan Follow Up. Angkanya diambil dari /leads/summary — yang sudah
 * menghitungnya untuk Dashboard — jadi tidak perlu memuat seluruh lead hanya
 * untuk menampilkan satu angka.
 */
const useFollowUpStore = create((set) => ({
  due: 0,
  overdue: 0,

  refresh: async () => {
    try {
      const { data } = await api.get('/leads/summary');
      set({ due: data.data.followUp?.due || 0, overdue: data.data.followUp?.overdue || 0 });
    } catch {
      // Tidak punya hak akses leads, atau server sedang bermasalah. Lencana
      // yang hilang jauh lebih baik daripada error yang muncul di tiap halaman.
      set({ due: 0, overdue: 0 });
    }
  },
}));

export default useFollowUpStore;
