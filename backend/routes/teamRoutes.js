import { Router } from 'express';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateMemberRole,
  generateInviteCode,
  joinWithCode,
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';
import {
  teamValidation,
  paginationValidation,
  objectIdValidation,
} from '../validators/index.js';

const router = Router();

// All routes require authentication
router.use(protect);

// Join team with invite code
router.post('/join/:code', joinWithCode);

// Team CRUD
router.get('/', paginationValidation, getTeams);
router.post('/', teamValidation.create, createTeam);
router.get('/:id', objectIdValidation('id'), getTeam);
router.put('/:id', teamValidation.update, updateTeam);
router.delete('/:id', objectIdValidation('id'), deleteTeam);

// Invite codes
router.post('/:id/invite-code', objectIdValidation('id'), generateInviteCode);

// Team members
router.post('/:id/members', teamValidation.addMember, addMember);
router.delete('/:id/members/:userId', objectIdValidation('id'), removeMember);
router.put('/:id/members/:userId', objectIdValidation('id'), updateMemberRole);

export default router;
