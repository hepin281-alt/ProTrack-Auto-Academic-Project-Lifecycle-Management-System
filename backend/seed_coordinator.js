import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'protrack_auto'
});

async function seed() {
    const email = 'admin@university.edu';
    const password = 'admin';
    const hash = await bcrypt.hash(password, 10);
    
    try {
        await pool.query(
            "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'COORDINATOR') ON CONFLICT (email) DO NOTHING",
            [email, hash]
        );
        console.log('Seeded coordinator: admin@university.edu / admin');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

seed();
