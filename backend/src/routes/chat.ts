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
            `INSERT INTO chat_messages (sender_id, content, is_announcement)
             VALUES ($1, $2, TRUE) RETURNING *`,
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
            `INSERT INTO chat_messages (group_id, sender_id, content, is_announcement)
             VALUES ($1, $2, $3, FALSE) RETURNING *`,
            [groupId, userId, content]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export const chatRouter = router;
