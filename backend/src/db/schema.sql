-- Anara Admin - Database Schema
-- PostgreSQL

CREATE TABLE IF NOT EXISTS roles (
  key VARCHAR(30) PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO roles (key, label, is_admin, is_builtin) VALUES
  ('cs', 'CS', FALSE, TRUE),
  ('admin', 'Admin', TRUE, TRUE)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(30) NOT NULL DEFAULT 'cs' REFERENCES roles(key),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_fkey;
ALTER TABLE users ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES roles(key);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_key VARCHAR(30) NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  permission_key VARCHAR(60) NOT NULL,
  PRIMARY KEY (role_key, permission_key)
);

-- Hak akses bawaan untuk setiap role non-admin yang belum punya baris sama sekali
-- (role CS bawaan, dan role custom yang dibuat sebelum fitur hak akses ada).
-- Hanya jalan sekali per role: begitu admin menyesuaikannya, migrate ulang tidak menimpanya.
-- Role dengan is_admin otomatis punya semua hak akses, jadi tidak perlu baris.
INSERT INTO role_permissions (role_key, permission_key)
SELECT r.key, p
FROM roles r
CROSS JOIN unnest(ARRAY[
  'quick_replies.view',
  'quick_replies.manage',
  'follow_up.view',
  'leads.view',
  'leads.manage',
  'packages.view'
]) AS p
WHERE r.is_admin = FALSE
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_key = r.key);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  destination VARCHAR(255),
  duration INT,
  year INT,
  dates VARCHAR(255),
  price DECIMAL(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'promo', 'closed')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Satu paket punya banyak keberangkatan, masing-masing dengan status seat
-- sendiri. Kolom packages.dates yang berupa teks tidak bisa menampung itu:
-- pesan follow-up jadi menyebut gabungan tanggal, bukan tanggal yang diminati.
CREATE TABLE IF NOT EXISTS package_departures (
  id SERIAL PRIMARY KEY,
  package_id INT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  depart_date DATE NOT NULL,
  -- Sengaja tanpa CHECK: status seat diketik sendiri oleh tim di spreadsheet
  -- ("AVAILABLE", "WAITING LIST", ...), dan daftar tertutup akan menolak data
  -- mereka saat diimport. UI menawarkan pilihan umum, kolomnya tetap terbuka.
  seat_status VARCHAR(40) NOT NULL DEFAULT 'AVAILABLE',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, depart_date)
);

-- Tanggal pulang, dan berapa orang yang muat. Kapasitasnya kolom, bukan angka
-- di dalam kode: 40 adalah yang berlaku sekarang, bukan hukum alam — sewaktu-
-- waktu ada keberangkatan yang pesawatnya lebih kecil atau lebih besar.
ALTER TABLE package_departures ADD COLUMN IF NOT EXISTS return_date DATE;
ALTER TABLE package_departures ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 40;

CREATE INDEX IF NOT EXISTS idx_departures_date ON package_departures(depart_date);

