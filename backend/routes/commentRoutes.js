import { Router } from 'express';
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
  addReaction,
  getComment,
} from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';
import {
  commentValidation,
  paginationValidation,
  objectIdValidation,
} from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// Get comments for a task
router.get('/task/:taskId', paginationValidation, getTaskComments);

// Comment CRUD
router.post('/', commentValidation.create, createComment);
router.get('/:id', objectIdValidation('id'), getComment);
router.put('/:id', commentValidation.update, updateComment);
router.delete('/:id', objectIdValidation('id'), deleteComment);

// Reactions
router.post('/:id/reactions', objectIdValidation('id'), addReaction);

export default router;
