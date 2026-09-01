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
const KOSONG = { due: 0, overdue: 0, mineDue: 0, mineOverdue: 0, mineTotal: 0, billingDue: 0 };

const useFollowUpStore = create((set) => ({
  ...KOSONG,

  refresh: async () => {
    // Dua permintaan terpisah supaya hak akses yang berbeda tidak saling
    // menjatuhkan: yang boleh lihat penagihan tapi tidak lihat lead tetap
    // dapat lencananya.
    try {
      const { data } = await api.get('/leads/summary');
      const fu = data.data.followUp || {};
      set({
        due: fu.due || 0,
        overdue: fu.overdue || 0,
        mineDue: fu.mineDue || 0,
        mineOverdue: fu.mineOverdue || 0,
        mineTotal: fu.mineTotal || 0,
      });
    } catch {
      set({ due: 0, overdue: 0, mineDue: 0, mineOverdue: 0, mineTotal: 0 });
    }

    try {
      const { data } = await api.get('/bookings/summary');
      set({ billingDue: data.data.needsAttention || 0 });
    } catch {
      set({ billingDue: 0 });
    }
  },
}));

export default useFollowUpStore;
