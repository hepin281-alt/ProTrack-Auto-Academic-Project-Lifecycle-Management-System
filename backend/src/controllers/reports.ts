/**
 * Reports Controller — server-side PDF generation
 *
 * GET /api/reports/marksheet/:group_id  → marksheet PDF
 * GET /api/reports/batch                → batch summary PDF  (COORDINATOR)
 * GET /api/reports/compliance           → compliance report  (COORDINATOR)
 */

import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';
import {
    generateMarksheet,
    generateBatchReport,
    generateComplianceReport,
    GroupData,
    EvaluationRecord,
    BatchGroupData,
    ComplianceData,
} from '../utils/pdfGenerator.js';

// ── helper: pipe Buffer → HTTP response as PDF download ──────────────────────
function sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
    });
    res.end(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/reports/marksheet/:group_id
// ─────────────────────────────────────────────────────────────────────────────
export async function getMarksheet(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { group_id } = req.params;
    try {
        // Group + guide
        const groupRows = await query(
            `SELECT g.group_id, g.group_name, g.status,
                    u.full_name AS guide_name, u.email AS guide_email,
                    COALESCE(sp_batch.batch_year, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS batch_year
             FROM project_groups g
             LEFT JOIN faculty_profiles fp ON fp.faculty_id = g.guide_id
             LEFT JOIN users u             ON u.user_id = fp.faculty_id
             LEFT JOIN LATERAL (
                 SELECT sp.batch_year FROM group_members gm
                 JOIN student_profiles sp ON sp.student_id = gm.student_id
                 WHERE gm.group_id = g.group_id LIMIT 1
             ) sp_batch ON true
             WHERE g.group_id = $1`, [group_id]
        );
        if (groupRows.length === 0) {
            res.status(404).json({ error: 'Group not found' });
            return;
        }
        const grp = groupRows[0];

        // Members
        const memberRows = await query(
            `SELECT u.full_name, sp.prn_no, sp.roll_no, u.email
             FROM group_members gm
             JOIN student_profiles sp ON sp.student_id = gm.student_id
             JOIN users u             ON u.user_id = sp.student_id
             WHERE gm.group_id = $1
             ORDER BY sp.roll_no ASC`, [group_id]
        );

        // Evaluations (no evaluated_by FK in schema — label from phase)
        const evalRows = await query(
            `SELECT e.phase, e.total_marks, e.rubric_scores, e.created_at
             FROM evaluations e
             WHERE e.group_id = $1
             ORDER BY e.created_at ASC`, [group_id]
        );

        const groupData: GroupData = {
            group_id:   grp.group_id,
            group_name: grp.group_name,
            guide_name: grp.guide_name  || 'Not Assigned',
            guide_email:grp.guide_email || '',
            batch_year: Number(grp.batch_year),
            members:    memberRows,
        };

        const evaluations: EvaluationRecord[] = evalRows.map(e => ({
            phase:         e.phase,
            total_marks:   Number(e.total_marks),
            rubric_scores: e.rubric_scores ?? {},
            created_at:    e.created_at,
        }));

        const buf = await generateMarksheet(groupData, evaluations);
        const filename = `protrack_marksheet_${group_id.slice(0, 8)}.pdf`;
        sendPdf(res, buf, filename);
    } catch (error: any) {
        handleDbError(error, res, 'generate marksheet', {});
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/reports/batch?year=2024
// ─────────────────────────────────────────────────────────────────────────────
export async function getBatchReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
    try {
        const rows = await query(
            `SELECT
                g.group_name,
                COALESCE(u.full_name, 'TBD') AS guide_name,
                COUNT(DISTINCT gm.student_id)::int AS member_count,
                MAX(CASE WHEN e.phase = 'REVIEW_1' THEN e.total_marks END) AS review1_marks,
                MAX(CASE WHEN e.phase = 'REVIEW_2' THEN e.total_marks END) AS review2_marks,
                MAX(CASE WHEN e.phase = 'REVIEW_3' THEN e.total_marks END) AS review3_marks,
                MAX(CASE WHEN e.phase = 'FINAL'    THEN e.total_marks END) AS final_marks,
                COALESCE(AVG(e.total_marks), 0)                            AS total_marks
             FROM project_groups g
             LEFT JOIN group_members gm     ON gm.group_id = g.group_id
             LEFT JOIN student_profiles sp  ON sp.student_id = gm.student_id AND sp.batch_year = $1
             LEFT JOIN faculty_profiles fp  ON fp.faculty_id = g.guide_id
             LEFT JOIN users u              ON u.user_id = fp.faculty_id
             LEFT JOIN evaluations e        ON e.group_id = g.group_id
             WHERE g.status = 'ACTIVE'
               AND EXISTS (
                   SELECT 1 FROM group_members gm2
                   JOIN student_profiles sp2 ON sp2.student_id = gm2.student_id
                   WHERE gm2.group_id = g.group_id AND sp2.batch_year = $1
               )
             GROUP BY g.group_id, g.group_name, u.full_name
             ORDER BY total_marks DESC`, [year]
        );

        const groups: BatchGroupData[] = rows.map(r => ({
            group_name:    r.group_name,
            guide_name:    r.guide_name,
            member_count:  r.member_count,
            review1_marks: r.review1_marks != null ? Number(r.review1_marks) : null,
            review2_marks: r.review2_marks != null ? Number(r.review2_marks) : null,
            review3_marks: r.review3_marks != null ? Number(r.review3_marks) : null,
            final_marks:   r.final_marks   != null ? Number(r.final_marks)   : null,
            total_marks:   Number(r.total_marks),
        }));

        const buf = await generateBatchReport(groups, year);
        sendPdf(res, buf, `protrack_batch_report_${year}.pdf`);
    } catch (error: any) {
        handleDbError(error, res, 'generate batch report', {});
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/reports/compliance?year=2024
// ─────────────────────────────────────────────────────────────────────────────
export async function getComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
    try {
        const rows = await query(
            `SELECT
                g.group_name,
                COALESCE(u.full_name, 'TBD') AS guide_name,
                u.email                        AS guide_email,
                COUNT(DISTINCT l.week_number)::int            AS weeks_active,
                COUNT(l.log_id)::int                          AS logbooks_submitted,
                SUM(CASE WHEN l.guide_status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approved_count,
                CASE
                    WHEN COUNT(l.log_id) = 0 THEN 0
                    ELSE ROUND(
                        (SUM(CASE WHEN l.guide_status = 'APPROVED' THEN 1 ELSE 0 END)::numeric
                         / COUNT(l.log_id)) * 100, 1
                    )
                END AS compliance_rate
             FROM project_groups g
             LEFT JOIN group_members gm    ON gm.group_id = g.group_id
             LEFT JOIN student_profiles sp ON sp.student_id = gm.student_id AND sp.batch_year = $1
             LEFT JOIN faculty_profiles fp ON fp.faculty_id = g.guide_id
             LEFT JOIN users u             ON u.user_id = fp.faculty_id
             LEFT JOIN logbooks l          ON l.group_id = g.group_id
             WHERE g.status = 'ACTIVE'
               AND EXISTS (
                   SELECT 1 FROM group_members gm2
                   JOIN student_profiles sp2 ON sp2.student_id = gm2.student_id
                   WHERE gm2.group_id = g.group_id AND sp2.batch_year = $1
               )
             GROUP BY g.group_id, g.group_name, u.full_name, u.email
             ORDER BY compliance_rate ASC`, [year]
        );

        const records: ComplianceData[] = rows.map(r => ({
            group_name:          r.group_name,
            guide_name:          r.guide_name,
            guide_email:         r.guide_email || '',
            weeks_active:        r.weeks_active,
            logbooks_submitted:  r.logbooks_submitted,
            compliance_rate:     Number(r.compliance_rate),
            status:
                Number(r.compliance_rate) >= 80 ? 'on_track'
                : Number(r.compliance_rate) >= 60 ? 'warning'
                : 'at_risk',
        }));

        const buf = await generateComplianceReport(records, year);
        sendPdf(res, buf, `protrack_compliance_${year}.pdf`);
    } catch (error: any) {
        handleDbError(error, res, 'generate compliance report', {});
    }
}
