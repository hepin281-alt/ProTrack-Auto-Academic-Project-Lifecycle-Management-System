import { Router } from 'express';
import * as groupController from '../controllers/groups.js';
import * as memberController from '../controllers/members.js';
import * as logbookController from '../controllers/logbooks.js';
import * as allocationController from '../controllers/allocations.js';
import { authenticateRequest, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateRequest);

// Group CRUD endpoints
router.get('/', groupController.getGroups);
router.get('/available-students', memberController.getAvailableStudents);
router.post('/', authorize('STUDENT'), groupController.createGroup);
router.get('/:group_id', groupController.getGroupById);
router.patch('/:group_id/status', authorize('COORDINATOR', 'STUDENT'), groupController.updateGroupStatus);

// Group members endpoints
router.post('/:group_id/members', authorize('STUDENT'), memberController.addMember);
router.get('/:group_id/members', memberController.getMembers);
router.delete('/:group_id/members/:student_id', authorize('STUDENT'), memberController.removeMember);
router.patch('/:group_id/members/:student_id/leader', authorize('STUDENT'), memberController.setLeader);

// Logbook endpoints
router.post('/:group_id/logbooks', authorize('STUDENT'), logbookController.submitLogbook);
router.get('/:group_id/logbooks', logbookController.getLogbooks);
router.get('/logbooks/:log_id', logbookController.getLogbookById);
router.patch('/logbooks/bulk-approve', authorize('GUIDE'), logbookController.bulkApproveLogbooks);
router.patch('/logbooks/:log_id', authorize('GUIDE'), logbookController.approveLogbook);
router.put('/logbooks/:log_id', authorize('STUDENT'), logbookController.updateLogbook);

// Guide allocation endpoints
router.get('/allocation/pending',           authorize('COORDINATOR'), allocationController.getPendingAllocation);
router.get('/allocation/guides',            authorize('COORDINATOR'), allocationController.getAvailableGuides);
router.get('/allocation/rank/:group_id',    authorize('COORDINATOR'), allocationController.getRankedGuides);
router.post('/allocation/assign',           authorize('COORDINATOR'), allocationController.assignGuide);
router.post('/allocation/batch',            authorize('COORDINATOR'), allocationController.batchAllocate);
router.delete('/allocation/:group_id',      authorize('COORDINATOR'), allocationController.unassignGuide);
router.get('/allocation/audit',             authorize('COORDINATOR'), allocationController.getAllocationAudit);
router.post('/allocation/set-preference',   authorize('COORDINATOR', 'STUDENT'), allocationController.setGroupPreference);
router.post('/allocation/ratings',          authorize('COORDINATOR'), allocationController.submitGuideRating);
router.get('/allocation/ratings',           authorize('COORDINATOR'), allocationController.getGuideRatings);
router.get('/guides/:guide_id/groups',      allocationController.getGuideGroups);

export default router;
