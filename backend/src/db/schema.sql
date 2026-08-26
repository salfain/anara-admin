-- Anara Quick Replies - Database Schema
-- PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'cs' CHECK (role IN ('cs', 'admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_package_id ON quick_replies(package_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_tags ON quick_replies(tags);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_usage_log_reply_id ON usage_log(reply_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_used_at ON usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
