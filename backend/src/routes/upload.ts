import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { authenticateRequest } from '../middleware/auth.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    // Cloudinary natively determines formats, but we map common ones
    let format = 'auto';
    if (file.mimetype === 'application/pdf') format = 'pdf';
    else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') format = 'docx';

    return {
      folder: 'protrack_uploads',
      format: format,
      public_id: file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
      resource_type: 'auto' // Important for non-image files like PDFs/DOCX
    };
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'image/jpeg', 
            'image/png'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, JPG, and PNG are allowed.'));
        }
    }
});

const router = Router();

router.use(authenticateRequest);

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Cloudinary returns the full URL in req.file.path
        const fileUrl = req.file.path;

        res.status(200).json({
            message: 'File uploaded successfully',
            url: fileUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

export default router;
