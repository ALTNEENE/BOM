import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  addMember,
  removeMember,
  updateMemberRole,
  getProjectActivity,
  getProjectStats,
  getProjectStatusSummary,
  assignTeamToProject,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import {
  projectValidation,
  paginationValidation,
  objectIdValidation,
} from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// Project CRUD
router.get('/', paginationValidation, getProjects);
router.get('/status-summary', getProjectStatusSummary);
router.post('/', projectValidation.create, createProject);
router.get('/:id', objectIdValidation('id'), getProject);
router.put('/:id', projectValidation.update, updateProject);
router.delete('/:id', objectIdValidation('id'), deleteProject);

// Project actions
router.put('/:id/archive', objectIdValidation('id'), archiveProject);
router.get('/:id/activity', objectIdValidation('id'), paginationValidation, getProjectActivity);
router.get('/:id/stats', objectIdValidation('id'), getProjectStats);
router.post('/:id/assign-team', objectIdValidation('id'), assignTeamToProject);

// Project members
router.post('/:id/members', projectValidation.addMember, addMember);
router.delete('/:id/members/:userId', objectIdValidation('id'), removeMember);
router.put('/:id/members/:userId', objectIdValidation('id'), updateMemberRole);

export default router;
