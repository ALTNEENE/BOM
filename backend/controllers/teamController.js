import { Team, User, Activity, Notification } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import {
  asyncHandler,
  buildPagination,
  buildSort,
  pick,
} from '../utils/helpers.js';

/**
 * @desc    Get all teams for current user
 * @route   GET /api/v1/teams
 * @access  Private
 */
export const getTeams = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = '-createdAt', search } = req.query;

  const query = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
    isActive: true,
  };

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [teams, total] = await Promise.all([
    Team.find(query)
      .sort(buildSort(sort))
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName avatar'),
    Team.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      teams,
      pagination: buildPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    },
  });
});

/**
 * @desc    Get single team
 * @route   GET /api/v1/teams/:id
 * @access  Private
 */
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('owner', 'firstName lastName email avatar')
    .populate('members.user', 'firstName lastName email avatar');

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check access
  if (!team.isMember(req.user._id) && !team.settings.isPublic) {
    throw new ForbiddenError('You do not have access to this team');
  }

  res.json({
    success: true,
    data: { team },
  });
});

/**
 * @desc    Create team
 * @route   POST /api/v1/teams
 * @access  Private
 */
export const createTeam = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'description', 'color', 'settings'];
  const teamData = pick(req.body, allowedFields);
  teamData.owner = req.user._id;

  const team = await Team.create(teamData);

  // Log activity
  await Activity.log({
    type: 'team.created',
    actor: req.user._id,
    team: team._id,
    metadata: { teamName: team.name },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('owner', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    data: { team },
  });
});

/**
 * @desc    Update team
 * @route   PUT /api/v1/teams/:id
 * @access  Private
 */
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check if user is owner or admin
  const userRole = team.getMemberRole(req.user._id);
  if (!['owner', 'admin'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to update this team');
  }

  const allowedFields = ['name', 'description', 'color', 'settings', 'avatar'];
  const updates = pick(req.body, allowedFields);

  Object.assign(team, updates);
  await team.save();

  // Log activity
  await Activity.log({
    type: 'team.updated',
    actor: req.user._id,
    team: team._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('owner', 'firstName lastName avatar');
  await team.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Team updated successfully',
    data: { team },
  });
});

/**
 * @desc    Delete team
 * @route   DELETE /api/v1/teams/:id
 * @access  Private
 */
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Only owner can delete
  if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ForbiddenError('Only the team owner can delete this team');
  }

  await team.deleteOne();

  res.json({
    success: true,
    message: 'Team deleted successfully',
  });
});

/**
 * @desc    Add member to team
 * @route   POST /api/v1/teams/:id/members
 * @access  Private
 */
export const addMember = asyncHandler(async (req, res) => {
  const { userId, role = 'member' } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check permissions
  const userRole = team.getMemberRole(req.user._id);
  if (
    !['owner', 'admin'].includes(userRole) &&
    !team.settings.allowMemberInvites &&
    req.user.role !== 'admin'
  ) {
    throw new ForbiddenError('You do not have permission to add members');
  }

  // Check if user exists
  const newMember = await User.findById(userId);
  if (!newMember) {
    throw new NotFoundError('User not found');
  }

  // Check if already a member
  if (team.isMember(userId)) {
    throw new ForbiddenError('User is already a member of this team');
  }

  // Add member
  team.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
  });
  await team.save();

  // Create notification
  await Notification.notify({
    recipient: userId,
    type: 'team.invited',
    title: 'Team Invitation',
    message: `You've been added to team "${team.name}"`,
    data: {
      team: team._id,
      actor: req.user._id,
      actionUrl: `/teams/${team.slug}`,
    },
  });

  // Log activity
  await Activity.log({
    type: 'team.member_joined',
    actor: req.user._id,
    team: team._id,
    targetUser: userId,
    metadata: { role },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member added successfully',
    data: { team },
  });
});

/**
 * @desc    Remove member from team
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @access  Private
 */
export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check permissions
  const userRole = team.getMemberRole(req.user._id);
  const isSelfRemoval = userId === req.user._id.toString();

  if (!isSelfRemoval && !['owner', 'admin'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to remove members');
  }

  // Cannot remove owner
  if (team.owner.toString() === userId) {
    throw new ForbiddenError('Cannot remove the team owner');
  }

  // Remove member
  team.members = team.members.filter((m) => m.user.toString() !== userId);
  await team.save();

  // Create notification (if not self-removal)
  if (!isSelfRemoval) {
    await Notification.notify({
      recipient: userId,
      type: 'team.removed',
      title: 'Removed from Team',
      message: `You've been removed from team "${team.name}"`,
      data: {
        actor: req.user._id,
      },
    });
  }

  // Log activity
  await Activity.log({
    type: 'team.member_left',
    actor: req.user._id,
    team: team._id,
    targetUser: userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member removed successfully',
    data: { team },
  });
});

/**
 * @desc    Update member role
 * @route   PUT /api/v1/teams/:id/members/:userId
 * @access  Private
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Only owner can change roles
  if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ForbiddenError('Only the team owner can change member roles');
  }

  // Find and update member
  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === userId
  );

  if (memberIndex === -1) {
    throw new NotFoundError('Member not found in team');
  }

  const oldRole = team.members[memberIndex].role;
  team.members[memberIndex].role = role;
  await team.save();

  // Log activity
  await Activity.log({
    type: 'team.member_role_changed',
    actor: req.user._id,
    team: team._id,
    targetUser: userId,
    changes: {
      before: { role: oldRole },
      after: { role },
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member role updated successfully',
    data: { team },
  });
});

/**
 * @desc    Generate invite code
 * @route   POST /api/v1/teams/:id/invite-code
 * @access  Private
 */
export const generateInviteCode = asyncHandler(async (req, res) => {
  const { expiresInDays = 7, usageLimit } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check permissions
  const userRole = team.getMemberRole(req.user._id);
  if (!['owner', 'admin'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to generate invite codes');
  }

  const code = team.generateInviteCode(expiresInDays, usageLimit);
  await team.save();

  res.json({
    success: true,
    data: {
      code,
      expiresAt: team.inviteCode.expiresAt,
      usageLimit: team.inviteCode.usageLimit,
    },
  });
});

/**
 * @desc    Join team with invite code
 * @route   POST /api/v1/teams/join/:code
 * @access  Private
 */
export const joinWithCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const team = await Team.findOne({ 'inviteCode.code': code });

  if (!team) {
    throw new NotFoundError('Invalid invite code');
  }

  if (!team.isInviteCodeValid(code)) {
    throw new BadRequestError('Invite code is expired or usage limit reached');
  }

  // Check if already a member
  if (team.isMember(req.user._id)) {
    throw new ForbiddenError('You are already a member of this team');
  }

  // Add member
  team.members.push({
    user: req.user._id,
    role: 'member',
    joinedAt: new Date(),
  });

  // Increment usage count
  team.inviteCode.usageCount += 1;
  await team.save();

  // Log activity
  await Activity.log({
    type: 'team.member_joined',
    actor: req.user._id,
    team: team._id,
    metadata: { joinedViaInviteCode: true },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await team.populate('owner', 'firstName lastName avatar');
  await team.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Successfully joined the team',
    data: { team },
  });
});