CREATE TABLE IF NOT EXISTS quick_replies (
  id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  package_id INT REFERENCES packages(id) ON DELETE SET NULL,
  category VARCHAR(100),
  tags VARCHAR(500),
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS usage_log (
  id SERIAL PRIMARY KEY,
  reply_id INT NOT NULL REFERENCES quick_replies(id) ON DELETE CASCADE,
  used_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size INT,
  uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followup_templates (
  id SERIAL PRIMARY KEY,
  no VARCHAR(10) NOT NULL,
  code VARCHAR(50) NOT NULL,
  when_label VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  use_when TEXT,
  tag VARCHAR(50),
  kind VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'steps', 'variants')),
  text TEXT,
  steps JSONB,
  variants JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_templates_sort ON followup_templates(sort_order);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  whatsapp VARCHAR(30) NOT NULL,
  pic_sales VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'Baru',
  notes TEXT,
  follow_up_1 DATE,
  follow_up_2 DATE,
  follow_up_3 DATE,
  country VARCHAR(100),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Nama customer dan paket yang diminati. Keduanya mengisi placeholder yang
-- paling sering muncul di template follow-up ([Nama], [Paket], harga, tanggal
-- keberangkatan), yang sebelumnya harus diketik ulang tiap kali kirim.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS package_id INT REFERENCES packages(id) ON DELETE SET NULL;

-- PIC sebagai akun, bukan sekadar teks. Selama pic_sales cuma diketik,
-- "Dita", "dita", dan "Dita " jadi tiga orang berbeda saat dihitung — dan
-- itu langsung merusak angka konversi per PIC.
-- pic_sales tetap disimpan: ada nama yang tidak cocok dengan akun mana pun,
-- dan membuangnya berarti kehilangan data.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pic_user_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Backfill sekali: cocokkan nama yang sudah terlanjur diketik ke akun yang ada,
-- tanpa peduli besar-kecil huruf atau spasi berlebih.
UPDATE leads l
SET pic_user_id = u.id
FROM users u
WHERE l.pic_user_id IS NULL
  AND l.pic_sales IS NOT NULL
  AND lower(btrim(l.pic_sales)) = lower(btrim(u.name));

-- Kapan lead berubah jadi "Sudah DP". Tanpa ini, lama waktu sampai closing
-- hanya bisa ditebak dari updated_at, yang ikut berubah setiap kali baris
-- disunting — angkanya akan terlihat meyakinkan padahal salah.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMP;

-- Riwayat percakapan per lead. Kolom FU cuma menyimpan tanggal, dan notes
-- satu kotak yang tertimpa tiap kali disunting — jadi apa yang sebenarnya
-- terjadi di tiap follow-up tidak tersimpan di mana pun.
CREATE TABLE IF NOT EXISTS lead_notes (
  id SERIAL PRIMARY KEY,
  lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  -- 'note' ditulis orang; 'status' dicatat sistem saat status berubah.
  kind VARCHAR(20) NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'status')),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);

-- Laporan harian CS yang dikirim ke grup tiap sore.
--
-- Angkanya disimpan, bukan dihitung ulang saat dibaca. Ini keputusan sadar:
-- yang berlaku adalah angka yang dilaporkan dan disetujui admin pada hari itu,
-- meski data lead berubah setelahnya. Nilai awalnya boleh diambil dari data
-- lead, tapi begitu tersimpan, laporan itu yang jadi catatan.
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_leads INT NOT NULL DEFAULT 0,
  -- Boleh kosong. Nol berarti "tidak ada yang janji transfer", sedangkan
  -- kosong berarti belum dihitung, dan keduanya beda arti.
  janji_tf INT,
  total_closing INT NOT NULL DEFAULT 0,
  total_followup INT NOT NULL DEFAULT 0,
  -- Rincian per paket, satu baris per paket, seperti di pesan grup.
  breakdown TEXT,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Satu laporan per orang per hari. Dua baris untuk hari yang sama tidak bisa
  -- dijawab mana yang dipakai.
  UNIQUE (report_date, user_id)
);

