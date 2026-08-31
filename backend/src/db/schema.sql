-- Anara Quick Replies - Database Schema
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

CREATE INDEX IF NOT EXISTS idx_leads_entry_date ON leads(entry_date);
CREATE INDEX IF NOT EXISTS idx_leads_package ON leads(package_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_package_id ON quick_replies(package_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tags ON quick_replies(tags);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_usage_log_reply_id ON usage_log(reply_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_used_at ON usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
