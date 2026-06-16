import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateRequest, authorize } from '../middleware/auth.js';

const router = Router();

// Get all announcements
router.get('/announcements', authenticateRequest, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.*, u.email as sender_email, u.role as sender_role
            FROM chat_messages c
            JOIN users u ON c.sender_id = u.user_id
            WHERE c.is_announcement = TRUE
            ORDER BY c.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Post a new global announcement (Coordinator only)
router.post('/announcements', authenticateRequest, authorize('COORDINATOR'), async (req, res) => {
    const { content } = req.body;
    const userId = (req as any).user.user_id;

    try {
        const { rows } = await pool.query(
            `WITH new_msg AS (
                INSERT INTO chat_messages (sender_id, content, is_announcement)
                VALUES ($1, $2, TRUE) RETURNING *
             )
             SELECT m.*, u.email as sender_email, u.role as sender_role
             FROM new_msg m
             JOIN users u ON m.sender_id = u.user_id`,
            [userId, content]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get messages for a specific group
router.get('/group/:groupId', authenticateRequest, async (req, res) => {
    const { groupId } = req.params;
    
    try {
        const { rows } = await pool.query(`
            SELECT c.*, u.email as sender_email, u.role as sender_role
            FROM chat_messages c
            JOIN users u ON c.sender_id = u.user_id
            WHERE c.group_id = $1 OR (c.group_id IS NULL AND c.is_announcement = TRUE)
            ORDER BY c.created_at ASC
        `, [groupId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Post a new message to a specific group
router.post('/group/:groupId', authenticateRequest, async (req, res) => {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.user_id;

    try {
        const { rows } = await pool.query(
            `WITH new_msg AS (
                INSERT INTO chat_messages (group_id, sender_id, content, is_announcement)
                VALUES ($1, $2, $3, FALSE) RETURNING *
             )
             SELECT m.*, u.email as sender_email, u.role as sender_role
             FROM new_msg m
             JOIN users u ON m.sender_id = u.user_id`,
            [groupId, userId, content]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark an announcement as read for the current user
router.patch('/announcements/:message_id/read', authenticateRequest, async (req, res) => {
    const { message_id } = req.params;
    const userId = (req as any).user.user_id;

    try {
        await pool.query(
            `INSERT INTO notification_reads (user_id, message_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, message_id]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get unread announcement count for the current user
router.get('/announcements/unread-count', authenticateRequest, async (req, res) => {
    const userId = (req as any).user.user_id;

    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*) AS count
             FROM chat_messages c
             WHERE c.is_announcement = TRUE
               AND NOT EXISTS (
                 SELECT 1 FROM notification_reads nr
                 WHERE nr.message_id = c.message_id
                   AND nr.user_id = $1
               )`,
            [userId]
        );
        res.json({ count: parseInt(rows[0].count, 10) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export const chatRouter = router;
