import { Pool } from 'pg';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'protrack_auto',
    password: 'password',
    port: 5432,
});

async function seedRubrics() {
    try {
        console.log('Seeding rubrics...');

        const rubrics = [
            {
                name: 'Initial Review (Literature & Objectives)',
                target_phase: 'REVIEW_1',
                schema: JSON.stringify([
                    { id: '1', name: 'Literature Survey Depth', maxMarks: 10 },
                    { id: '2', name: 'Clarity of Problem Statement', maxMarks: 10 },
                    { id: '3', name: 'Feasibility of Objectives', maxMarks: 10 }
                ])
            },
            {
                name: 'Mid-term Review (Design & Architecture)',
                target_phase: 'REVIEW_2',
                schema: JSON.stringify([
                    { id: '1', name: 'System Architecture Design', maxMarks: 15 },
                    { id: '2', name: 'Database/Schema Design', maxMarks: 10 },
                    { id: '3', name: 'Progress vs Timeline', maxMarks: 5 }
                ])
            },
            {
                name: 'Pre-Final Review (Implementation & Testing)',
                target_phase: 'REVIEW_3',
                schema: JSON.stringify([
                    { id: '1', name: 'Core Features Implementation', maxMarks: 20 },
                    { id: '2', name: 'Testing & Validation', maxMarks: 10 },
                    { id: '3', name: 'Code Quality', maxMarks: 10 }
                ])
            },
            {
                name: 'Final Project Defense',
                target_phase: 'FINAL',
                schema: JSON.stringify([
                    { id: '1', name: 'Working Prototype Demonstration', maxMarks: 30 },
                    { id: '2', name: 'Report Quality & Formatting', maxMarks: 10 },
                    { id: '3', name: 'Presentation & Q&A', maxMarks: 10 }
                ])
            }
        ];

        // Clear existing rubrics to avoid duplicates
        await pool.query(`TRUNCATE TABLE rubric_templates CASCADE`);

        for (const rubric of rubrics) {
            await pool.query(
                `INSERT INTO rubric_templates (name, target_phase, schema) VALUES ($1, $2, $3)`,
                [rubric.name, rubric.target_phase, rubric.schema]
            );
            console.log(`Inserted rubric: ${rubric.name} for ${rubric.target_phase}`);
        }

        console.log('Successfully seeded comprehensive rubrics!');
    } catch (err) {
        console.error('Failed to seed rubrics:', err);
    } finally {
        await pool.end();
    }
}

seedRubrics();
