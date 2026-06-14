import { Router } from 'express';
import { authenticateRequest, authorize } from '../middleware/auth.js';
import {
    submitTopics,
    getGroupTopics,
    getPendingForStage,
    reviewTopic,
    compareTopics,
    getAllTopics,
} from '../controllers/topicApproval.js';

const router = Router();
router.use(authenticateRequest);

// Review (approve / reject)
router.post('/review', authorize('GUIDE', 'COMMITTEE', 'COORDINATOR'), reviewTopic);

// Student: submit P1/P2/P3 for their group
router.post('/:group_id', authorize('STUDENT'), submitTopics);

// All roles: read proposals for a specific group
router.get('/group/:group_id', getGroupTopics);

// Stage-specific pending queue — Coordinator only
router.get('/pending/COORDINATOR',  authorize('COORDINATOR'),  (req, res) => { req.params.stage = 'COORDINATOR';  getPendingForStage(req, res); });

// Coordinator: full overview + comparison tool
router.get('/all',     authorize('COORDINATOR', 'COMMITTEE'), getAllTopics);
router.get('/compare', authorize('COORDINATOR', 'COMMITTEE', 'GUIDE'), compareTopics);

export default router;
