import express, { Response } from 'express';
import { query } from '../config/database.js';
import { authenticateRequest, AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';

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
    } catch (error: any) {
        handleDbError(error, res, 'fetch notifications', []);
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
    } catch (error: any) {
        handleDbError(error, res, 'fetch notifications unread count', { count: 0 });
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
    } catch (error: any) {
        handleDbError(error, res, 'mark notification as read', {});
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
    } catch (error: any) {
        handleDbError(error, res, 'mark all notifications as read', {});
    }
});

export default router;
