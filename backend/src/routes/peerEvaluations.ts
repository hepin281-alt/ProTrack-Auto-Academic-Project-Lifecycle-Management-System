import { Router } from 'express';
import { authenticateRequest } from '../middleware/auth.js';
import { submitEvaluation, getGroupEvaluations, getGroupEvaluationsSummary } from '../controllers/peerEvaluations.js';

const router = Router();

router.use(authenticateRequest);

router.post('/', submitEvaluation);
router.get('/group/:group_id', getGroupEvaluations);
router.get('/group/:group_id/summary', getGroupEvaluationsSummary);

export default router;
