import { Project, Task, Activity, Notification, User } from '../models/index.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import {
  asyncHandler,
  buildPagination,
  buildSort,
  pick,
} from '../utils/helpers.js';
import emailService from '../utils/email.js';

/**
 * @desc    Get all projects for current user
 * @route   GET /api/v1/projects
 * @access  Private
 */
export const getProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    status,
    priority,
    search,
    archived = 'false',
  } = req.query;

  const query = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
    isArchived: archived === 'true',
  };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by priority
  if (priority) {
    query.priority = priority;
  }

  // Search by name
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [projects, total] = await Promise.all([
    Project.find(query)
      .sort(buildSort(sort))
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName avatar'),
    Project.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      projects,
      pagination: buildPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    },
  });
});

/**
 * @desc    Get project counts grouped by status for current user
 * @route   GET /api/v1/projects/status-summary
 * @access  Private
 */
export const getProjectStatusSummary = asyncHandler(async (req, res) => {
  const statuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
  const query = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
    isArchived: false,
  };

  const grouped = await Project.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = Object.fromEntries(statuses.map((status) => [status, 0]));
  let total = 0;

  grouped.forEach((item) => {
    if (summary[item._id] !== undefined) {
      summary[item._id] = item.count;
      total += item.count;
    }
  });

  res.json({
    success: true,
    data: {
      statuses: summary,
      total,
    },
  });
});

/**
 * @desc    Get single project
 * @route   GET /api/v1/projects/:id
 * @access  Private
 */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'firstName lastName email avatar')
    .populate('members.user', 'firstName lastName email avatar');

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check access
  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this project');
  }

  // Get task statistics
  const taskStats = await Task.getProjectStats(project._id);

  res.json({
    success: true,
    data: {
      project,
      taskStats,
    },
  });
});

/**
 * @desc    Create project
 * @route   POST /api/v1/projects
 * @access  Private
 */
export const createProject = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'description',
    'status',
    'priority',
    'startDate',
    'dueDate',
    'budget',
    'tags',
    'color',
    'visibility',
    'settings',
  ];

  const projectData = pick(req.body, allowedFields);
  projectData.owner = req.user._id;

  const project = await Project.create(projectData);

  // Log activity
  await Activity.log({
    type: 'project.created',
    actor: req.user._id,
    project: project._id,
    metadata: { projectName: project.name },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('owner', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: { project },
  });
});

