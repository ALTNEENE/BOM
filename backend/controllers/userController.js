import { User, Activity, Project, Task } from '../models/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import {
  asyncHandler,
  sanitizeUser,
  buildPagination,
  buildSort,
  pick,
} from '../utils/helpers.js';

/**
 * @desc    Get all users (admin)
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    search,
    role,
    isActive,
  } = req.query;

  const query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .sort(buildSort(sort))
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -refreshTokens'),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: buildPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    },
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    '-password -refreshTokens'
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'firstName',
    'lastName',
    'department',
    'jobTitle',
    'phone',
    'timezone',
    'avatar',
  ];

  const updates = pick(req.body, allowedFields);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  // Log activity
  await Activity.log({
    type: 'user.profile_updated',
    actor: req.user._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: sanitizeUser(user) },
  });
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/v1/users/preferences
 * @access  Private
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { notifications, theme } = req.body;

  const updates = {};

  if (notifications) {
    updates['preferences.notifications'] = {
      ...req.user.preferences?.notifications,
      ...notifications,
    };
  }

  if (theme) {
    updates['preferences.theme'] = theme;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: { user: sanitizeUser(user) },
  });
});

/**
 * @desc    Update user (admin)
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'role',
    'department',
    'jobTitle',
    'phone',
    'isActive',
  ];

  const updates = pick(req.body, allowedFields);

  // Prevent admin from demoting themselves
  if (
    id === req.user._id.toString() &&
    updates.role &&
    updates.role !== 'admin'
  ) {
    throw new ForbiddenError('You cannot change your own role');
  }

  // Check for email conflict
  if (updates.email) {
    const existingUser = await User.findOne({
      email: updates.email,
      _id: { $ne: id },
    });
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
});

/**
 * @desc    Deactivate user (admin)
 * @route   PUT /api/v1/users/:id/deactivate
 * @access  Private/Admin
 */
export const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deactivating themselves
  if (id === req.user._id.toString()) {
    throw new ForbiddenError('You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false, refreshTokens: [] },
    { new: true }
  ).select('-password -refreshTokens');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: { user },
  });
});

/**
 * @desc    Activate user (admin)
 * @route   PUT /api/v1/users/:id/activate
 * @access  Private/Admin
 */
export const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  ).select('-password -refreshTokens');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    message: 'User activated successfully',
    data: { user },
  });
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.user._id.toString()) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Search users (for autocomplete/mentions)
 * @route   GET /api/v1/users/search
 * @access  Private
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      success: true,
      data: { users: [] },
    });
  }

  const users = await User.find({
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
    _id: { $ne: req.user._id },
  })
    .limit(parseInt(limit))
    .select('firstName lastName email avatar');

  res.json({
    success: true,
    data: { users },
  });
});

/**
 * @desc    Get user statistics (admin)
 * @route   GET /api/v1/users/stats
 * @access  Private/Admin
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    usersByRole,
    recentSignups,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const roleStats = usersByRole.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentSignups,
        byRole: roleStats,
      },
    },
  });
});

/**
 * @desc    Get interactive KPI stats for dashboard
 * @route   GET /api/v1/users/kpi
 * @access  Private
 */
export const getUserKPIs = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    isArchived: false,
  }).select('_id');

  const projectIds = projects.map((project) => project._id);
  const tasks = projectIds.length
    ? await Task.find({
        project: { $in: projectIds },
        isArchived: false,
      }).select(
        'status startDate createdAt completedAt updatedAt dueDate estimatedHours actualHours'
      )
    : [];

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const toNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const dueDateEndOfDay = (date) => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  };

  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const completionDurations = completedTasks
    .map((task) => {
      const startedAt = task.startDate || task.createdAt;
      const completedAt = task.completedAt || task.updatedAt;
      if (!startedAt || !completedAt) return null;
      return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
    })
    .filter((duration) => duration !== null);

  const avgCompletionDays = completionDurations.length
    ? completionDurations.reduce((total, duration) => total + duration, 0) /
      completionDurations.length /
      msPerDay
    : 0;

  const totalEstimated = tasks.reduce(
    (total, task) => total + toNumber(task.estimatedHours),
    0
  );
  const totalActual = tasks.reduce(
    (total, task) => total + toNumber(task.actualHours),
    0
  );
  const trackedTasks = tasks.filter(
    (task) => toNumber(task.estimatedHours) > 0 || toNumber(task.actualHours) > 0
  ).length;

  const tasksClosedOnTime = completedTasks.filter((task) => {
    if (!task.dueDate) return true;
    const completedAt = task.completedAt || task.updatedAt;
    if (!completedAt) return false;
    return new Date(completedAt) <= dueDateEndOfDay(task.dueDate);
  }).length;

  const overdueOpenTasks = tasks.filter(
    (task) =>
      task.status !== 'completed' &&
      task.dueDate &&
      new Date(task.dueDate) < now
  ).length;

  const productivityDenominator = completedTasks.length + overdueOpenTasks;
  const productivityScore = productivityDenominator
    ? Math.round((tasksClosedOnTime / productivityDenominator) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      avgCompletionDays: parseFloat(avgCompletionDays.toFixed(1)),
      completedTasks: completedTasks.length,
      totalTasks: tasks.length,
      taskTime: {
        totalEstimated: parseFloat(totalEstimated.toFixed(1)),
        totalActual: parseFloat(totalActual.toFixed(1)),
        efficiencyRatio: totalEstimated > 0
          ? parseFloat((totalActual / totalEstimated).toFixed(2))
          : 0,
        trackedTasks,
      },
      productivity: {
        score: Math.min(100, Math.max(0, productivityScore)),
        tasksClosedOnTime,
        totalCompleted: completedTasks.length,
        overdueOpenTasks,
      },
    },
  });
});
