import { Router } from 'express';
import multer from 'multer';
import * as whitelistController from '../controllers/whitelist.js';
import { authenticateRequest, authorize } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ---- Student Whitelist ----

// Only coordinators can upload whitelist
router.post(
    '/upload',
    authenticateRequest,
    authorize('COORDINATOR'),
    upload.single('file'),
    whitelistController.uploadWhitelist
);

router.get(
    '/',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.getWhitelist
);

router.post(
    '/student',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.addStudentToWhitelist
);

// ---- Faculty Whitelist ----

router.post(
    '/faculty/upload',
    authenticateRequest,
    authorize('COORDINATOR'),
    upload.single('file'),
    whitelistController.uploadFacultyWhitelist
);

router.post(
    '/faculty',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.addFacultyToWhitelist
);

router.get(
    '/faculty',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.getFacultyWhitelist
);

router.delete(
    '/student/:id',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.deleteStudentFromWhitelist
);

router.delete(
    '/faculty/:id',
    authenticateRequest,
    authorize('COORDINATOR'),
    whitelistController.deleteFacultyFromWhitelist
);

export default router;
