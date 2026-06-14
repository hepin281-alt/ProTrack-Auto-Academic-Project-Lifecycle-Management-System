import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'protrack_auto'
});

async function seedStudents() {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    const students = [
        { email: 'alice@university.edu', name: 'Alice Smith', prn: '2024CS001', roll: '101' },
        { email: 'bob@university.edu', name: 'Bob Johnson', prn: '2024CS002', roll: '102' },
        { email: 'charlie@university.edu', name: 'Charlie Brown', prn: '2024CS003', roll: '103' },
        { email: 'diana@university.edu', name: 'Diana Prince', prn: '2024CS004', roll: '104' },
    ];
    
    try {
        // Find existing student's batch year to match it, defaulting to 2024
        const existingStudent = await pool.query('SELECT batch_year FROM student_profiles LIMIT 1');
        const batchYear = existingStudent.rows.length > 0 ? existingStudent.rows[0].batch_year : 2024;

        for (const s of students) {
            // Insert into whitelist just in case it's needed
            await pool.query(
                `INSERT INTO student_whitelist (prn_no, email, full_name, is_claimed) 
                 VALUES ($1, $2, $3, true) ON CONFLICT (prn_no) DO NOTHING`,
                [s.prn, s.email, s.name]
            );

            // Insert user
            const userRes = await pool.query(
                `INSERT INTO users (email, password_hash, role, full_name) 
                 VALUES ($1, $2, 'STUDENT', $3) 
                 ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                 RETURNING user_id`,
                [s.email, hash, s.name]
            );

            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].user_id;
                // Insert profile
                await pool.query(
                    `INSERT INTO student_profiles (student_id, prn_no, roll_no, batch_year) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (prn_no) DO NOTHING`,
                    [userId, s.prn, s.roll, batchYear]
                );
            }
        }
        
        console.log(`Seeded ${students.length} students with batch_year = ${batchYear} and password = 'password123'`);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

seedStudents();
