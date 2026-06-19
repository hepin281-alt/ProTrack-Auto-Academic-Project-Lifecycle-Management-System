/**
 * SPPU-style Topic Approval Controller
 *
 * Stages: PENDING → GUIDE → COMMITTEE → COORDINATOR → APPROVED/REJECTED
 *
 * Priority Cascade: If P1 rejected at any stage, P2 becomes active. Then P3.
 * If P3 also rejected, group must resubmit.
 */

import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendTopicApprovalEmail } from '../utils/emailService.js';
import { handleDbError } from '../utils/dbError.js';

// ─── Types ───────────────────────────────────────────────────────────────────

const STAGE_FLOW: Record<string, { next: string }> = {
    PENDING: { next: 'APPROVED' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getProposalWithHistory(proposalId: string) {
    const proposals = await query(
        `SELECT p.*, u.full_name as group_name,
                g.group_name as grp_name
         FROM project_proposals p
         JOIN project_groups g ON p.group_id = g.group_id
         LEFT JOIN users u ON u.user_id IS NULL
         WHERE p.proposal_id = $1`, [proposalId]
    );
    if (proposals.length === 0) return null;
    const history = await query(
        `SELECT ta.*, u.full_name as decided_by_name, u.email as decided_by_email, u.role as decided_by_role
         FROM topic_approvals ta
         LEFT JOIN users u ON ta.decided_by = u.user_id
         WHERE ta.proposal_id = $1
         ORDER BY ta.created_at ASC`, [proposalId]
    );
    return { ...proposals[0], history };
}

// Cascade logic removed because Coordinator reviews all 3 topics and selects one.

// ─── Student Endpoints ───────────────────────────────────────────────────────

// POST /api/topics/:group_id — Submit P1, P2, P3 in one call
export async function submitTopics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { topics } = req.body;
        // topics = [{ priority: 1, title, abstract, objectives, domain_tags, technology_stack },...]

        if (!Array.isArray(topics) || topics.length === 0 || topics.length > 3) {
            res.status(400).json({ error: 'Provide 1–3 topics with priorities 1, 2, 3' });
            return;
        }

        // Validate group exists
        const groups = await query('SELECT group_id, status FROM project_groups WHERE group_id = $1', [group_id]);
        if (groups.length === 0) { res.status(404).json({ error: 'Group not found' }); return; }

        const results = [];

        for (const topic of topics) {
            const { priority, title, abstract, objectives, domain_tags, technology_stack } = topic;
            if (![1, 2, 3].includes(priority) || !title?.trim()) {
                res.status(400).json({ error: `Topic ${priority}: priority must be 1–3 and title is required` });
                return;
            }

            const tags = Array.isArray(domain_tags)
                ? domain_tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean)
                : [];
            const stack = Array.isArray(technology_stack)
                ? technology_stack.map((t: string) => t.trim()).filter(Boolean)
                : [];

            // Upsert: if already submitted, update it (only if still PENDING)
            const existing = await query(
                `SELECT proposal_id, approval_stage FROM project_proposals
                 WHERE group_id = $1 AND priority = $2`, [group_id, priority]
            );

            if (existing.length > 0) {
                if (!['PENDING', 'GUIDE_REJECTED', 'COMMITTEE_REJECTED', 'COORDINATOR_REJECTED'].includes(existing[0].approval_stage)) {
                    res.status(409).json({ error: `Priority ${priority} is already in review and cannot be edited` });
                    return;
                }
                const updated = await query(
                    `UPDATE project_proposals
                     SET title=$1, abstract=$2, objectives=$3, domain_tags=$4, technology_stack=$5,
                         approval_stage='PENDING', status='PENDING', is_approved=false, updated_at=CURRENT_TIMESTAMP
                     WHERE proposal_id=$6
                     RETURNING *`,
                    [title.trim(), abstract || null, objectives || null, tags, stack, existing[0].proposal_id]
                );
                results.push(updated[0]);
            } else {
                const inserted = await query(
                    `INSERT INTO project_proposals
                        (group_id, title, abstract, objectives, domain_tags, technology_stack, priority, approval_stage, status, is_approved)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING','PENDING',false)
                     RETURNING *`,
                    [group_id, title.trim(), abstract || null, objectives || null, tags, stack, priority]
                );
                results.push(inserted[0]);
            }
        }

        res.status(201).json({ message: 'Topics submitted', proposals: results });
    } catch (error: any) {
        handleDbError(error, res, 'failed to submit topics', {});
    }
}

