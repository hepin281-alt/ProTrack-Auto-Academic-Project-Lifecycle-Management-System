import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'protrack_auto',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS group_meetings (
                meeting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                scheduled_at TIMESTAMP NOT NULL,
                notes TEXT,
                attendance JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_group_meetings_group ON group_meetings(group_id);

            CREATE TABLE IF NOT EXISTS group_signoffs (
                signoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                comments TEXT,
                signed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
                signed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, document_type)
            );
            CREATE INDEX IF NOT EXISTS idx_group_signoffs_group ON group_signoffs(group_id);
        `);
        console.log("Migration applied!");
    } catch(err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
