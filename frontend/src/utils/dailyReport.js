// Format laporan harian yang dikirim CS ke grup tiap sore.
//
// Formatnya sengaja tidak diubah. Yang diambil alih hanya penghitungannya,
// bagian yang lama dan mudah keliru. Pengirimannya tetap manusia, ke Telegram,
// karena di situ percakapan timnya berlangsung.

const CATATAN = [
  '*WAJIB LAPOR JAM 17.00-17.30',
  '*CLOSING DIATAS 17.30 MASUK KE LAPORAN HARI BERIKUTNYA',
];

function tanggalLaporan(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

export function susunLaporan({ data, janjiTf }) {
  return [
    `Daily Report Cs [${data.picName || '-'}]`,
    tanggalLaporan(data.date),
    '',
    `✍️New Leads : ${data.newLeads}`,
    ...data.byPackage.map((p) => `• ${p.label} = ${p.count}`),
    // Dibiarkan kosong kalau belum diisi. Menulis 0 akan terbaca sebagai
    // "tidak ada yang janji transfer", padahal artinya belum dihitung.
    `✍️Janji TF = ${janjiTf}`,
    `✍️Total Closing = ${data.closing}`,
    `✍️Total Nomor yang di Follow up = ${data.followedUp}`,
    '—',
    'Noted :',
    ...CATATAN,
  ].join('\n');
}

export default susunLaporan;
