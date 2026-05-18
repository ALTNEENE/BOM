import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markManyAsRead,
  deleteNotification,
  clearReadNotifications,
  clearAllNotifications,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { paginationValidation, objectIdValidation } from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// Get notifications
router.get('/', paginationValidation, getNotifications);
router.get('/unread-count', getUnreadCount);

// Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Mark as read
router.put('/read-all', markAllAsRead);
router.put('/read-many', markManyAsRead);
router.put('/:id/read', objectIdValidation('id'), markAsRead);

// Delete notifications
router.delete('/clear-read', clearReadNotifications);
router.delete('/clear-all', clearAllNotifications);
router.delete('/:id', objectIdValidation('id'), deleteNotification);

export default router;