/**
 * @desc    Update project
 * @route   PUT /api/v1/projects/:id
 * @access  Private
 */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if user is owner or lead
  const userRole = project.getMemberRole(req.user._id);
  if (!['owner', 'lead'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to update this project');
  }

  const allowedFields = [
    'name',
    'description',
    'status',
    'priority',
    'startDate',
    'dueDate',
    'budget',
    'tags',
    'color',
    'visibility',
    'settings',
  ];

  const updates = pick(req.body, allowedFields);
  const oldValues = pick(project.toObject(), Object.keys(updates));

  Object.assign(project, updates);
  await project.save();

  // Log activity
  await Activity.log({
    type: 'project.updated',
    actor: req.user._id,
    project: project._id,
    changes: {
      before: oldValues,
      after: updates,
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('owner', 'firstName lastName avatar');
  await project.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: { project },
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/v1/projects/:id
 * @access  Private
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Only owner or admin can delete
  if (
    project.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ForbiddenError('Only the project owner can delete this project');
  }

  // Delete associated tasks
  await Task.deleteMany({ project: project._id });

  // Delete project
  await project.deleteOne();

  // Log activity
  await Activity.log({
    type: 'project.deleted',
    actor: req.user._id,
    metadata: { projectName: project.name },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
});

/**
 * @desc    Archive/Unarchive project
 * @route   PUT /api/v1/projects/:id/archive
 * @access  Private
 */
export const archiveProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if user is owner or lead
  const userRole = project.getMemberRole(req.user._id);
  if (!['owner', 'lead'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to archive this project');
  }

  project.isArchived = !project.isArchived;
  await project.save();

  // Log activity
  await Activity.log({
    type: 'project.archived',
    actor: req.user._id,
    project: project._id,
    metadata: { isArchived: project.isArchived },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: project.isArchived
      ? 'Project archived successfully'
      : 'Project unarchived successfully',
    data: { project },
  });
});

/**
 * @desc    Add member to project
 * @route   POST /api/v1/projects/:id/members
 * @access  Private
 */
export const addMember = asyncHandler(async (req, res) => {
  const { userId, role = 'member' } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check permissions
  const userRole = project.getMemberRole(req.user._id);
  if (
    !['owner', 'lead'].includes(userRole) &&
    !project.settings.allowMemberInvites &&
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
  if (project.isMember(userId)) {
    throw new ForbiddenError('User is already a member of this project');
  }

  // Add member
  project.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
  });
  await project.save();

  // Create notification
  await Notification.notify({
    recipient: userId,
    type: 'project.invited',
    title: 'Project Invitation',
    message: `You've been added to project "${project.name}"`,
    data: {
      project: project._id,
      actor: req.user._id,
      actionUrl: `/projects/${project.slug}`,
    },
  });

  // Send email notification
  try {
    await emailService.sendProjectInvite(newMember, project, req.user);
  } catch (error) {
    console.error('Failed to send project invite email:', error);
  }

  // Log activity
  await Activity.log({
    type: 'project.member_added',
    actor: req.user._id,
    project: project._id,
    targetUser: userId,
    metadata: { role },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member added successfully',
    data: { project },
  });
});

/**
 * @desc    Remove member from project
 * @route   DELETE /api/v1/projects/:id/members/:userId
 * @access  Private
 */
export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check permissions
  const userRole = project.getMemberRole(req.user._id);
  const isSelfRemoval = userId === req.user._id.toString();

  if (!isSelfRemoval && !['owner', 'lead'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to remove members');
  }

  // Cannot remove owner
  if (project.owner.toString() === userId) {
    throw new ForbiddenError('Cannot remove the project owner');
  }

  // Remove member
  project.members = project.members.filter(
    (m) => m.user.toString() !== userId
  );
  await project.save();

  // Create notification (if not self-removal)
  if (!isSelfRemoval) {
    await Notification.notify({
      recipient: userId,
      type: 'project.removed',
      title: 'Removed from Project',
      message: `You've been removed from project "${project.name}"`,
      data: {
        actor: req.user._id,
      },
    });
  }

  // Log activity
  await Activity.log({
    type: 'project.member_removed',
    actor: req.user._id,
    project: project._id,
    targetUser: userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member removed successfully',
    data: { project },
  });
});

/**
 * @desc    Assign team to project
 * @route   POST /api/v1/projects/:id/assign-team
 * @access  Private
 */
export const assignTeamToProject = asyncHandler(async (req, res) => {
  const { teamId } = req.body;
  const { Team } = await import('../models/index.js');
  
  const project = await Project.findById(req.params.id);
  if (!project) throw new NotFoundError('Project not found');

  const userRole = project.getMemberRole(req.user._id);
  if (!['owner', 'lead'].includes(userRole) && req.user.role !== 'admin') {
    throw new ForbiddenError('You do not have permission to modify this project');
  }

  const team = await Team.findById(teamId);
  if (!team) throw new NotFoundError('Team not found');

  // Verify the user is actually a member of the team they are assigning
  if (!team.isMember(req.user._id) && req.user.role !== 'admin') {
    throw new ForbiddenError('You can only assign teams you are a member of');
  }

  // Link the team to the project
  project.team = team._id;

  // Bulk add team members to the project
  // Owner first
  if (!project.isMember(team.owner)) {
    project.members.push({ user: team.owner, role: 'member', joinedAt: new Date() });
  }

  // Add all other members
  team.members.forEach(member => {
    if (!project.isMember(member.user)) {
      project.members.push({
        user: member.user,
        role: member.role === 'admin' ? 'lead' : 'member',
        joinedAt: new Date()
      });
    }
  });

  await project.save();

  // Log activity
  await Activity.log({
    type: 'project.team_assigned',
    actor: req.user._id,
    project: project._id,
    metadata: { teamId, teamName: team.name },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('members.user', 'firstName lastName avatar');
  
  res.json({
    success: true,
    message: 'Team successfully assigned and members synchronized',
    data: { project },
  });
});

/**
 * @desc    Update member role
 * @route   PUT /api/v1/projects/:id/members/:userId
 * @access  Private
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Only owner can change roles
  if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ForbiddenError('Only the project owner can change member roles');
  }

  // Find and update member
  const memberIndex = project.members.findIndex(
    (m) => m.user.toString() === userId
  );

  if (memberIndex === -1) {
    throw new NotFoundError('Member not found in project');
  }

  const oldRole = project.members[memberIndex].role;
  project.members[memberIndex].role = role;
  await project.save();

  // Log activity
  await Activity.log({
    type: 'project.member_role_changed',
    actor: req.user._id,
    project: project._id,
    targetUser: userId,
    changes: {
      before: { role: oldRole },
      after: { role },
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await project.populate('members.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Member role updated successfully',
    data: { project },
  });
});

/**
 * @desc    Get project activity timeline
 * @route   GET /api/v1/projects/:id/activity
 * @access  Private
 */
export const getProjectActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check access
  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this project');
  }

  const result = await Activity.getProjectTimeline(project._id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get project statistics
 * @route   GET /api/v1/projects/:id/stats
 * @access  Private
 */
export const getProjectStats = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check access
  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this project');
  }

  const [taskStats, overdueTasks, completedThisWeek] = await Promise.all([
    Task.getProjectStats(project._id),
    Task.countDocuments({
      project: project._id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' },
      isArchived: false,
    }),
    Task.countDocuments({
      project: project._id,
      status: 'completed',
      completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        tasks: taskStats,
        overdueTasks,
        completedThisWeek,
        progress: project.progress,
        memberCount: project.members.length + 1,
      },
    },
  });
});
