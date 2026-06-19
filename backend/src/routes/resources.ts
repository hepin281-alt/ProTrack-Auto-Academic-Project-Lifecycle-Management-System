import { Router } from 'express';
import { getResources, createResource, getGlobalResources } from '../controllers/resources.js';
import { authenticateRequest } from '../middleware/auth.js';

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary (re-using the same env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    let format = 'auto';
    if (file.mimetype === 'application/pdf') format = 'pdf';
    else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') format = 'docx';

    return {
      folder: 'protrack_resources',
      format: format,
      public_id: Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname.replace(/[^a-zA-Z0-9]/g, '_'),
      resource_type: 'auto'
    };
  },
});

const upload = multer({ storage });

const router = Router();

router.use(authenticateRequest);
router.get('/global', getGlobalResources);
// Render ephemeral storage fix: we now upload directly to Cloudinary
router.post('/global', upload.single('file'), createResource);
router.get('/:group_id', getResources);
router.post('/', upload.single('file'), createResource);

export default router;
