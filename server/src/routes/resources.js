import express from 'express';
import {
  createResource,
  getResource,
  incrementDownload,
  listResources,
  uploadResources,
  updateResourceStatus,
  getDownloadUrl,
} from '../controllers/resources.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', listResources);
router.get('/:id', getResource);
router.get('/:id/download-url', getDownloadUrl);
router.post('/', optionalAuth, createResource);
router.post('/upload', optionalAuth, upload.array('files', 30), uploadResources);
router.post('/:id/download', incrementDownload);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'DEV'), updateResourceStatus);

const resourcesRouter = router;
export default resourcesRouter;
