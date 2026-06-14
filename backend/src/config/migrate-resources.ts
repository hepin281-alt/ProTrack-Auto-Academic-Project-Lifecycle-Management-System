import { query } from './database.js';

async function migrate() {
    try {
        await query(`
            ALTER TABLE group_resources
            ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'LINK',
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
            ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
            
            ALTER TABLE group_resources
            ALTER COLUMN url DROP NOT NULL;
        `);
        console.log('Migration successful: group_resources updated');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
