import { Router } from 'express';
import {
  getUsers,
  getUser,
  updateProfile,
  updatePreferences,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  searchUsers,
  getUserStats,
  getUserKPIs,
} from '../controllers/userController.js';
import { protect, authorize, isAdmin } from '../middleware/auth.js';
import {
  userValidation,
  paginationValidation,
  objectIdValidation,
} from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// User search (for mentions, etc.)
router.get('/search', searchUsers);

// KPIs
router.get('/kpi', getUserKPIs);

// Current user profile
router.put('/profile', userValidation.updateProfile, updateProfile);
router.put('/preferences', updatePreferences);

// Admin routes
router.get('/', authorize('admin', 'manager'), paginationValidation, getUsers);
router.get('/stats', isAdmin, getUserStats);
router.get('/:id', objectIdValidation('id'), getUser);
router.put('/:id', isAdmin, objectIdValidation('id'), updateUser);
router.put('/:id/deactivate', isAdmin, objectIdValidation('id'), deactivateUser);
router.put('/:id/activate', isAdmin, objectIdValidation('id'), activateUser);
router.delete('/:id', isAdmin, objectIdValidation('id'), deleteUser);

export default router;
