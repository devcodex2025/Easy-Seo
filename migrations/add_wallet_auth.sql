-- Migration script to add wallet authentication support
-- Run this on your existing Supabase database

-- Add wallet_address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
