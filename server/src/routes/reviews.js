import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  getReviewItems, 
  getReviewItemDetail, 
  createReview, 
  toggleLikeReview, 
  createReply, 
  reportReview,
  getUserStats,
  getReports,
  deleteReviewByAdmin,
  dismissReport,
  uploadReviewImage,
  createReviewItem,
  updateReviewItemByAdmin,
  deleteReviewItemByAdmin,
  uploadReviewItemImageByAdmin,
  getPendingReviews,
  updateReviewStatusByAdmin,
  updateOwnReview,
  deleteOwnReview
} from '../controllers/reviews.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// 评分限制：每个 IP 每 15 分钟只能提交 5 次
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 限制 5 次
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 管理员接口
router.get('/admin/reports', requireAuth, requireRole('ADMIN', 'DEV'), getReports);
router.get('/admin/pending-reviews', requireAuth, requireRole('ADMIN', 'DEV'), getPendingReviews);
router.patch('/admin/reviews/:reviewId/status', requireAuth, requireRole('ADMIN', 'DEV'), updateReviewStatusByAdmin);
router.delete('/admin/reviews/:reviewId', requireAuth, requireRole('ADMIN', 'DEV'), deleteReviewByAdmin);
router.delete('/admin/reports/:reportId', requireAuth, requireRole('ADMIN', 'DEV'), dismissReport);
router.patch('/admin/items/:id', requireAuth, requireRole('ADMIN', 'DEV'), updateReviewItemByAdmin);
router.delete('/admin/items/:id', requireAuth, requireRole('ADMIN', 'DEV'), deleteReviewItemByAdmin);
router.post('/admin/items/:id/image', requireAuth, requireRole('ADMIN', 'DEV'), upload.single('image'), uploadReviewItemImageByAdmin);
router.post('/items', requireAuth, createReviewItem);

router.get('/items', getReviewItems);
router.get('/items/:id', optionalAuth, getReviewItemDetail);
router.post('/submit', optionalAuth, reviewLimiter, createReview);
router.post('/upload-image', requireAuth, upload.single('image'), uploadReviewImage);

// 点赞、回复、举报
router.post('/:reviewId/like', requireAuth, toggleLikeReview);
router.post('/:reviewId/reply', requireAuth, createReply);
router.post('/:reviewId/report', requireAuth, reportReview);
router.patch('/:reviewId', requireAuth, updateOwnReview);
router.delete('/:reviewId', requireAuth, deleteOwnReview);

// 用户统计
router.get('/user/stats', requireAuth, getUserStats);

export default router;
