import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';

export const getGuideAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const guide_id = req.user?.user_id;
        if (!guide_id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const result = await query(
            `SELECT 
                g.group_id, g.group_name, g.status,
                COUNT(DISTINCT m.student_id) as member_count,
                COUNT(DISTINCT l.log_id) as logbook_count,
                COUNT(DISTINCT t.task_id) as task_count,
                ROUND(AVG(COALESCE(pe.score, 0))::numeric, 2) as avg_peer_score
             FROM project_groups g
             LEFT JOIN group_members m ON g.group_id = m.group_id
             LEFT JOIN logbooks l ON g.group_id = l.group_id
             LEFT JOIN group_tasks t ON g.group_id = t.group_id
             LEFT JOIN peer_evaluations pe ON g.group_id = pe.group_id
             WHERE g.guide_id = $1
             GROUP BY g.group_id, g.group_name, g.status`,
            [guide_id]
        );
        res.json(result);
    } catch (error: any) {
        handleDbError(error, res, 'fetch guide analytics', []);
    }
};

// Get logbook compliance for all active groups
export const getLogbookCompliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const groups = await query(
            `SELECT 
                g.group_id,
                g.group_name,
                g.created_at,
                g.updated_at,
                u.email as guide_email,
                COUNT(DISTINCT l.log_id) as logbooks_submitted
             FROM project_groups g
             LEFT JOIN faculty_profiles fp ON g.guide_id = fp.faculty_id
             LEFT JOIN users u ON fp.faculty_id = u.user_id
             LEFT JOIN logbooks l ON g.group_id = l.group_id
             WHERE g.status = 'ACTIVE'
             GROUP BY g.group_id, g.group_name, g.created_at, g.updated_at, u.email
             ORDER BY g.group_name ASC`
        );

        const complianceData = await Promise.all(groups.map(async (group: any) => {
            const activeDate = new Date(group.updated_at);
            const now = new Date();
            const weeksActive = Math.max(1, Math.ceil((now.getTime() - activeDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
            const logbooksSubmitted = parseInt(group.logbooks_submitted) || 0;
            const complianceRate = Math.min(100, Math.round((logbooksSubmitted / weeksActive) * 100));

            const recentLogbooks = await query(
                `SELECT created_at FROM logbooks WHERE group_id = $1 ORDER BY created_at DESC LIMIT 5`,
                [group.group_id]
            );

            let consecutiveMissed = 0;
            if (recentLogbooks.length === 0) {
                consecutiveMissed = weeksActive;
            } else {
                const lastLogbookDate = new Date(recentLogbooks[0].created_at);
                const daysSinceLastLogbook = Math.floor((now.getTime() - lastLogbookDate.getTime()) / (1000 * 60 * 60 * 24));
                consecutiveMissed = Math.floor(daysSinceLastLogbook / 7);
            }

            let status: 'on_track' | 'warning' | 'at_risk';
            if (consecutiveMissed >= 2) status = 'at_risk';
            else if (complianceRate < 70) status = 'warning';
            else status = 'on_track';

            return {
                group_id: group.group_id,
                group_name: group.group_name,
                guide_email: group.guide_email || 'Not Assigned',
                weeks_active: weeksActive,
                logbooks_submitted: logbooksSubmitted,
                compliance_rate: complianceRate,
                consecutive_missed: consecutiveMissed,
                status
            };
        }));

        const avgCompliance = complianceData.length > 0
            ? Math.round(complianceData.reduce((sum, g) => sum + g.compliance_rate, 0) / complianceData.length)
            : 0;

        res.status(200).json({
            compliance: complianceData,
            summary: {
                total_groups: complianceData.length,
                average_compliance: avgCompliance,
                at_risk_count: complianceData.filter(g => g.status === 'at_risk').length,
                warning_count: complianceData.filter(g => g.status === 'warning').length,
                on_track_count: complianceData.filter(g => g.status === 'on_track').length
            }
        });
    } catch (error: any) {
        handleDbError(error, res, 'fetch logbook compliance', { compliance: [], summary: {} });
    }
};

// Export logbook compliance as CSV
export const exportLogbookCompliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const groups = await query(
            `SELECT 
                g.group_id, g.group_name, g.created_at, g.updated_at,
                u.email as guide_email,
                COUNT(DISTINCT l.log_id) as logbooks_submitted
             FROM project_groups g
             LEFT JOIN faculty_profiles fp ON g.guide_id = fp.faculty_id
             LEFT JOIN users u ON fp.faculty_id = u.user_id
             LEFT JOIN logbooks l ON g.group_id = l.group_id
             WHERE g.status = 'ACTIVE'
             GROUP BY g.group_id, g.group_name, g.created_at, g.updated_at, u.email
             ORDER BY g.group_name ASC`
        );

        const complianceData = await Promise.all(groups.map(async (group: any) => {
            const activeDate = new Date(group.updated_at);
            const now = new Date();
            const weeksActive = Math.max(1, Math.ceil((now.getTime() - activeDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
            const logbooksSubmitted = parseInt(group.logbooks_submitted) || 0;
            const complianceRate = Math.min(100, Math.round((logbooksSubmitted / weeksActive) * 100));

            const recentLogbooks = await query(
                `SELECT created_at FROM logbooks WHERE group_id = $1 ORDER BY created_at DESC LIMIT 5`,
                [group.group_id]
            );

            let consecutiveMissed = 0;
            if (recentLogbooks.length === 0) {
                consecutiveMissed = weeksActive;
            } else {
                const lastLogbookDate = new Date(recentLogbooks[0].created_at);
                const daysSinceLastLogbook = Math.floor((now.getTime() - lastLogbookDate.getTime()) / (1000 * 60 * 60 * 24));
                consecutiveMissed = Math.floor(daysSinceLastLogbook / 7);
            }

            let status: 'on_track' | 'warning' | 'at_risk';
            if (consecutiveMissed >= 2) status = 'at_risk';
            else if (complianceRate < 70) status = 'warning';
            else status = 'on_track';

            return {
                group_name: group.group_name,
                guide_email: group.guide_email || 'Not Assigned',
                weeks_active: weeksActive,
                logbooks_submitted: logbooksSubmitted,
                compliance_rate: complianceRate,
                status: status.replace('_', ' ').toUpperCase()
            };
        }));

        const headers = ['Group Name', 'Guide', 'Weeks Active', 'Submitted', 'Compliance %', 'Status'];
        const csvRows = [
            headers.join(','),
            ...complianceData.map(row => [
                `"${row.group_name}"`,
                `"${row.guide_email}"`,
                row.weeks_active,
                row.logbooks_submitted,
                row.compliance_rate,
                row.status
            ].join(','))
        ];

        const csv = csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="logbook_compliance_${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csv);
    } catch (error: any) {
        handleDbError(error, res, 'export logbook compliance', []);
    }
};

// Get system-wide stats
export const getSystemStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const studentCount = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'`);
        const groupStats = await query(`
            SELECT 
                COUNT(*) as total_groups,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_groups,
                SUM(CASE WHEN status = 'WAITING_ALLOCATION' THEN 1 ELSE 0 END) as unassigned_groups
            FROM project_groups
        `);
        res.status(200).json({
            total_students: parseInt(studentCount[0].count),
            total_groups: parseInt(groupStats[0].total_groups || '0'),
            active_groups: parseInt(groupStats[0].active_groups || '0'),
            unassigned_groups: parseInt(groupStats[0].unassigned_groups || '0')
        });
    } catch (error: any) {
        handleDbError(error, res, 'fetch system stats', {
            total_students: 0, total_groups: 0, active_groups: 0, unassigned_groups: 0
        });
    }
};
