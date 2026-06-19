import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';

// Submit a new evaluation
export async function submitEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id, phase, rubric_scores, total_marks } = req.body;
        const evaluator_id = req.user?.user_id;

        if (!group_id || !phase || !rubric_scores || total_marks === undefined) {
            res.status(400).json({ error: 'group_id, phase, rubric_scores, and total_marks are required' });
            return;
        }

        const validPhases = ['REVIEW_1', 'REVIEW_2', 'REVIEW_3', 'FINAL'];
        if (!validPhases.includes(phase)) {
            res.status(400).json({ error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` });
            return;
        }

        const groups = await query('SELECT group_id FROM project_groups WHERE group_id = $1', [group_id]);
        if (groups.length === 0) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }

        const existing = await query(
            'SELECT eval_id, is_locked FROM evaluations WHERE group_id = $1 AND phase = $2',
            [group_id, phase]
        );

        if (existing.length > 0) {
            if (existing[0].is_locked) {
                res.status(403).json({ error: 'This evaluation is locked and cannot be modified. Contact the coordinator to unlock it.' });
                return;
            }
            const result = await query(
                `UPDATE evaluations 
                 SET rubric_scores = $1, total_marks = $2, evaluator_id = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE group_id = $4 AND phase = $5
                 RETURNING eval_id, group_id, phase, rubric_scores, total_marks, evaluator_id, is_locked, locked_by, locked_at, updated_at`,
                [JSON.stringify(rubric_scores), total_marks, evaluator_id, group_id, phase]
            );
            res.status(200).json({ message: 'Evaluation updated successfully', evaluation: result[0] });
            return;
        }

        const result = await query(
            `INSERT INTO evaluations (group_id, phase, rubric_scores, total_marks, evaluator_id, is_locked) 
             VALUES ($1, $2, $3, $4, $5, false)
             RETURNING eval_id, group_id, phase, rubric_scores, total_marks, evaluator_id, is_locked, locked_by, locked_at, created_at`,
            [group_id, phase, JSON.stringify(rubric_scores), total_marks, evaluator_id]
        );
        res.status(201).json({ message: 'Evaluation submitted successfully', evaluation: result[0] });
    } catch (error: any) {
        handleDbError(error, res, 'submit evaluation', {});
    }
}

// Get evaluations
export async function getEvaluations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.query;
        let sql = `
            SELECT e.eval_id, e.group_id, e.phase, e.rubric_scores, e.total_marks, 
                   e.evaluator_id, e.is_locked, e.locked_by, e.locked_at,
                   e.created_at, e.updated_at,
                   g.group_name,
                   u_eval.full_name as evaluator_name,
                   u_lock.full_name as locked_by_name
            FROM evaluations e
            JOIN project_groups g ON e.group_id = g.group_id
            LEFT JOIN users u_eval ON e.evaluator_id = u_eval.user_id
            LEFT JOIN users u_lock ON e.locked_by = u_lock.user_id
        `;
        const params: any[] = [];
        if (group_id) {
            sql += ' WHERE e.group_id = $1';
            params.push(group_id);
        }
        sql += ' ORDER BY e.created_at DESC';
        const evaluations = await query(sql, params);
        res.status(200).json(evaluations);
    } catch (error: any) {
        handleDbError(error, res, 'fetch evaluations', []);
    }
}

// Lock an evaluation (Coordinator only)
export async function lockEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { eval_id } = req.params;
        const coordinator_id = req.user?.user_id;
        if (!coordinator_id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const existing = await query('SELECT eval_id, is_locked FROM evaluations WHERE eval_id = $1', [eval_id]);
        if (existing.length === 0) {
            res.status(404).json({ error: 'Evaluation not found' });
            return;
        }
        if (existing[0].is_locked) {
            res.status(400).json({ error: 'Evaluation is already locked' });
            return;
        }
        const result = await query(
            `UPDATE evaluations SET is_locked = true, locked_by = $1, locked_at = CURRENT_TIMESTAMP
             WHERE eval_id = $2
             RETURNING eval_id, group_id, phase, is_locked, locked_by, locked_at`,
            [coordinator_id, eval_id]
        );
        res.status(200).json({ message: 'Evaluation locked successfully', evaluation: result[0] });
    } catch (error: any) {
        handleDbError(error, res, 'lock evaluation', {});
    }
}

// Unlock an evaluation (Coordinator only)
export async function unlockEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { eval_id } = req.params;
        const existing = await query('SELECT eval_id, is_locked FROM evaluations WHERE eval_id = $1', [eval_id]);
        if (existing.length === 0) {
            res.status(404).json({ error: 'Evaluation not found' });
            return;
        }
        if (!existing[0].is_locked) {
            res.status(400).json({ error: 'Evaluation is not locked' });
            return;
        }
        const result = await query(
            `UPDATE evaluations SET is_locked = false, locked_by = NULL, locked_at = NULL
             WHERE eval_id = $1
             RETURNING eval_id, group_id, phase, is_locked, locked_by, locked_at`,
            [eval_id]
        );
        res.status(200).json({ message: 'Evaluation unlocked successfully', evaluation: result[0] });
    } catch (error: any) {
        handleDbError(error, res, 'unlock evaluation', {});
    }
}

// Lock all evaluations for a specific phase (Coordinator only)
export async function lockAllEvaluationsForPhase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { phase } = req.params;
        const coordinator_id = req.user?.user_id;
        if (!coordinator_id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const validPhases = ['REVIEW_1', 'REVIEW_2', 'REVIEW_3', 'FINAL'];
        if (!validPhases.includes(phase)) {
            res.status(400).json({ error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` });
            return;
        }
        const result = await query(
            `UPDATE evaluations SET is_locked = true, locked_by = $1, locked_at = CURRENT_TIMESTAMP
             WHERE phase = $2 AND is_locked = false
             RETURNING eval_id, group_id, phase`,
            [coordinator_id, phase]
        );
        res.status(200).json({
            message: `Locked ${result.length} evaluation(s) for phase ${phase}`,
            locked_count: result.length,
            evaluations: result
        });
    } catch (error: any) {
        handleDbError(error, res, 'lock all evaluations', {});
    }
}
