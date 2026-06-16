import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const exportYearlyReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT 
                g.group_name, g.status as group_status,
                u.email as guide_email,
                json_agg(
                    json_build_object('prn', sp.prn_no, 'roll', sp.roll_no, 'email', su.email)
                ) as students,
                (SELECT total_marks FROM evaluations WHERE group_id = g.group_id AND phase = 'FINAL') as final_marks
             FROM project_groups g
             LEFT JOIN users u ON g.guide_id = u.user_id
             LEFT JOIN group_members m ON g.group_id = m.group_id
             LEFT JOIN student_profiles sp ON m.student_id = sp.student_id
             LEFT JOIN users su ON sp.student_id = su.user_id
             GROUP BY g.group_id, u.email`
        );
        
        // Simple JSON to CSV
        const data = result;
        if (data.length === 0) {
            res.send('No data available');
            return;
        }

        const header = ['Group Name', 'Status', 'Guide Email', 'Final Marks', 'Students'];
        const rows = data.map(row => [
            row.group_name,
            row.group_status,
            row.guide_email || 'Unassigned',
            row.final_marks || 'N/A',
            (row.students || []).map((s: any) => `${s.prn} (${s.email})`).join('; ')
        ]);

        const csvContent = [
            header.join(','),
            ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=yearly_report.csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ error: 'Failed to export report' });
    }
};

export const getOrphanStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT u.user_id as student_id, u.email, sp.prn_no, sp.roll_no, sp.batch_year, u.created_at
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.student_id
             LEFT JOIN group_members m ON u.user_id = m.student_id
             WHERE m.group_id IS NULL AND u.role = 'STUDENT'`
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching orphan students:', error);
        res.status(500).json({ error: 'Failed to fetch orphan students' });
    }
};

export const autoGroupOrphans = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT u.user_id, sp.batch_year
             FROM users u
             JOIN student_profiles sp ON u.user_id = sp.student_id
             LEFT JOIN group_members m ON u.user_id = m.student_id
             WHERE m.group_id IS NULL AND u.role = 'STUDENT'
             ORDER BY sp.batch_year ASC`
        );
        
        const orphans = result;
        let createdGroups = 0;
        
        // Group orphans by their batch_year first
        const orphansByBatch: Record<string, any[]> = {};
        for (const orphan of orphans) {
            const year = orphan.batch_year || 'Unknown';
            if (!orphansByBatch[year]) orphansByBatch[year] = [];
            orphansByBatch[year].push(orphan);
        }
        
        // Group in batches of 4 per batch_year
        for (const year in orphansByBatch) {
            const yearOrphans = orphansByBatch[year];
            for (let i = 0; i < yearOrphans.length; i += 4) {
                const batch = yearOrphans.slice(i, i + 4);
                if (batch.length === 0) continue;
                
                const groupName = `Auto Group (${year}) ${Math.floor(Math.random() * 10000)}`;
                const groupResult = await query(
                    `INSERT INTO project_groups (group_name, status) VALUES ($1, 'WAITING_ALLOCATION') RETURNING group_id`,
                    [groupName]
                );
                const groupId = groupResult[0].group_id;
                
                for (const student of batch) {
                    await query(
                        `INSERT INTO group_members (group_id, student_id, is_leader) VALUES ($1, $2, $3)`,
                        [groupId, student.user_id, student === batch[0]]
                    );
                }
                createdGroups++;
            }
        }

        res.json({ message: 'Auto-grouping successful', groups_created: createdGroups });
    } catch (error) {
        console.error('Error in autoGroupOrphans:', error);
        res.status(500).json({ error: 'Failed to auto-group orphans' });
    }
};

export const getFacultyList = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT u.user_id as faculty_id, u.full_name, u.email, u.role, f.expertise_tags, f.current_workload, f.max_workload
             FROM users u
             LEFT JOIN faculty_profiles f ON u.user_id = f.faculty_id
             WHERE u.role IN ('GUIDE', 'COMMITTEE')
             ORDER BY u.full_name ASC`
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching faculty list:', error);
        res.status(500).json({ error: 'Failed to fetch faculty list' });
    }
};

export const updateGuideWorkload = async (req: Request, res: Response): Promise<void> => {
    try {
        const { faculty_id } = req.params;
        const { max_workload } = req.body;
        
        if (typeof max_workload !== 'number' || max_workload < 0) {
            res.status(400).json({ error: 'Invalid max_workload' });
            return;
        }

        const result = await query(
            `UPDATE faculty_profiles SET max_workload = $1 WHERE faculty_id = $2 RETURNING *`,
            [max_workload, faculty_id]
        );

        if (result.length === 0) {
            res.status(404).json({ error: 'Faculty profile not found' });
            return;
        }

        res.json({ message: 'Max workload updated successfully', profile: result[0] });
    } catch (error) {
        console.error('Error updating guide workload:', error);
        res.status(500).json({ error: 'Failed to update guide workload' });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userRes = await query('SELECT email, role FROM users WHERE user_id = $1', [id]);
        if (userRes.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        
        const { email, role } = userRes[0];
        
        // Delete profiles and un-claim whitelist
        if (role === 'STUDENT') {
            await query('DELETE FROM student_profiles WHERE student_id = $1', [id]);
            await query('UPDATE student_whitelist SET is_claimed = false WHERE email = $1', [email]);
        } else {
            await query('DELETE FROM faculty_profiles WHERE faculty_id = $1', [id]);
            await query('UPDATE faculty_whitelist SET is_claimed = false WHERE email = $1', [email]);
        }
        
        await query('DELETE FROM users WHERE user_id = $1', [id]);
        
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        if (error.code === '23503') { // Postgres foreign key violation
            res.status(400).json({ error: 'Cannot delete user because they are assigned to a group or project.' });
            return;
        }
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

export const getBatchYears = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT DISTINCT batch_year FROM student_profiles WHERE batch_year IS NOT NULL ORDER BY batch_year DESC`
        );
        res.json({ years: result.map((r: any) => r.batch_year) });
    } catch (error) {
        console.error('Error fetching batch years:', error);
        res.status(500).json({ error: 'Failed to fetch batch years' });
    }
};
