const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'protrack_auto',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    try {
        const hash = '$2a$10$idCS2DkhWQEj5rima3LVp.nE/8pqVhJ3aPpzIMlvvTsq6VQFMNbQi'; // password 'password'

        // 1. Fetch 9 un-claimed students
        const whitelistRes = await pool.query("SELECT * FROM student_whitelist WHERE is_claimed = false LIMIT 9");
        const students = whitelistRes.rows;

        if (students.length < 9) {
            console.log("Not enough unclaimed students in whitelist to form 3 groups of 3. Found:", students.length);
            return;
        }

        const topics = [
            { 
                title: 'AI-Powered Crop Disease Detection', 
                abstract: 'Using deep learning and convolutional neural networks (CNNs) to accurately identify and classify crop diseases from agricultural drone imagery.',
                objectives: '1. Build dataset\n2. Train ResNet50\n3. Deploy as API',
                tech: ['Python', 'TensorFlow', 'React']
            },
            { 
                title: 'Decentralized Academic Credential System', 
                abstract: 'A blockchain-based system for universities to issue, verify, and revoke academic credentials securely and immutably.',
                objectives: '1. Smart contracts\n2. Issuer portal\n3. Verifier portal',
                tech: ['Solidity', 'Ethereum', 'Next.js']
            },
            { 
                title: 'Autonomous Traffic Management System', 
                abstract: 'Real-time traffic light optimization using reinforcement learning and computer vision to reduce congestion in urban intersections.',
                objectives: '1. Vision pipeline\n2. RL Agent training\n3. Traffic simulation',
                tech: ['Python', 'OpenCV', 'PyTorch']
            }
        ];

        let s_idx = 0;
        for (let i = 0; i < 3; i++) {
            const topic = topics[i];
            
            // Create group
            const groupRes = await pool.query(
                "INSERT INTO project_groups (group_name, status, department_id) VALUES ($1, 'WAITING_ALLOCATION', $2) RETURNING group_id",
                [`Group-CS-${i+1}`, students[0].department_id]
            );
            const groupId = groupRes.rows[0].group_id;

            // Add 3 students
            for (let j = 0; j < 3; j++) {
                const s = students[s_idx++];
                
                // Insert User
                const userRes = await pool.query(
                    "INSERT INTO users (full_name, email, role, password_hash, department_id) VALUES ($1, $2, 'STUDENT', $3, $4) RETURNING user_id",
                    [s.full_name, s.email, hash, s.department_id]
                );
                const userId = userRes.rows[0].user_id;

                // Insert Student Profile
                const parsedBatchYear = parseInt(s.prn_no.substring(0, 4)) || 2024;
                await pool.query(
                    "INSERT INTO student_profiles (student_id, prn_no, roll_no, batch_year) VALUES ($1, $2, $3, $4)",
                    [userId, s.prn_no, `R-${s.prn_no.slice(-3)}`, parsedBatchYear]
                );

                // Add to Group
                await pool.query(
                    "INSERT INTO group_members (group_id, student_id, is_leader) VALUES ($1, $2, $3)",
                    [groupId, userId, j === 0]
                );

                // Mark as claimed
                await pool.query("UPDATE student_whitelist SET is_claimed = true WHERE id = $1", [s.id]);
            }

            // Insert approved topic proposal
            const topicRes = await pool.query(
                `INSERT INTO project_proposals 
                 (group_id, title, abstract, objectives, technology_stack, domain_tags, status, approval_stage, is_approved) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', 'APPROVED', true) RETURNING proposal_id`,
                [groupId, topic.title, topic.abstract, topic.objectives, topic.tech, ['AI/ML', 'Web', 'Database']]
            );
            
            console.log(`Created group ${groupId} with topic: ${topic.title}`);
        }

        // Set up batch milestones starting from today
        const now = new Date();
        const phases = [
            { key: 'PHASE_1', name: 'Project Proposal & Literature Survey', days: 7 },
            { key: 'PHASE_2', name: 'System Architecture & Initial Design', days: 21 },
            { key: 'PHASE_3', name: 'Implementation & Prototype', days: 45 },
            { key: 'FINAL', name: 'Final Submission & Documentation', days: 60 }
        ];

        // Assuming all seeded students are from the same batch for milestone scheduling
        const milestoneBatchYear = parseInt(students[0].prn_no.substring(0, 4)) || 2024;

        // Clear existing milestones for the batch just in case
        await pool.query("DELETE FROM batch_milestones WHERE batch_year = $1", [milestoneBatchYear]);

        for (const p of phases) {
            const dueDate = new Date(now.getTime() + p.days * 24 * 60 * 60 * 1000);
            await pool.query(
                "INSERT INTO batch_milestones (batch_year, milestone_key, milestone_name, due_date) VALUES ($1, $2, $3, $4)",
                [milestoneBatchYear, p.key, p.name, dueDate]
            );
        }
        
        console.log(`Milestones scheduled starting today for batch ${milestoneBatchYear}.`);
        console.log("Success! Groups formed, topics approved, and phases started.");

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
