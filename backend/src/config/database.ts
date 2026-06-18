import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'protrack_auto',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
          }
);

pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
});

export async function getConnection(): Promise<PoolClient> {
    return pool.connect();
}

export async function query(text: string, params?: unknown[]) {
    try {
        const result = await pool.query(text, params);
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✓ Database connection successful');
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error);
        return false;
    }
}

export async function closePool(): Promise<void> {
    await pool.end();
}

export { pool };
export default pool;
