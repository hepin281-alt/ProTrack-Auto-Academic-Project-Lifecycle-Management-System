import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';

// Submit logbook entry (Student role)
export async function submitLogbook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { week_number, work_summary, evidence_url } = req.body;

        if (!week_number || !work_summary) {
            res.status(400).json({ error: 'week_number and work_summary are required' });
            return;
        }

        const groups = await query('SELECT group_id FROM project_groups WHERE group_id = $1', [group_id]);
        if (groups.length === 0) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }

        const existing = await query(
            `SELECT log_id FROM logbooks WHERE group_id = $1 AND week_number = $2`,
            [group_id, week_number]
        );
        if (existing.length > 0) {
            res.status(409).json({ error: 'Logbook entry for this week already exists', log_id: existing[0].log_id });
            return;
        }

        const result = await query(
            `INSERT INTO logbooks (group_id, week_number, work_summary, evidence_url, guide_status) 
             VALUES ($1, $2, $3, $4, 'PENDING')
             RETURNING log_id, group_id, week_number, work_summary, evidence_url, guide_status, created_at`,
            [group_id, week_number, work_summary, evidence_url || null]
        );
        res.status(201).json({ message: 'Logbook entry submitted', logbook: result[0] });
    } catch (error: any) {
        handleDbError(error, res, 'submit logbook', {});
    }
}

// Get logbooks for a group
export async function getLogbooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { status } = req.query;

        let sql = `
            SELECT log_id, group_id, week_number, work_summary, evidence_url,
                   guide_status, guide_remarks, created_at, updated_at
            FROM logbooks
            WHERE group_id = $1
        `;
        const params: unknown[] = [group_id];
        if (status) {
            sql += ' AND guide_status = $2';
            params.push(status as string);
        }
        sql += ' ORDER BY week_number DESC';

        const logbooks = await query(sql, params);
        res.status(200).json({ group_id, total_logbooks: logbooks.length, logbooks });
    } catch (error: any) {
        handleDbError(error, res, 'fetch logbooks', { group_id: req.params.group_id, total_logbooks: 0, logbooks: [] });
    }
}

// Get single logbook
export async function getLogbookById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { log_id } = req.params;
        const logbooks = await query(
            `SELECT log_id, group_id, week_number, work_summary, evidence_url,
                    guide_status, guide_remarks, created_at, updated_at
             FROM logbooks WHERE log_id = $1`,
            [log_id]
        );
        if (logbooks.length === 0) {
            res.status(404).json({ error: 'Logbook not found' });
            return;
        }
        res.status(200).json(logbooks[0]);
    } catch (error: any) {
        handleDbError(error, res, 'fetch logbook', {});
    }
}

// Approve/Reject logbook (Guide role)
export async function approveLogbook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { log_id } = req.params;
        const { guide_status, guide_remarks } = req.body;

        const validStatuses = ['APPROVED', 'NEEDS_REVISION'];
        if (!validStatuses.includes(guide_status)) {
            res.status(400).json({ error: `Invalid status. Must be: ${validStatuses.join(' or ')}` });
            return;
        }

        const logbooks = await query('SELECT guide_status FROM logbooks WHERE log_id = $1', [log_id]);
        if (logbooks.length === 0) {
            res.status(404).json({ error: 'Logbook not found' });
            return;
        }
        if (logbooks[0].guide_status === 'APPROVED') {
            res.status(409).json({ error: 'Logbook is already approved and locked. Cannot modify.' });
            return;
        }

        const result = await query(
            `UPDATE logbooks 
             SET guide_status = $1, guide_remarks = $2, updated_at = CURRENT_TIMESTAMP
             WHERE log_id = $3
             RETURNING log_id, group_id, week_number, guide_status, guide_remarks, updated_at`,
            [guide_status, guide_remarks || null, log_id]
        );
        res.status(200).json({
            message: `Logbook ${guide_status === 'APPROVED' ? 'approved and locked' : 'marked for revision'}`,
            logbook: result[0]
        });
    } catch (error: any) {
        handleDbError(error, res, 'approve logbook', {});
    }
}

// Update logbook (Student role - only if not approved)
export async function updateLogbook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { log_id } = req.params;
        const { work_summary, evidence_url } = req.body;

        const logbooks = await query('SELECT guide_status FROM logbooks WHERE log_id = $1', [log_id]);
        if (logbooks.length === 0) {
            res.status(404).json({ error: 'Logbook not found' });
            return;
        }
        if (logbooks[0].guide_status === 'APPROVED') {
            res.status(409).json({ error: 'Logbook is approved and locked. Cannot modify.' });
            return;
        }

        const updates: string[] = [];
        let paramCount = 1;
        if (work_summary) { updates.push(`work_summary = $${paramCount}`); paramCount++; }
        if (evidence_url) { updates.push(`evidence_url = $${paramCount}`); paramCount++; }
        if (updates.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        let sql = `UPDATE logbooks SET ${updates.join(', ')} WHERE log_id = $${paramCount}`;
        sql += ` RETURNING log_id, work_summary, evidence_url, updated_at`;

        const params: unknown[] = [];
        if (work_summary) params.push(work_summary);
        if (evidence_url) params.push(evidence_url);
        params.push(log_id);

        const result = await query(sql, params);
        res.status(200).json({ message: 'Logbook updated', logbook: result[0] });
    } catch (error: any) {
        handleDbError(error, res, 'update logbook', {});
    }
}

export const bulkApproveLogbooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { logbook_ids } = req.body as any;
        if (!Array.isArray(logbook_ids) || logbook_ids.length === 0) {
            res.status(400).json({ error: 'logbook_ids array is required' });
            return;
        }
        const result = await query(
            `UPDATE logbooks SET guide_status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
             WHERE log_id = ANY($1) RETURNING *`,
            [logbook_ids]
        );
        res.json({ message: 'Logbooks approved successfully', count: result.length });
    } catch (error: any) {
        handleDbError(error, res, 'bulk approve logbooks', {});
    }
};
