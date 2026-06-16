import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Create a new group (Student role)
export async function createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_name } = req.body;
        const user_id = req.user?.user_id;

        if (!group_name) {
            res.status(400).json({ error: 'group_name is required' });
            return;
        }

        // Check if group name already exists
        const existing = await query(
            'SELECT group_id FROM project_groups WHERE group_name = $1',
            [group_name]
        );

        if (existing.length > 0) {
            res.status(409).json({ error: 'Group name already exists' });
            return;
        }

        // Create group
        const result = await query(
            `INSERT INTO project_groups (group_name, status) 
             VALUES ($1, 'FORMING') 
             RETURNING group_id, group_name, status, created_at`,
            [group_name]
        );

        const group = result[0];

        // Add creator as group leader
        await query(
            `INSERT INTO group_members (group_id, student_id, is_leader) 
             VALUES ($1, $2, true)`,
            [group.group_id, user_id]
        );

        res.status(201).json({
            group_id: group.group_id,
            group_name: group.group_name,
            status: group.status,
            created_at: group.created_at,
            message: 'Group created successfully. You are added as leader.'
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
}

// Get groups filtered by role
export async function getGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { status, batch_year } = req.query;
        const role = req.user?.role;
        const userId = req.user?.user_id;
        const params: unknown[] = [];
        let sql = '';

        if (role === 'STUDENT') {
            // Students see only groups they belong to
            sql = `
                SELECT g.group_id, g.group_name, g.status, g.guide_id,
                       u.email as guide_email,
                       COUNT(gm2.student_id) as member_count,
                       g.created_at, g.updated_at
                FROM project_groups g
                JOIN group_members gm ON gm.group_id = g.group_id AND gm.student_id = $1
                LEFT JOIN faculty_profiles f ON g.guide_id = f.faculty_id
                LEFT JOIN users u ON u.user_id = f.faculty_id
                LEFT JOIN group_members gm2 ON gm2.group_id = g.group_id
            `;
            params.push(userId);
            const conditions = [];
            if (status) { params.push(status); conditions.push(`g.status = $${params.length}`); }
            if (batch_year) {
                params.push(parseInt(batch_year as string, 10));
                conditions.push(`EXISTS (
                    SELECT 1 FROM group_members gm_sub 
                    JOIN student_profiles sp ON gm_sub.student_id = sp.student_id
                    WHERE gm_sub.group_id = g.group_id AND sp.batch_year = $${params.length}
                )`);
            }
            if (conditions.length > 0) { sql += ` WHERE ` + conditions.join(' AND '); }
            sql += ` GROUP BY g.group_id, u.email ORDER BY g.created_at DESC`;
        } else if (role === 'GUIDE') {
            // Guides see groups assigned to them
            sql = `
                SELECT g.group_id, g.group_name, g.status, g.guide_id,
                       u.email as guide_email,
                       f.max_workload,
                       COUNT(DISTINCT gm.student_id) as member_count,
                       (SELECT COUNT(*) FROM logbooks l WHERE l.group_id = g.group_id) as logbook_count,
                       (SELECT COUNT(*) FROM logbooks l WHERE l.group_id = g.group_id AND l.guide_status = 'APPROVED') as approved_logbook_count,
                       g.created_at, g.updated_at
                FROM project_groups g
                LEFT JOIN faculty_profiles f ON g.guide_id = f.faculty_id
                LEFT JOIN users u ON u.user_id = f.faculty_id
                LEFT JOIN group_members gm ON gm.group_id = g.group_id
                WHERE g.guide_id = $1
            `;
            params.push(userId);
            const conditions = [];
            if (status) { params.push(status); conditions.push(`g.status = $${params.length}`); }
            if (batch_year) {
                params.push(parseInt(batch_year as string, 10));
                conditions.push(`EXISTS (
                    SELECT 1 FROM group_members gm_sub 
                    JOIN student_profiles sp ON gm_sub.student_id = sp.student_id
                    WHERE gm_sub.group_id = g.group_id AND sp.batch_year = $${params.length}
                )`);
            }
            if (conditions.length > 0) { sql += ` AND ` + conditions.join(' AND '); }
            sql += ` GROUP BY g.group_id, u.email, f.max_workload ORDER BY g.created_at DESC`;
        } else {
            // Coordinators and Committee see all groups
            sql = `
                SELECT g.group_id, g.group_name, g.status, g.guide_id,
                       u.email as guide_email,
                       COUNT(gm.student_id) as member_count,
                       g.created_at, g.updated_at
                FROM project_groups g
                LEFT JOIN faculty_profiles f ON g.guide_id = f.faculty_id
                LEFT JOIN users u ON u.user_id = f.faculty_id
                LEFT JOIN group_members gm ON gm.group_id = g.group_id
            `;
            const conditions = [];
            if (status) { params.push(status); conditions.push(`g.status = $${params.length}`); }
            if (batch_year) {
                params.push(parseInt(batch_year as string, 10));
                conditions.push(`EXISTS (
                    SELECT 1 FROM group_members gm_sub 
                    JOIN student_profiles sp ON gm_sub.student_id = sp.student_id
                    WHERE gm_sub.group_id = g.group_id AND sp.batch_year = $${params.length}
                )`);
            }
            if (conditions.length > 0) { sql += ` WHERE ` + conditions.join(' AND '); }
            sql += ` GROUP BY g.group_id, u.email ORDER BY g.created_at DESC`;
        }

        const groups = await query(sql, params);
        res.status(200).json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
}

