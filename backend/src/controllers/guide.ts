import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createGroupNotification } from '../utils/notifications.js';

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function getMeetings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const meetings = await query(
            `SELECT * FROM group_meetings WHERE group_id = $1 ORDER BY scheduled_at DESC`,
            [group_id]
        );
        res.status(200).json(meetings);
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
}

export async function createMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { title, scheduled_at, notes, attendance } = req.body;

        if (!title || !scheduled_at) {
            res.status(400).json({ error: 'title and scheduled_at are required' });
            return;
        }

        const result = await query(
            `INSERT INTO group_meetings (group_id, title, scheduled_at, notes, attendance)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [group_id, title, scheduled_at, notes || '', JSON.stringify(attendance || [])]
        );

        // Notify students
        await createGroupNotification(
            group_id,
            'MEETING',
            'New Meeting Scheduled',
            `A new meeting "${title}" has been scheduled for ${new Date(scheduled_at).toLocaleString()}`
        );

        res.status(201).json(result[0]);
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
}

export async function updateMeetingAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { meeting_id } = req.params;
        const { attendance } = req.body;

        const result = await query(
            `UPDATE group_meetings SET attendance = $1 WHERE meeting_id = $2 RETURNING *`,
            [JSON.stringify(attendance), meeting_id]
        );

        if (result.length === 0) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
}

// ─── Sign-offs ────────────────────────────────────────────────────────────────

export async function getSignoffs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const signoffs = await query(
            `SELECT * FROM group_signoffs WHERE group_id = $1 ORDER BY created_at DESC`,
            [group_id]
        );
        res.status(200).json(signoffs);
    } catch (error) {
        console.error('Get signoffs error:', error);
        res.status(500).json({ error: 'Failed to fetch signoffs' });
    }
}

export async function updateSignoff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { group_id } = req.params;
        const { document_type, status, comments } = req.body;
        const signed_by = req.user?.user_id;

        if (!document_type || !status) {
            res.status(400).json({ error: 'document_type and status are required' });
            return;
        }

        const result = await query(
            `INSERT INTO group_signoffs (group_id, document_type, status, comments, signed_by, signed_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (group_id, document_type) 
             DO UPDATE SET status = EXCLUDED.status, comments = EXCLUDED.comments, signed_by = EXCLUDED.signed_by, signed_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [group_id, document_type, status, comments, signed_by]
        );

        // Notify students
        await createGroupNotification(
            group_id,
            'SIGNOFF',
            `Document Sign-off: ${document_type.replace('_', ' ')}`,
            `Your guide has marked your document as ${status.replace('_', ' ')}`
        );

        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Update signoff error:', error);
        res.status(500).json({ error: 'Failed to update signoff' });
    }
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function broadcastAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { content } = req.body;
        const sender_id = req.user?.user_id;

        if (!content) {
            res.status(400).json({ error: 'content is required' });
            return;
        }

        // Find all active groups assigned to this guide
        const groups = await query(
            `SELECT group_id FROM project_groups WHERE guide_id = $1`,
            [sender_id]
        );

        if (groups.length === 0) {
            res.status(400).json({ error: 'No assigned groups to broadcast to' });
            return;
        }

        // Insert announcement into chat_messages for every group
        const groupIds = groups.map((g: any) => g.group_id);
        const promises = groupIds.map((groupId: string) => 
            query(
                `INSERT INTO chat_messages (group_id, sender_id, content, is_announcement)
                 VALUES ($1, $2, $3, true)`,
                [groupId, sender_id, content]
            )
        );

        await Promise.all(promises);

        res.status(201).json({ message: 'Announcement broadcasted successfully', groupCount: groupIds.length });
    } catch (error) {
        console.error('Broadcast announcement error:', error);
        res.status(500).json({ error: 'Failed to broadcast announcement' });
    }
}
