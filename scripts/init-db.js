import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

console.log('🗄️  Initializing database...');

// Users table (for both registered and anonymous users)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    is_guest INTEGER DEFAULT 1,
    credits INTEGER DEFAULT 3,
    plan TEXT DEFAULT 'free',
    plan_expires_at INTEGER,
    created_at INTEGER NOT NULL,
    last_analysis_date TEXT,
    daily_analysis_count INTEGER DEFAULT 0
  )
`);

// Analyses table
db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    screenshot_url TEXT,
    title TEXT,
    title_length INTEGER,
    meta_description TEXT,
    meta_description_length INTEGER,
    h1_count INTEGER,
    h2_count INTEGER,
    h3_count INTEGER,
    has_canonical INTEGER,
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
    has_viewport INTEGER,
    is_https INTEGER,
    security_headers TEXT,
    seo_score INTEGER,
    warnings TEXT,
    recommendations TEXT,
    is_public INTEGER DEFAULT 0,
    public_token TEXT UNIQUE,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Transactions table (for x402 payments)
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    amount_x402 REAL NOT NULL,
    plan TEXT NOT NULL,
    credits_added INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    x402_tx_hash TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_public_token ON analyses(public_token);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

console.log('✅ Database initialized successfully!');
console.log('📍 Database location:', dbPath);

db.close();