// Get group by ID with members and proposals
export async function getGroupById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;

        // Get group details
        const groups = await query(
            `SELECT 
                g.group_id,
                g.group_name,
                g.status,
                g.guide_id,
                g.created_at,
                g.updated_at
             FROM project_groups g
             WHERE g.group_id = $1`,
            [group_id]
        );

        if (groups.length === 0) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }

        const group = groups[0];

        // Get members
        const members = await query(
            `SELECT 
                gm.student_id,
                u.email,
                sp.prn_no,
                sp.roll_no,
                gm.is_leader
             FROM group_members gm
             JOIN student_profiles sp ON gm.student_id = sp.student_id
             JOIN users u ON sp.student_id = u.user_id
             WHERE gm.group_id = $1`,
            [group_id]
        );

        // Get proposals
        const proposals = await query(
            `SELECT 
                proposal_id,
                title,
                domain_tags,
                is_approved,
                created_at
             FROM project_proposals
             WHERE group_id = $1`,
            [group_id]
        );

        res.status(200).json({
            ...group,
            members,
            member_count: members.length,
            proposals
        });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
}

// Update group status (Coordinator/Admin only)
export async function updateGroupStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { status } = req.body;

        const validStatuses = ['FORMING', 'WAITING_TOPIC_APPROVAL', 'WAITING_ALLOCATION', 'ACTIVE'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
            return;
        }

        // Enforcement rule: Must have exactly 3 topics before locking to WAITING_TOPIC_APPROVAL
        if (status === 'WAITING_TOPIC_APPROVAL') {
            const topicCount = await query(
                `SELECT count(*) FROM project_proposals WHERE group_id = $1`,
                [group_id]
            );
            if (parseInt(topicCount[0].count) < 3) {
                res.status(400).json({
                    error: 'You must submit exactly 3 project topics (Priority 1, 2, and 3) before you can Lock & Submit the group.'
                });
                return;
            }
        }

        const result = await query(
            `UPDATE project_groups 
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE group_id = $2
             RETURNING group_id, group_name, status, updated_at`,
            [status, group_id]
        );

        if (result.length === 0) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }

        res.status(200).json({
            message: 'Group status updated',
            group: result[0]
        });
    } catch (error) {
        console.error('Update group status error:', error);
        res.status(500).json({ error: 'Failed to update group status' });
    }
}

// Note: Additional group management functions can be added here (delete, archive, etc.)
// Currently updateGroupStatus provides the main status management functionality
