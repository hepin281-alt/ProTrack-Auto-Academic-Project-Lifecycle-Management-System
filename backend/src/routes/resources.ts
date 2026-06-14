import { Router } from 'express';
import { getResources, createResource } from '../controllers/resources.js';
import { authenticateRequest } from '../middleware/auth.js';

import multer from 'multer';
import path from 'path';

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage });

const router = Router();

router.use(authenticateRequest);
router.get('/:group_id', getResources);
router.post('/', upload.single('file'), createResource);

export default router;
