export const CADENCE = [
  { time: 'Kontak pertama', what: 'Sapa & kumpulkan data' },
  { time: 'Setelah tahu minat', what: 'Jelaskan paket' },
  { time: 'Setelah Briefing', what: 'Rincian biaya' },
  { time: 'H+1', what: 'Follow-up awal' },
  { time: 'H+3–5', what: 'Follow-up lanjutan' },
  { time: 'Kapan saja', what: 'Kuota terbatas' },
  { time: 'Saat siap', what: 'Ajak DP' },
  { time: 'Bila perlu', what: 'Atasi keberatan harga' },
  { time: 'H+14 ke atas', what: 'Win-back' },
];

export const FOLLOWUP_TEMPLATES = [
  {
    no: '00', code: 'ARRIVAL', when: 'Kontak pertama', title: 'Sapa & Kumpulkan Data Leads Baru',
    useWhen: 'Chat pertama masuk (dari IG/WA/rekomendasi). Kirim satu per satu, menyesuaikan jawaban lead — bukan sekaligus.',
    tag: 'leads baru',
    steps: [
      'Selamat pagi/siang/malam Kak 🙏🏻☺️\nSaya [Nama CS], admin Anara Explore.\n\nSebelumnya dengan Kakak siapa, dan domisili dimana ya, Kak? 🙏🏻☺️',
      'Baik Kak [Nama], salam kenal ya 😊\nUntuk rencana liburannya, ada destinasi yang lagi diminati, Kak? Kami ada beberapa paket 2026/2027 seperti Jepang, Korea, Eropa Barat, Hongkong, Vietnam, dan lainnya.',
      'Kalau boleh tahu, rencana berangkat berapa orang ya Kak (termasuk Kakak)? Dan ada target bulan atau tanggal keberangkatan, atau masih fleksibel?',
      'Untuk budget per orangnya kira-kira di kisaran berapa ya Kak? Biar saya bisa carikan paket yang paling sesuai 🙏',
      'Satu lagi Kak, boleh tahu kenal Anara Explore dari mana? (Instagram, website, rekomendasi teman, dll) 😊\n\nBaik Kak [Nama], terima kasih infonya. Saya siapkan dulu rekomendasi paket & itinerary yang sesuai ya, mohon ditunggu sebentar 🙏',
    ],
  },
  {
    no: '01', code: 'BRIEFING', when: 'Setelah tahu minat', title: 'Penjelasan Paket',
    useWhen: 'Lanjutan dari tahap Arrival, begitu tahu destinasi yang diminati lead. Sesuaikan moda transportasi, cakupan include, dan catatan bagasi — tidak semua paket sama, jangan asal copy-paste dari paket lain.',
    tag: null,
    text: 'Halo Kak [Nama], salam kenal aku [Nama CS] dari Anara Explore 👋🏻😉\nIzin bantu jelaskan paket [Nama Paket] ya 🙏🏻☺️\n\nPaket tour [Nama Paket] ini adalah paket tour ke [Negara/Kota Tujuan]. Perjalanannya [moda transportasi — misal: naik pesawat maskapai [Nama Maskapai] / naik bus privat].\n\nUntuk biaya yang aku jelaskan sudah termasuk semuanya (all-in) sesuai itinerary. Di luar itu adalah biaya pribadi selama trip, [catatan tambahan bila ada — misal: dan tambahan bagasi karena kita hanya dapat kabin [X]kg dari maskapai].\n\nKalau berkenan, aku kirimkan juga itinerary lengkap & rincian harganya ya, Kak 😍🥰\n\n[Nama CS] — Anara Explore',
  },
  {
    no: '02', code: 'TICKETING', when: 'Setelah Briefing', title: 'Rincian Biaya (Include/Exclude)',
    useWhen: 'Dipakai setelah Briefing, waktu lead sudah tahu paketnya dan mau lihat rincian biaya per kategori (dewasa/anak/infant/single supp, dll). Ada 4 gaya presentasi — pilih sesuai tahap obrolan: ringkas untuk awal, lengkap untuk yang sudah serius. Isi Include/Exclude sesuai price list paket yang dijelaskan.',
    tag: null,
    variants: [
      { label: 'Rincian Lengkap', text: 'Halo Kak [Nama] 😊\nUntuk paket [Paket] keberangkatan [Tanggal Keberangkatan], harga [Kategori] Rp[Harga All-In]/pax ya, Kak.\n\nHarga tersebut sudah termasuk:\n[Daftar include sesuai paket]\n\nYang belum termasuk:\n[Daftar exclude sesuai paket]\n\nKalau ada yang mau ditanyakan lagi soal itinerary harian atau syarat visanya, boleh banget, Kak 😊\n\n[Nama CS] — Anara Explore' },
      { label: 'All-In Ringkas', text: '💰 All-In *Rp[Harga All-In]*/pax ([Kategori])\n_keberangkatan [Tanggal Keberangkatan]_' },
      { label: 'Rapi Monospace', text: '```\nKategori         Harga\n──────────────────────\n[Kategori]   Rp[Harga All-In]\n```\n_All-in per pax, keberangkatan [Tanggal Keberangkatan]_' },
      { label: 'Singkat', text: '👉 [Kategori]: *Rp[Harga All-In]*/pax all-in\n_(sudah termasuk [ringkasan include singkat])_' },
    ],
  },
  {
    no: '03', code: 'INQUIRY', when: 'H+1', title: 'Follow-up Awal',
    useWhen: 'Sehari setelah kamu kirim itinerary / price list dan belum ada balasan.',
    tag: null,
    text: 'Halo Kak [Nama] 🙏\nTerima kasih sudah tanya-tanya soal paket [Paket] kemarin.\n\nSudah sempat dibaca-baca itinerary dan harganya, Kak? Kalau ada yang mau ditanyakan soal jadwal, harga, atau syarat visanya, saya bantu jelaskan lebih lanjut.\n\nUntuk tanggal keberangkatan [Tanggal Keberangkatan], itu sudah pas buat Kakak, atau masih perlu digeser?\n\nSalam,\n[Nama CS] — Anara Explore',
  },
  {
    no: '04', code: 'CHECK-IN', when: 'H+3–5', title: 'Follow-up Lanjutan',
    useWhen: 'Belum ada balasan sama sekali sejak follow-up pertama. Ada 4 variasi nada — pilih yang paling pas buat karakter lead-nya, lalu ganti bagian [dalam kurung].',
    tag: null,
    variants: [
      { label: 'Original', text: 'Halo Kak [Nama], apa kabar? 😊\nBeberapa hari lalu saya kirim info paket [Paket], siapa tahu kelewat chat-nya.\n\nBoleh dibantu, ada kendala di bagian mana, Kak — soal harga, tanggal, atau mungkin masih membandingkan dengan paket lain? Cerita saja, nanti saya bantu carikan opsi yang paling pas.\n\n[Nama CS] — Anara Explore' },
      { label: 'Hangat & Personal', text: 'Halo Kak [Nama] 👋\nKabarnya gimana, Kak — masih kepikiran buat healing ke [Paket] nggak nih? 😄\n\nKemarin sempat aku kirim info paketnya, siapa tahu ada yang mau ditanyain lagi soal jadwal atau harganya. Cerita aja ya, Kak, aku bantu carikan yang paling pas buat rencana liburannya 🙏🏻\n\n[Nama CS] — Anara Explore' },
      { label: 'Kasih Info Tambahan', text: 'Halo Kak [Nama] 🙏🏻\nKebetulan aku baru dapat update terbaru soal paket [Paket] — mumpung masih anget, sekalian aku share ke Kakak ya.\n\nBtw, dari info yang kemarin dikirim, ada bagian yang masih perlu didiskusikan, Kak? Soal harga, tanggal, atau lagi bandingin sama paket lain, cerita aja biar bisa dibantu 😊\n\n[Nama CS] — Anara Explore' },
      { label: 'Singkat & Santai', text: 'Hi Kak [Nama] 😊\nMasih inget nggak paket [Paket] yang kemarin aku infoin? Hehe.\n\nKalau ada yang bikin ragu — harga, tanggal, atau lagi bandingin sama yang lain — kabarin aku ya, Kak, siapa tahu bisa dicariin solusinya 🙏🏻\n\n[Nama CS] — Anara Explore' },
    ],
  },
  {
    no: '05', code: 'BOARDING', when: 'Kapan saja', title: 'Kuota / Promo Terbatas',
    useWhen: 'Ada urgensi nyata — kuota menipis, harga promo mau naik, atau tanggal favorit hampir penuh.',
    tag: 'urgent',
    text: 'Kak [Nama], mau kabari nih 🚨\nKuota paket [Paket] keberangkatan [Tanggal Keberangkatan] tinggal terbatas — biasanya cepat penuh karena harganya sedang bagus (all-in Rp[Harga All-In]).\n\nKalau Kakak masih berminat, saya sarankan segera diamankan seat-nya dengan DP Rp[DP], sebelum kuota atau harga promonya berubah.\n\nMau saya bantu proses sekarang, Kak?\n\n[Nama CS] — Anara Explore',
  },
  {
    no: '06', code: 'FINAL CALL', when: 'Saat siap', title: 'Ajakan DP / Closing',
    useWhen: 'Lead sudah terlihat mantap — tinggal butuh dorongan terakhir untuk bayar DP.',
    tag: null,
    text: 'Halo Kak [Nama] 🙏\nKalau sudah cukup mantap dengan paket [Paket] ([Tanggal Keberangkatan]), boleh langsung kita amankan seat-nya, Kak.\n\nProsesnya: DP Rp[DP] ke rekening PT Anara, lalu saya kirimkan slip konfirmasi serta daftar dokumen (paspor, visa, dll) yang perlu disiapkan. Sisa pelunasan bisa menyusul sebelum H- keberangkatan.\n\nMau saya kirimkan nomor rekeningnya sekarang?\n\n[Nama CS] — Anara Explore',
  },
  {
    no: '07', code: 'REROUTE', when: 'Bila perlu', title: 'Mengatasi Keberatan Harga',
    useWhen: "Lead bilang 'masih mikir-mikir' atau harga dirasa berat, tapi minatnya masih ada.",
    tag: null,
    text: 'Halo Kak [Nama],\nSaya paham, soal harga memang perlu dipikirkan matang-matang 🙏\n\nUntuk paket [Paket], harga Rp[Harga All-In] itu sudah termasuk [tiket pesawat, hotel, makan sesuai itinerary, tur, dan visa] — jadi Kakak tidak perlu memikirkan biaya tambahan lagi selama perjalanan.\n\nKalau budget masih jadi pertimbangan, saya bisa infokan juga tanggal atau paket lain yang lebih ringan, atau bantu atur skema DP kalau Kakak butuh waktu.\n\nAda yang bisa saya bantu supaya lebih pas, Kak?\n\n[Nama CS] — Anara Explore',
  },
  {
    no: '08', code: 'REBOOK', when: 'H+14 ke atas', title: 'Win-Back',
    useWhen: 'Lead sudah lama sekali (2 minggu lebih) tidak membalas sama sekali.',
    tag: null,
    text: 'Halo Kak [Nama], lama tidak mengobrol ya 😊\nBeberapa waktu lalu Kakak sempat tanya-tanya soal paket [Paket]. Kebetulan ada update tanggal dan promo terbaru dari Anara yang mungkin lebih cocok buat Kakak.\n\nKalau masih tertarik jalan-jalan dalam waktu dekat, boleh saya kirimkan info terbarunya, Kak?\n\n[Nama CS] — Anara Explore',
  },
];
