import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
    rankGuidesForGroup,
    runBatchAllocation,
    fetchAvailableGuides
} from '../services/allocationEngine.js';
import { sendGuideAssignedEmail } from '../utils/emailService.js';
import { handleDbError } from '../utils/dbError.js';

// ─── GET /allocation/pending ─────────────────────────────────────────────────
export async function getPendingAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const groups = await query(
            `SELECT
                g.group_id,
                g.group_name,
                g.status,
                g.preferred_guide_id,
                COUNT(gm.student_id) as member_count,
                g.created_at,
                COALESCE(
                    (SELECT pp.domain_tags
                     FROM project_proposals pp
                     WHERE pp.group_id = g.group_id
                     ORDER BY pp.created_at DESC LIMIT 1),
                    '{}'::text[]
                ) as domain_tags
             FROM project_groups g
             LEFT JOIN group_members gm ON g.group_id = gm.group_id
             WHERE g.guide_id IS NULL AND g.status = 'WAITING_ALLOCATION'
             GROUP BY g.group_id
             ORDER BY g.created_at ASC`
        );
        res.status(200).json({ total_pending: groups.length, groups });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch pending groups', { total_pending: 0, groups: [] });
    }
}

// ─── GET /allocation/guides ──────────────────────────────────────────────────
export async function getAvailableGuides(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const guides = await fetchAvailableGuides();
        res.status(200).json({ total_available: guides.length, guides });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch available guides', { total_available: 0, guides: [] });
    }
}

// ─── GET /allocation/rank/:group_id ─────────────────────────────────────────
// Returns AI-ranked guide list for a specific group
export async function getRankedGuides(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const ranked = await rankGuidesForGroup(group_id);
        res.status(200).json({ group_id, ranked });
    } catch (error: any) {
        handleDbError(error, res, 'failed to rank guides', { group_id: req.params.group_id, ranked: [] });
    }
}