-- Rincian per paket disimpan sebagai angka, bukan teks.
-- Sebelumnya admin harus mengetik "3 negara = 2, Korea = 1" setiap hari.
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS breakdown_counts JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Pindahkan teks yang terlanjur tersimpan, lalu kolom lamanya dibuang supaya
-- tidak ada dua sumber untuk hal yang sama.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'daily_reports' AND column_name = 'breakdown') THEN
    UPDATE daily_reports SET breakdown_counts = COALESCE((
      SELECT jsonb_object_agg(btrim(split_part(baris, '=', 1)),
                              NULLIF(btrim(split_part(baris, '=', 2)), '')::int)
      FROM unnest(string_to_array(breakdown, E'
')) AS baris
      WHERE btrim(baris) <> '' AND position('=' in baris) > 0
    ), '{}'::jsonb)
    WHERE breakdown IS NOT NULL AND breakdown_counts = '{}'::jsonb;

    ALTER TABLE daily_reports DROP COLUMN breakdown;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

-- Invoice. Berdiri sendiri, tidak terikat ke baris Penagihan: ada invoice untuk
-- trip yang tidak dikelola di sana.
--
-- Nilai uang disimpan sebagai NUMERIC, bukan float. Harga tur berjumlah puluhan
-- juta, dan pembulatan biner akan membuat sisa tagihan meleset beberapa rupiah
-- tanpa ada yang tahu dari mana.
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR(60) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_address VARCHAR(255),
  customer_phone VARCHAR(60),
  -- Ditulis apa adanya seperti di invoice: "29 DESEMBER 2026 - 03 JANUARI 2027".
  -- Bukan dua kolom tanggal, karena yang dicetak memang satu baris teks.
  departure_label VARCHAR(255),
  invoice_date DATE,
  ticket_payment_date DATE,
  repayment_date DATE,
  revision VARCHAR(120),
  -- CS yang menangani. Di invoice tercetak dengan label "Customer".
  cs_name VARCHAR(120),
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  code VARCHAR(120),
  description TEXT,
  qty NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  paid_on DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  note VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id, sort_order);

-- Kolom rincian di laporan harian: daftar tujuan yang dipakai tim.
--
-- Tidak diturunkan dari tabel paket. Nama paket itu panjang ("6D WINTER
-- HOLIDAY HONGKONG SHENZHEN...") dan tidak muat jadi judul kolom, sedangkan
-- daftar ini kesepakatan tim yang berubah sendiri saat membuka tujuan baru.
CREATE TABLE IF NOT EXISTS report_categories (
  id SERIAL PRIMARY KEY,
  label VARCHAR(60) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Isi awal sesuai laporan yang sudah berjalan. Hanya sekali: begitu tim
-- menyesuaikan daftarnya, migrate ulang tidak menimpanya.
INSERT INTO report_categories (label, sort_order)
SELECT * FROM (VALUES
  ('3 negara', 1),
  ('eropa barat', 2),
  ('Hongkong', 3),
  ('Vietnam', 4),
  ('Korea', 5)
) AS awal(label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM report_categories);

-- Penagihan: tahap setelah lead closing, sampai peserta berangkat.
--
-- Satu invoice punya satu customer dan beberapa peserta — di spreadsheet ini
-- terlihat sebagai sel yang digabung, dengan nomor invoice hanya diisi di
-- baris pertama tiap grup. Di sini dipisah jadi dua tabel supaya tiap peserta
-- punya barisnya sendiri, tanpa baris kosong yang cuma jadi template.
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  departure_id INT REFERENCES package_departures(id) ON DELETE SET NULL,
  -- Dari mana booking ini berasal. Boleh kosong: tidak semua penjualan lewat
  -- pencatatan lead, dan data lama tidak punya jejaknya.
  lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
  invoice_no VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_participants (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  origin VARCHAR(100),
  destination VARCHAR(100),

  -- Kolom PENAGIHAN di spreadsheet.
  paid_dp BOOLEAN NOT NULL DEFAULT FALSE,
  paid_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  paid_settlement BOOLEAN NOT NULL DEFAULT FALSE,

  -- Kolom BOOKING TIKET.
  booked_outbound BOOLEAN NOT NULL DEFAULT FALSE,
  booked_return BOOLEAN NOT NULL DEFAULT FALSE,

  -- TIKET / NAMA PESAWAT / BOOKING CODE, masing-masing berangkat dan pulang.
  ticket_outbound VARCHAR(100),
  ticket_return VARCHAR(100),
  airline_outbound VARCHAR(100),
  airline_return VARCHAR(100),
  code_outbound VARCHAR(100),
  code_return VARCHAR(100),

  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_departure ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_participants_booking ON booking_participants(booking_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_leads_entry_date ON leads(entry_date);
CREATE INDEX IF NOT EXISTS idx_leads_package ON leads(package_id);
-- Keberangkatan yang diminati, kalau customer sudah menyebut tanggal.
-- Tanpa ini pesan follow-up menyebut packages.dates — teks gabungan berisi
-- semua tanggal sekaligus, bukan tanggal yang sedang ditanyakan.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS departure_id INT REFERENCES package_departures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_pic_user ON leads(pic_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_package_id ON quick_replies(package_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tags ON quick_replies(tags);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_usage_log_reply_id ON usage_log(reply_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_used_at ON usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
