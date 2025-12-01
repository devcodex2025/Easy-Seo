import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');

try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('--- RAW .ENV CONTENT START ---');
    console.log(content);
    console.log('--- RAW .ENV CONTENT END ---');

    console.log('\n--- PARSED KEYS ---');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (!line.trim() || line.startsWith('#')) return;
        const parts = line.split('=');
        const key = parts[0];
        console.log(`Line ${i + 1}: Key='${key}' Length=${key.length}`);
        if (key.trim() !== key) {
            console.log(`⚠️  WARNING: Key on line ${i + 1} has whitespace!`);
        }
    });

} catch (err) {
    console.error('Error reading .env:', err.message);
}
