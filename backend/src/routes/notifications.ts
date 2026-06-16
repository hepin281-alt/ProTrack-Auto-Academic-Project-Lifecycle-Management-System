import express, { Response } from 'express';
import { query } from '../config/database.js';
import { authenticateRequest, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateRequest);

// Get all notifications for the current user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const result = await query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        res.status(200).json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notifications count for current user
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const result = await query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false`,
            [userId]
        );
        res.status(200).json({ count: parseInt(result[0].count) });
    } catch (error) {
        console.error('Get notifications unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications unread count' });
    }
});

// Mark a notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const notificationId = req.params.id;
        
        const result = await query(
            `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
            [notificationId, userId]
        );
        
        if (result.length === 0) {
            res.status(404).json({ error: 'Notification not found or unauthorized' });
            return;
        }
        
        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read for current user
router.post('/mark-all-read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        
        await query(
            `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
            [userId]
        );
        
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

export default router;