// GET /api/topics/:group_id — Get all proposals for a group with full history
export async function getGroupTopics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;

        const proposals = await query(
            `SELECT p.*,
                    g.group_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'approval_id', ta.approval_id,
                                'stage', ta.stage,
                                'decision', ta.decision,
                                'comments', ta.comments,
                                'rejection_reason', ta.rejection_reason,
                                'plagiarism_score', ta.plagiarism_score,
                                'decided_by_name', u.full_name,
                                'decided_by_email', u.email,
                                'decided_by_role', u.role,
                                'created_at', ta.created_at
                            ) ORDER BY ta.created_at ASC
                        ) FILTER (WHERE ta.approval_id IS NOT NULL),
                        '[]'
                    ) as history
             FROM project_proposals p
             JOIN project_groups g ON p.group_id = g.group_id
             LEFT JOIN topic_approvals ta ON ta.proposal_id = p.proposal_id
             LEFT JOIN users u ON ta.decided_by = u.user_id
             WHERE p.group_id = $1
             GROUP BY p.proposal_id, g.group_name
             ORDER BY p.priority ASC`,
            [group_id]
        );

        res.status(200).json({ group_id, proposals });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch topics', { total: 0, proposals: [] });
    }
}

// GET /api/topics/pending/:stage — Get all proposals awaiting a specific stage
export async function getPendingForStage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { stage } = req.params; // 'COORDINATOR'

        if (stage.toUpperCase() !== 'COORDINATOR') {
            res.status(403).json({ error: 'Only Coordinator can review topics.' });
            return;
        }

        const filterStage = 'PENDING';

        let sql = `
            SELECT p.*,
                   g.group_name,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'stage', ta.stage, 'decision', ta.decision,
                               'comments', ta.comments, 'rejection_reason', ta.rejection_reason,
                               'decided_by_name', u2.full_name, 'created_at', ta.created_at
                           ) ORDER BY ta.created_at ASC
                       ) FILTER (WHERE ta.approval_id IS NOT NULL),
                       '[]'
                   ) as history
            FROM project_proposals p
            JOIN project_groups g ON p.group_id = g.group_id
            LEFT JOIN topic_approvals ta ON ta.proposal_id = p.proposal_id
            LEFT JOIN users u2 ON ta.decided_by = u2.user_id
        `;

        const params: any[] = [filterStage];
        sql += ` WHERE p.approval_stage = $1`;

        sql += ` GROUP BY p.proposal_id, g.group_name ORDER BY p.priority ASC, p.created_at ASC`;

        const proposals = await query(sql, params);
        res.status(200).json({ stage, total: proposals.length, proposals });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch pending topics', []);
    }
}