// ─── POST /allocation/assign ─────────────────────────────────────────────────
// Manual assignment (coordinator picks guide, override allowed)
export async function assignGuide(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, guide_id, notes, is_override } = req.body;
        const coordinator_id = req.user!.user_id;

        if (!group_id || !guide_id) {
            res.status(400).json({ error: 'group_id and guide_id are required' });
            return;
        }

        const groups = await query('SELECT group_id, guide_id FROM project_groups WHERE group_id = $1', [group_id]);
        if (groups.length === 0) { res.status(404).json({ error: 'Group not found' }); return; }

        const currentGuideId = groups[0].guide_id;

        // If group already has a guide and this is an override, decrement old guide's workload
        if (currentGuideId && !is_override) {
            res.status(409).json({ error: 'Group already has a guide. Set is_override=true to reassign.' }); return;
        }
        if (currentGuideId && is_override) {
            await query(
                `UPDATE faculty_profiles SET current_workload = GREATEST(current_workload - 1, 0) WHERE faculty_id = $1`,
                [currentGuideId]
            );
        }

        const guides = await query(
            'SELECT faculty_id, current_workload, max_workload FROM faculty_profiles WHERE faculty_id = $1',
            [guide_id]
        );
        if (guides.length === 0) { res.status(404).json({ error: 'Guide not found' }); return; }

        const guide = guides[0];
        if (!is_override && guide.current_workload >= guide.max_workload) {
            res.status(409).json({ error: 'Guide has reached maximum workload. Use is_override=true to force.' }); return;
        }

        // Compute score for audit log
        const ranked = await rankGuidesForGroup(group_id);
        const scored = ranked.find(g => g.faculty_id === guide_id);

        // Assign
        await query(
            `UPDATE project_groups SET guide_id = $1, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE group_id = $2`,
            [guide_id, group_id]
        );
        await query(
            `UPDATE faculty_profiles SET current_workload = current_workload + 1 WHERE faculty_id = $1`,
            [guide_id]
        );

        // Audit log
        const action = is_override ? 'MANUAL_OVERRIDE' : 'AUTO_ASSIGNED';
        await query(
            `INSERT INTO allocation_audit (group_id, guide_id, action, performed_by, score_breakdown, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                group_id,
                guide_id,
                action,
                coordinator_id,
                scored ? JSON.stringify({ final_score: scored.score, ...scored.score_breakdown }) : null,
                notes || null
            ]
        );

        const updated = await query(
            `SELECT g.group_id, g.group_name, g.guide_id, u.full_name as guide_name, u.email as guide_email, g.status
             FROM project_groups g LEFT JOIN users u ON g.guide_id = u.user_id WHERE g.group_id = $1`,
            [group_id]
        );

        // Notify students via email
        const groupStudents = await query(
            `SELECT u.email FROM group_members gm JOIN users u ON gm.student_id = u.user_id WHERE gm.group_id = $1`,
            [group_id]
        );
        const studentEmails = groupStudents.map((s: any) => s.email).filter(Boolean);
        if (studentEmails.length > 0) {
            await sendGuideAssignedEmail(studentEmails, updated[0].guide_name || 'Assigned Guide', updated[0].group_name);
        }

        res.status(200).json({ message: 'Guide assigned successfully', group: updated[0] });
    } catch (error: any) {
        handleDbError(error, res, 'failed to assign guide', {});
    }
}

// ─── DELETE /allocation/:group_id ────────────────────────────────────────────
export async function unassignGuide(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { notes } = req.body;
        const coordinator_id = req.user!.user_id;

        const groups = await query('SELECT group_id, guide_id FROM project_groups WHERE group_id = $1', [group_id]);
        if (groups.length === 0) { res.status(404).json({ error: 'Group not found' }); return; }

        const guide_id = groups[0].guide_id;
        if (guide_id === null) { res.status(400).json({ error: 'Group has no guide assigned' }); return; }

        await query(
            `UPDATE project_groups SET guide_id = NULL, status = 'WAITING_ALLOCATION', updated_at = CURRENT_TIMESTAMP WHERE group_id = $1`,
            [group_id]
        );
        await query(
            `UPDATE faculty_profiles SET current_workload = GREATEST(current_workload - 1, 0) WHERE faculty_id = $1`,
            [guide_id]
        );

        // Audit log
        await query(
            `INSERT INTO allocation_audit (group_id, guide_id, action, performed_by, notes)
             VALUES ($1, $2, 'UNASSIGNED', $3, $4)`,
            [group_id, guide_id, coordinator_id, notes || 'Guide unassigned by coordinator']
        );

        res.status(200).json({ message: 'Guide unassigned', group_id });
    } catch (error: any) {
        handleDbError(error, res, 'failed to unassign guide', {});
    }
}

// ─── POST /allocation/batch ──────────────────────────────────────────────────
// Run the full AI allocation engine on all pending groups
export async function batchAllocate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const coordinator_id = req.user!.user_id;
        const { group_ids } = req.body; // optional: limit to specific group IDs

        const results = await runBatchAllocation(coordinator_id, group_ids);
        const assigned = results.filter(r => r.status === 'ASSIGNED').length;
        const skipped = results.filter(r => r.status === 'NO_GUIDE_AVAILABLE').length;

        res.status(200).json({
            message: `Batch allocation complete. Assigned: ${assigned}, No guide available: ${skipped}`,
            results
        });
    } catch (error: any) {
        handleDbError(error, res, 'batch allocation failed', {});
    }
}

// ─── GET /allocation/audit ───────────────────────────────────────────────────
export async function getAllocationAudit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, limit = '50' } = req.query;
        let sql = `
            SELECT
                al.audit_id,
                al.action,
                al.notes,
                al.score_breakdown,
                al.created_at,
                g.group_name,
                u_guide.full_name as guide_name,
                u_guide.email as guide_email,
                u_coord.full_name as performed_by_name
            FROM allocation_audit al
            LEFT JOIN project_groups g ON al.group_id = g.group_id
            LEFT JOIN users u_guide ON al.guide_id = u_guide.user_id
            LEFT JOIN users u_coord ON al.performed_by = u_coord.user_id
        `;
        const params: any[] = [];
        if (group_id) {
            sql += ' WHERE al.group_id = $1';
            params.push(group_id);
        }
        sql += ` ORDER BY al.created_at DESC LIMIT ${parseInt(limit as string, 10)}`;

        const logs = await query(sql, params.length ? params : undefined);
        res.status(200).json({ logs });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch audit logs', { logs: [] });
    }
}

// ─── POST /allocation/set-preference ────────────────────────────────────────
// Students/coordinators record preferred guide on a group
export async function setGroupPreference(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, preferred_guide_id } = req.body;
        if (!group_id) { res.status(400).json({ error: 'group_id required' }); return; }

        await query(
            `UPDATE project_groups SET preferred_guide_id = $1, updated_at = CURRENT_TIMESTAMP WHERE group_id = $2`,
            [preferred_guide_id || null, group_id]
        );
        res.status(200).json({ message: 'Preference saved', group_id, preferred_guide_id });
    } catch (error: any) {
        handleDbError(error, res, 'failed to save preference', {});
    }
}

// ─── GET/POST /allocation/ratings ────────────────────────────────────────────
export async function submitGuideRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { guide_id, rating, comments, academic_year } = req.body;
        const coordinator_id = req.user!.user_id;
        if (!guide_id || !rating) { res.status(400).json({ error: 'guide_id and rating required' }); return; }

        await query(
            `INSERT INTO guide_ratings (guide_id, rated_by, rating, comments, academic_year)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (guide_id, rated_by, academic_year)
             DO UPDATE SET rating = $3, comments = $4`,
            [guide_id, coordinator_id, rating, comments || null, academic_year || new Date().getFullYear().toString()]
        );
        res.status(201).json({ message: 'Rating saved' });
    } catch (error: any) {
        handleDbError(error, res, 'failed to save rating', {});
    }
}

export async function getGuideRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const ratings = await query(
            `SELECT
                gr.rating_id, gr.guide_id, u.full_name as guide_name, u.email as guide_email,
                gr.rating, gr.comments, gr.academic_year, gr.created_at
             FROM guide_ratings gr
             JOIN users u ON gr.guide_id = u.user_id
             ORDER BY gr.created_at DESC`
        );
        res.status(200).json({ ratings });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch ratings', { ratings: [] });
    }
}

// ─── GET /guides/:guide_id/groups (unchanged) ───────────────────────────────
export async function getGuideGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { guide_id } = req.params;
        const groups = await query(
            `SELECT g.group_id, g.group_name, g.status, COUNT(gm.student_id) as member_count, g.created_at
             FROM project_groups g
             LEFT JOIN group_members gm ON g.group_id = gm.group_id
             WHERE g.guide_id = $1
             GROUP BY g.group_id ORDER BY g.created_at DESC`,
            [guide_id]
        );
        res.status(200).json({ guide_id, total_groups: groups.length, groups });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch guide groups', { guide_id: req.params.guide_id, total_groups: 0, groups: [] });
    }
}
