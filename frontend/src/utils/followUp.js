// Kapan sebuah lead dianggap terbengkalai.
//
// Kolom FU 1-3 mencatat follow-up yang SUDAH dilakukan (importer Excel memetakan
// "FU terakhir" ke FU 1), jadi yang menentukan bukan jadwal ke depan melainkan
// berapa lama lead itu tidak disentuh sejak kontak terakhir.
//
// Angka ambang di bawah ini digandakan di backend, pada summary() di
// src/controllers/leadsController.js — kalau diubah, ubah keduanya.
export const DUE_AFTER_DAYS = 3;
export const OVERDUE_AFTER_DAYS = 7;

const CLOSED_STATUSES = new Set(['Sudah DP', 'Batal']);

function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Tanggal kontak terakhir: FU terisi paling akhir, atau tanggal lead masuk. */
export function lastContact(lead) {
  const dates = [lead.followUp1, lead.followUp2, lead.followUp3]
    .map(toDate)
    .filter(Boolean);
  if (dates.length > 0) return new Date(Math.max(...dates));
  return toDate(lead.entryDate);
}

export function daysSinceContact(lead, today = new Date()) {
  const last = lastContact(lead);
  if (!last) return null;
  const ms = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - last.getTime();
  return Math.floor(ms / 86400000);
}

/** 'closed' | 'overdue' | 'due' | 'ok' */
export function followUpState(lead, today = new Date()) {
  if (CLOSED_STATUSES.has(lead.status)) return 'closed';
  const days = daysSinceContact(lead, today);
  if (days === null) return 'ok';
  if (days >= OVERDUE_AFTER_DAYS) return 'overdue';
  if (days >= DUE_AFTER_DAYS) return 'due';
  return 'ok';
}

export const FOLLOW_UP_LABEL = {
  overdue: 'Terlambat',
  due: 'Perlu FU',
  ok: 'Aman',
  closed: 'Selesai',
};

const FU_SLOTS = ['followUp1', 'followUp2', 'followUp3'];

const toDay = (v) => (v ? String(v).slice(0, 10) : '');

/**
 * Catat follow-up hari ini di slot FU kosong berikutnya. Kalau ketiganya sudah
 * terpakai, geser ke kiri supaya yang tersimpan selalu tiga kontak terakhir —
 * tanggal tertua yang terbuang, karena itu yang paling tidak berguna.
 */
export function withFollowUpToday(lead, today = new Date().toISOString().slice(0, 10)) {
  const empty = FU_SLOTS.find((f) => !lead[f]);
  if (empty) return { ...lead, [empty]: today };
  return {
    ...lead,
    followUp1: toDay(lead.followUp2),
    followUp2: toDay(lead.followUp3),
    followUp3: today,
  };
}

/** Apakah pencatatan berikutnya akan membuang tanggal tertua. */
export function willShiftFollowUps(lead) {
  return FU_SLOTS.every((f) => Boolean(lead[f]));
}
