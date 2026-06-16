import { Router } from 'express';
import { getGuideAnalytics, getLogbookCompliance, exportLogbookCompliance, getSystemStats } from '../controllers/analytics.js';
import { authenticateRequest, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticateRequest);

// Guide analytics
router.get('/guide', authorize('GUIDE'), getGuideAnalytics);

// Logbook compliance (Coordinator only)
router.get('/compliance', authorize('COORDINATOR'), getLogbookCompliance);
router.get('/compliance/export', authorize('COORDINATOR'), exportLogbookCompliance);

// System stats (Coordinator only)
router.get('/system-stats', authorize('COORDINATOR'), getSystemStats);

export default router;
