import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();
        console.log('🔗 Connected to Postgres');

        // Add wallet_address column if missing
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;`);
        // Add unique constraint (if not exists)
        await client.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_wallet_address') THEN
                CREATE INDEX idx_users_wallet_address ON users(wallet_address);
            END IF;
        END $$;`);

        console.log('✅ Migration applied: wallet_address column ensured');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    migrate().then(() => process.exit(0));
}

export { migrate };