import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  logoutAll,
} from '../controllers/authController.js';
import { protect, verifyRefreshToken } from '../middleware/auth.js';
import { userValidation } from '../validators/index.js';

const router = Router();

// Public routes
router.post('/register', userValidation.register, register);
router.post('/login', userValidation.login, login);
router.post('/forgot-password', userValidation.forgotPassword, forgotPassword);
router.put('/reset-password/:token', userValidation.resetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Refresh token route
router.post('/refresh-token', verifyRefreshToken, refreshToken);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.put('/change-password', userValidation.changePassword, changePassword);
router.post('/resend-verification', resendVerification);

export default router;
