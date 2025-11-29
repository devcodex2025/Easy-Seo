import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔄 Migrating database...');

try {
    // Check if column exists
    const tableInfo = db.pragma('table_info(analyses)');
    const hasScreenshotUrl = tableInfo.some(col => col.name === 'screenshot_url');

    if (!hasScreenshotUrl) {
        console.log('➕ Adding screenshot_url column to analyses table...');
        db.exec('ALTER TABLE analyses ADD COLUMN screenshot_url TEXT');
        console.log('✅ Column added successfully!');
    } else {
        console.log('ℹ️ Column screenshot_url already exists.');
    }

} catch (error) {
    console.error('❌ Migration failed:', error);
} finally {
    db.close();
}
