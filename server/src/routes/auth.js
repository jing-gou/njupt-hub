import express from 'express';
import { login, register, sendVerificationCode, sendResetPasswordCode, resetPassword, updateProfile, changePassword, getLeaderboard, uploadAvatar, getMe } from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// 路径是 /api/auth/register
router.post('/register', register);
router.post('/login', login);
router.post('/send-verification-code', sendVerificationCode);
router.post('/send-reset-password-code', sendResetPasswordCode);
router.post('/reset-password', resetPassword);
router.get('/leaderboard', getLeaderboard);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.patch('/password', requireAuth, changePassword);
router.post('/avatar', requireAuth, upload.single('avatar'), uploadAvatar);

const authRouter = router;
export default authRouter;
