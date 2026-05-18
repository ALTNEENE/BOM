import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  toggleWatcher,
  updateChecklistItem,
  reorderTasks,
  getMyTasks,
  getTaskStatusSummary,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import {
  taskValidation,
  paginationValidation,
  objectIdValidation,
} from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// My tasks
router.get('/my-tasks', getMyTasks);

// Reorder tasks (for drag and drop)
router.put('/reorder', reorderTasks);

// Task summaries
router.get('/status-summary', getTaskStatusSummary);

// Task CRUD
router.get('/', paginationValidation, getTasks);
router.post('/', taskValidation.create, createTask);
router.get('/:id', objectIdValidation('id'), getTask);
router.put('/:id', taskValidation.update, updateTask);
router.delete('/:id', objectIdValidation('id'), deleteTask);

// Task actions
router.put('/:id/status', taskValidation.updateStatus, updateTaskStatus);
router.post('/:id/watch', objectIdValidation('id'), toggleWatcher);

// Checklist
router.put('/:id/checklist/:itemId', objectIdValidation('id'), updateChecklistItem);

export default router;
