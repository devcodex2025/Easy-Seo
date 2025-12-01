-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  email TEXT UNIQUE,
  is_guest BOOLEAN DEFAULT true,
  credits INTEGER DEFAULT 3,
  plan TEXT DEFAULT 'free',
  plan_expires_at BIGINT,
  created_at BIGINT NOT NULL,
  last_analysis_date TEXT,
  daily_analysis_count INTEGER DEFAULT 0
);

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  title_length INTEGER,
  meta_description TEXT,
  meta_description_length INTEGER,
  h1_count INTEGER,
  h2_count INTEGER,
  h3_count INTEGER,
  has_canonical BOOLEAN,
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  twitter_card TEXT,
  http_status INTEGER,
  final_url TEXT,
  redirect_count INTEGER,
  ttfb INTEGER,
  load_time INTEGER,
  has_viewport BOOLEAN,
  is_https BOOLEAN,
  security_headers JSONB,
  seo_score INTEGER,
  warnings JSONB,
  recommendations JSONB,
  screenshot_url TEXT,
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  created_at BIGINT NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  amount_x402 REAL NOT NULL,
  plan TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  x402_tx_hash TEXT UNIQUE,
  wallet_address TEXT,
  created_at BIGINT NOT NULL,
  completed_at BIGINT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_public_token ON analyses(public_token);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Unique constraint for transaction signatures (anti-fraud)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_signature 
ON transactions(x402_tx_hash) 
WHERE x402_tx_hash IS NOT NULL;
