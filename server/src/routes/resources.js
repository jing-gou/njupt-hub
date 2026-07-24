import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createResource,
  getResource,
  incrementDownload,
  listResources,
  uploadResources,
  updateResourceStatus,
  getDownloadUrl,
  updateResourceMeta,
  deleteResourceByAdmin,
  sendUploadThankYou,
} from '../controllers/resources.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
const uploadThankYouLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '感谢邮件请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', listResources);
router.get('/:id', getResource);
router.get('/:id/download-url', getDownloadUrl);
router.post('/', optionalAuth, createResource);
router.post('/upload', optionalAuth, upload.array('files', 30), uploadResources);
router.post('/upload/thank-you', requireAuth, uploadThankYouLimiter, sendUploadThankYou);
router.post('/:id/download', incrementDownload);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'DEV'), updateResourceStatus);
router.patch('/:id/meta', requireAuth, requireRole('ADMIN', 'DEV'), updateResourceMeta);
router.delete('/:id', requireAuth, requireRole('ADMIN', 'DEV'), deleteResourceByAdmin);

const resourcesRouter = router;
export default resourcesRouter;
