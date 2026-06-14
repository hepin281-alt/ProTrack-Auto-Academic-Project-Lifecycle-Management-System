import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Add member to group (must have 3-4 members)
export async function addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { prn_no } = req.body;

        if (!prn_no) {
            res.status(400).json({ error: 'prn_no is required' });
            return;
        }

        // Find student by PRN
        const students = await query(
            `SELECT sp.student_id, u.email, sp.roll_no 
             FROM student_profiles sp
             JOIN users u ON sp.student_id = u.user_id
             WHERE sp.prn_no = $1`,
            [prn_no]
        );

        if (students.length === 0) {
            res.status(404).json({ error: 'Student with this PRN not found' });
            return;
        }

        const student = students[0];

        // Check if student already belongs to a group
        const existingMembership = await query(
            `SELECT group_id FROM group_members WHERE student_id = $1`,
            [student.student_id]
        );

        if (existingMembership.length > 0) {
            res.status(409).json({
                error: 'Student already belongs to another group',
                current_group_id: existingMembership[0].group_id
            });
            return;
        }

        // Get current group member count
        const memberCounts = await query(
            `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
            [group_id]
        );

        const memberCount = parseInt(memberCounts[0].count);

        if (memberCount >= 4) {
            res.status(409).json({
                error: 'Group already has maximum 4 members',
                current_count: memberCount
            });
            return;
        }

        // Add member to group
        await query(
            `INSERT INTO group_members (group_id, student_id, is_leader) 
             VALUES ($1, $2, false)`,
            [group_id, student.student_id]
        );

        res.status(201).json({
            message: 'Member added to group',
            student_id: student.student_id,
            email: student.email,
            roll_no: student.roll_no,
            is_leader: false
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
}

// Get group members
export async function getMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;

        const members = await query(
            `SELECT 
                gm.student_id,
                u.email,
                u.full_name,
                sp.prn_no,
                sp.roll_no,
                sp.batch_year,
                gm.is_leader,
                gm.created_at
             FROM group_members gm
             JOIN student_profiles sp ON gm.student_id = sp.student_id
             JOIN users u ON sp.student_id = u.user_id
             WHERE gm.group_id = $1
             ORDER BY gm.is_leader DESC, gm.created_at ASC`,
            [group_id]
        );

        res.status(200).json({
            group_id,
            total_members: members.length,
            members
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
}

// Remove member from group
export async function removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, student_id } = req.params;

        // Check if this is the last member
        const remainingMembers = await query(
            `SELECT COUNT(*) as count FROM group_members 
             WHERE group_id = $1 AND student_id != $2`,
            [group_id, student_id]
        );

        if (parseInt(remainingMembers[0].count) === 0) {
            res.status(400).json({
                error: 'Cannot remove the last member from a group'
            });
            return;
        }

        // Remove member
        const result = await query(
            `DELETE FROM group_members 
             WHERE group_id = $1 AND student_id = $2
             RETURNING student_id`,
            [group_id, student_id]
        );

        if (result.length === 0) {
            res.status(404).json({ error: 'Member not found in group' });
            return;
        }

        res.status(200).json({
            message: 'Member removed from group',
            student_id
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
}

// Set group leader
export async function setLeader(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, student_id } = req.params;

        // Remove leader status from all members
        await query(
            `UPDATE group_members SET is_leader = false WHERE group_id = $1`,
            [group_id]
        );

        // Set new leader
        const result = await query(
            `UPDATE group_members 
             SET is_leader = true 
             WHERE group_id = $1 AND student_id = $2
             RETURNING student_id, group_id`,
            [group_id, student_id]
        );

        if (result.length === 0) {
            res.status(404).json({ error: 'Member not found in group' });
            return;
        }

        res.status(200).json({
            message: 'Group leader updated',
            group_id,
            leader_id: student_id
        });
    } catch (error) {
        console.error('Set leader error:', error);
        res.status(500).json({ error: 'Failed to set group leader' });
    }
}

// Get available students (no group, same batch)
export async function getAvailableStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?.user_id;
        if (!studentId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const studentProfile = await query('SELECT batch_year FROM student_profiles WHERE student_id = $1', [studentId]);
        const batchYear = studentProfile[0]?.batch_year;

        const params: any[] = [];
        let batchFilter = '';
        if (batchYear) {
            batchFilter = 'WHERE sp.batch_year = $1';
            params.push(batchYear);
        }

        const students = await query(
            `SELECT sp.student_id, u.email, u.full_name, sp.prn_no, sp.roll_no, sp.batch_year, gm.group_id 
             FROM student_profiles sp
             JOIN users u ON sp.student_id = u.user_id
             LEFT JOIN group_members gm ON sp.student_id = gm.student_id
             ${batchFilter}
             ORDER BY sp.prn_no ASC`,
            params
        );

        res.status(200).json(students);
    } catch (error) {
        console.error('Get available students error:', error);
        res.status(500).json({ error: 'Failed to fetch available students' });
    }
}
