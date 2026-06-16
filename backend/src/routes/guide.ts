import { Router } from 'express';
import * as guideController from '../controllers/guide.js';
import { authenticateRequest, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and GUIDE role
router.use(authenticateRequest);
router.use(authorize('GUIDE'));

// Meetings
router.get('/groups/:group_id/meetings', guideController.getMeetings);
router.post('/groups/:group_id/meetings', guideController.createMeeting);
router.put('/groups/:group_id/meetings/:meeting_id/attendance', guideController.updateMeetingAttendance);

// Sign-offs
router.get('/groups/:group_id/signoffs', guideController.getSignoffs);
router.post('/groups/:group_id/signoffs', guideController.updateSignoff);

// Announcements
router.post('/announcements', guideController.broadcastAnnouncement);

export default router;