// POST /api/topics/review — Approve or reject a proposal at the current stage
export async function reviewTopic(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { proposal_id, decision, comments, rejection_reason, run_plagiarism } = req.body;
        const reviewer = req.user!;

        if (!proposal_id || !decision) {
            res.status(400).json({ error: 'proposal_id and decision (APPROVED|REJECTED) required' });
            return;
        }
        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
            return;
        }

        // Load proposal
        const proposals = await query(
            `SELECT p.*, g.guide_id FROM project_proposals p
             JOIN project_groups g ON p.group_id = g.group_id
             WHERE p.proposal_id = $1`, [proposal_id]
        );
        if (proposals.length === 0) { res.status(404).json({ error: 'Proposal not found' }); return; }

        const proposal = proposals[0];
        const currentStage = proposal.approval_stage;

        // Validate reviewer role matches expected stage
        if (reviewer.role !== 'COORDINATOR') {
            res.status(403).json({ error: `Only the Coordinator can review and approve topics.` });
            return;
        }

        // Run plagiarism simulation if requested
        let plagiarismScore: number | null = null;
        if (run_plagiarism) {
            plagiarismScore = Math.floor(Math.random() * 35); // simulated
            await query(
                `UPDATE project_proposals SET plagiarism_score = $1 WHERE proposal_id = $2`,
                [plagiarismScore, proposal_id]
            );
        }

        // Determine new stage
        const newStage = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
        const stageLabel = 'COORDINATOR';

        // Update proposal stage
        await query(
            `UPDATE project_proposals
             SET approval_stage = $1, status = $1, is_approved = $2, updated_at = CURRENT_TIMESTAMP
             WHERE proposal_id = $3`,
            [newStage, decision === 'APPROVED', proposal_id]
        );

        // Log decision in topic_approvals
        await query(
            `INSERT INTO topic_approvals (proposal_id, stage, decision, decided_by, comments, rejection_reason, plagiarism_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [proposal_id, stageLabel, decision, reviewer.user_id, comments || null, rejection_reason || null, plagiarismScore]
        );

        // If APPROVED, update group status to WAITING_ALLOCATION and reject other topics
        if (decision === 'APPROVED') {
            await query(
                `UPDATE project_groups SET status = 'WAITING_ALLOCATION', updated_at = CURRENT_TIMESTAMP WHERE group_id = $1`,
                [proposal.group_id]
            );
            await query(
                `UPDATE project_proposals SET approval_stage = 'REJECTED', is_approved = false, updated_at = CURRENT_TIMESTAMP WHERE group_id = $1 AND proposal_id != $2`,
                [proposal.group_id, proposal_id]
            );
        }

        // Get full updated proposal with history
        const updatedProposal = await getProposalWithHistory(proposal_id);

        // Fetch student emails to send notification
        const studentEmailsRes = await query(
            `SELECT u.email FROM group_members gm
             JOIN users u ON gm.student_id = u.user_id
             WHERE gm.group_id = $1`,
            [proposal.group_id]
        );
        const studentEmails = studentEmailsRes.map((r: any) => r.email).filter(Boolean);
        const groupName = updatedProposal?.grp_name || 'Your Group';
        
        sendTopicApprovalEmail(studentEmails, groupName, proposal.title, decision as 'APPROVED'|'REJECTED', comments).catch(e => console.error("Email failed:", e));

        res.status(200).json({
            message: `Topic ${decision.toLowerCase()} at ${stageLabel} stage`,
            proposal: updatedProposal,
            new_stage: newStage
        });
    } catch (error: any) {
        handleDbError(error, res, 'failed to process review', {});
    }
}

// GET /api/topics/compare?group_ids=a,b,c — Compare topics across groups for plagiarism
export async function compareTopics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { title_search, stage } = req.query;

        let sql = `
            SELECT p.proposal_id, p.title, p.domain_tags, p.technology_stack, p.priority, p.approval_stage,
                   g.group_name, g.group_id,
                   SIMILARITY(p.title, $1) as title_similarity
            FROM project_proposals p
            JOIN project_groups g ON p.group_id = g.group_id
            WHERE p.title IS NOT NULL
        `;
        const params: any[] = [title_search || ''];

        if (stage) {
            sql += ` AND p.approval_stage = $2`;
            params.push(stage);
        }

        sql += ` ORDER BY title_similarity DESC LIMIT 20`;

        // Enable pg_trgm for similarity if available, fallback to LIKE
        let results: any[] = [];
        try {
            results = await query(sql, params);
        } catch {
            // Fallback without similarity if pg_trgm not installed
            results = await query(
                `SELECT p.proposal_id, p.title, p.domain_tags, p.technology_stack, p.priority, p.approval_stage,
                        g.group_name, g.group_id
                 FROM project_proposals p
                 JOIN project_groups g ON p.group_id = g.group_id
                 WHERE LOWER(p.title) LIKE LOWER($1)
                 ORDER BY p.created_at DESC LIMIT 20`,
                [`%${title_search || ''}%`]
            );
        }

        res.status(200).json({ results, count: results.length });
    } catch (error: any) {
        handleDbError(error, res, 'failed to compare topics', { results: [], count: 0 });
    }
}

// GET /api/topics/all — All proposals across all groups (Coordinator overview)
export async function getAllTopics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { stage, group_id } = req.query;

        let sql = `
            SELECT p.*,
                   g.group_name,
                   COUNT(gm.student_id)::int as member_count,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'stage', ta.stage, 'decision', ta.decision,
                               'decided_by_name', u2.full_name, 'comments', ta.comments,
                               'rejection_reason', ta.rejection_reason,
                               'created_at', ta.created_at
                           ) ORDER BY ta.created_at ASC
                       ) FILTER (WHERE ta.approval_id IS NOT NULL),
                       '[]'
                   ) as history
            FROM project_proposals p
            JOIN project_groups g ON p.group_id = g.group_id
            LEFT JOIN group_members gm ON gm.group_id = g.group_id
            LEFT JOIN topic_approvals ta ON ta.proposal_id = p.proposal_id
            LEFT JOIN users u2 ON ta.decided_by = u2.user_id
        `;

        const params: any[] = [];
        const conditions: string[] = [];
        if (stage) { conditions.push(`p.approval_stage = $${params.length + 1}`); params.push(stage); }
        if (group_id) { conditions.push(`p.group_id = $${params.length + 1}`); params.push(group_id); }

        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ` GROUP BY p.proposal_id, g.group_name ORDER BY p.priority ASC, p.created_at DESC`;

        const proposals = await query(sql, params.length ? params : undefined);
        res.status(200).json({ total: proposals.length, proposals });
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch topics', { total: 0, proposals: [] });
    }
}
