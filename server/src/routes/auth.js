import express from 'express';
import { login, register, sendVerificationCode, sendResetPasswordCode, resetPassword } from '../controllers/auth.js';

const router = express.Router();

// 路径是 /api/auth/register
router.post('/register', register);
router.post('/login', login);
router.post('/send-verification-code', sendVerificationCode);
router.post('/send-reset-password-code', sendResetPasswordCode);
router.post('/reset-password', resetPassword);

const authRouter = router;
export default authRouter;
