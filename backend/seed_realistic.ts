import { pool } from './src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

async function seedRealisticData() {
    console.log('Seeding realistic project groups...');

    try {
        // Clear existing groups and proposals to prevent conflicts
        await pool.query('DELETE FROM project_groups');
        
        // Fetch students
        const studentsResult = await pool.query(`SELECT user_id FROM users WHERE role = 'STUDENT' ORDER BY full_name`);
        const students = studentsResult.rows.map(row => row.user_id);

        if (students.length < 13) {
            console.log('Not enough students found in DB. Expected 13.');
            process.exit(1);
        }

        // Fetch guides
        const turing = await pool.query(`SELECT user_id FROM users WHERE full_name = 'Dr. Alan Turing'`);
        const hepin = await pool.query(`SELECT user_id FROM users WHERE full_name = 'Hepin'`);
        const anita = await pool.query(`SELECT user_id FROM users WHERE full_name = 'Dr. Anita Kumar'`);
        const rajesh = await pool.query(`SELECT user_id FROM users WHERE full_name = 'Prof. Rajesh Mehta'`);

        const guides = [
            turing.rows[0].user_id,
            hepin.rows[0].user_id,
            anita.rows[0].user_id,
            rajesh.rows[0].user_id
        ];

        // Fetch coordinator for audit log
        const coordinatorResult = await pool.query(`SELECT user_id FROM users WHERE role = 'COORDINATOR' LIMIT 1`);
        const coordinatorId = coordinatorResult.rows[0].user_id;

        // 4 Distinct Projects mapped to Guide Expertise
        const projects = [
            {
                name: 'Secure-Comm: Zero-Knowledge Messaging Protocol',
                description: 'A decentralized, encrypted messaging platform using Zero-Knowledge Proofs to ensure complete user privacy and data integrity without centralized servers.',
                domain: 'Cryptography & Security',
                guide: guides[0], // Dr. Alan Turing
                size: 3
            },
            {
                name: 'AgriSense: IoT Smart Irrigation System',
                description: 'An IoT-based agricultural monitoring system using soil moisture and weather sensors to automate irrigation, reducing water waste and improving crop yield.',
                domain: 'Internet of Things (IoT)',
                guide: guides[1], // Hepin
                size: 3
            },
            {
                name: 'NeuroDetect: Early Alzheimer Diagnosis via MRI',
                description: 'A deep learning convolutional neural network designed to detect early-onset Alzheimer disease from MRI brain scans with high accuracy.',
                domain: 'AI & Healthcare',
                guide: guides[2], // Dr. Anita Kumar
                size: 3
            },
            {
                name: 'EduCollab: Real-Time Virtual Classroom',
                description: 'A full-stack web platform built with React, Node.js, and WebRTC, featuring live interactive whiteboards, code sharing, and real-time audio/video streaming.',
                domain: 'Full-Stack Web Development',
                guide: guides[3], // Prof. Rajesh Mehta
                size: 4
            }
        ];

        // Get Students with their Batch Years
        const studentResult = await pool.query(`
            SELECT u.user_id, sp.batch_year 
            FROM users u
            JOIN student_profiles sp ON u.user_id = sp.student_id
            WHERE u.role = 'STUDENT'
            ORDER BY sp.batch_year ASC
        `);
        
        // Separate students into batches
        const batch2021 = studentResult.rows.filter(r => r.batch_year === 2021).map(r => r.user_id);
        const batch2024 = studentResult.rows.filter(r => r.batch_year === 2024).map(r => r.user_id);

        let index2021 = 0;
        let index2024 = 0;

        for (const project of projects) {
            const groupId = uuidv4();
            const proposalId = uuidv4();

            // Insert Group
            await pool.query(
                `INSERT INTO project_groups (group_id, group_name, guide_id, status)
                 VALUES ($1, $2, $3, 'ACTIVE')`,
                [groupId, project.name, project.guide]
            );

            // Insert Approved Proposal
            await pool.query(
                `INSERT INTO project_proposals (proposal_id, group_id, title, abstract, domain_tags, priority, is_approved, approval_stage, status)
                 VALUES ($1, $2, $3, $4, $5, 1, true, 'APPROVED', 'APPROVED')`,
                [proposalId, groupId, project.name, project.description, [project.domain]]
            );

            // Assign Students to Group homogeneously based on remaining batch capacities
            // We need 1 group of 3 from 2024, and 3 groups (3,3,4) from 2021.
            let assignedStudents = [];
            if (project.size === 3 && index2024 < batch2024.length && (batch2024.length - index2024) >= 3) {
                // Use 2024 batch for this 3-person group
                for(let i=0; i<3; i++) {
                    assignedStudents.push(batch2024[index2024++]);
                }
            } else {
                // Use 2021 batch
                for(let i=0; i<project.size; i++) {
                    assignedStudents.push(batch2021[index2021++]);
                }
            }

            for (const studentId of assignedStudents) {
                await pool.query(
                    `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`,
                    [groupId, studentId]
                );
            }

            // Generate a realistic ML score for the match (e.g., 85.0 to 98.0)
            const baseScore = 85.0 + Math.random() * 13.0;
            const scoreBreakdown = JSON.stringify({
                final_score: baseScore,
                expertise_match: baseScore + (Math.random() * 2 - 1),
                workload_penalty: 0,
                historical_success: 0
            });

            // Insert Audit Log for Allocation
            await pool.query(
                `INSERT INTO allocation_audit (group_id, guide_id, action, performed_by, notes, score_breakdown)
                 VALUES ($1, $2, 'AUTO_ASSIGNED', $3, 'Initial automated group balancing and expert guide assignment utilizing ML similarity engine.', $4)`,
                [groupId, project.guide, coordinatorId, scoreBreakdown]
            );

            console.log(`Created group: ${project.name} with ${project.size} students under Guide ID ${project.guide}`);
        }

        console.log('Successfully generated realistic groups and allocated guides!');
    } catch (error) {
        console.error('Error seeding realistic data:', error);
    } finally {
        await pool.end();
    }
}

seedRealisticData();
