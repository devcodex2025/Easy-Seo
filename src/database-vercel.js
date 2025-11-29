import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDatabase() {
    try {
        // Users table
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        is_guest BOOLEAN DEFAULT true,
        credits INTEGER DEFAULT 3,
        plan TEXT DEFAULT 'free',
        plan_expires_at BIGINT,
        created_at BIGINT NOT NULL,
        last_analysis_date TEXT,
        daily_analysis_count INTEGER DEFAULT 0
      )
    `;

        // Analyses table
        await sql`
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
      )
    `;

        // Transactions table
        await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount_usd REAL NOT NULL,
        amount_x402 REAL NOT NULL,
        plan TEXT NOT NULL,
        credits_added INTEGER NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        x402_tx_hash TEXT,
        wallet_address TEXT,
        created_at BIGINT NOT NULL,
        completed_at BIGINT
      )
    `;

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_analyses_public_token ON analyses(public_token)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

        console.log('✅ Database initialized successfully (Vercel Postgres)');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        // Tables might already exist, which is fine
        return true;
    }
}

export { sql };
