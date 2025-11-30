import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from root directory
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
    console.log('⚠️  dotenv error:', result.error.message);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Only log warning if variables are missing, don't crash immediately to allow for env setup
if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_KEY is missing in .env file.');
}

const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
);

export default supabase;
