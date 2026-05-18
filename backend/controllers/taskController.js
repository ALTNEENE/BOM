import { Task, Project, Comment, Activity, Notification, User } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import {
  asyncHandler,
  buildPagination,
  buildSort,
  pick,
} from '../utils/helpers.js';
import emailService from '../utils/email.js';

/**
 * @desc    Get tasks with filters
 * @route   GET /api/v1/tasks
 * @access  Private
 */
export const getTasks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    project,
    status,
    priority,
    assignee,
    search,
    dueDate,
    archived = 'false',
  } = req.query;

  // Build base query
  const query = { isArchived: archived === 'true' };

  // If project is specified, check access
  if (project) {
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      throw new NotFoundError('Project not found');
    }
    if (!projectDoc.isMember(req.user._id) && projectDoc.visibility === 'private') {
      throw new ForbiddenError('You do not have access to this project');
    }
    query.project = project;
  } else {
    // Get all projects user has access to
    const userProjects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
      ],
    }).select('_id');
    query.project = { $in: userProjects.map((p) => p._id) };
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by priority
  if (priority) {
    query.priority = priority;
  }

  // Filter by assignee
  if (assignee) {
    if (assignee === 'me') {
      query.assignee = req.user._id;
    } else if (assignee === 'unassigned') {
      query.assignee = null;
    } else {
      query.assignee = assignee;
    }
  }

  // Search by title
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  // Filter by due date
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dueDate) {
      case 'overdue':
        query.dueDate = { $lt: today };
        query.status = { $ne: 'completed' };
        break;
      case 'today':
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: today, $lte: endOfDay };
        break;
      case 'week':
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        query.dueDate = { $gte: today, $lte: endOfWeek };
        break;
      case 'month':
        const endOfMonth = new Date(today);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        query.dueDate = { $gte: today, $lte: endOfMonth };
        break;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort(buildSort(sort))
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name slug color')
      .populate('assignee', 'firstName lastName avatar')
      .populate('reporter', 'firstName lastName avatar'),
    Task.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      tasks,
      pagination: buildPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      }),
    },
  });
});

/**
 * @desc    Get single task
 * @route   GET /api/v1/tasks/:id
 * @access  Private
 */
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('project', 'name slug color owner members')
    .populate('assignee', 'firstName lastName email avatar')
    .populate('reporter', 'firstName lastName email avatar')
    .populate('watchers', 'firstName lastName avatar')
    .populate({
      path: 'subtasks',
      select: 'title status priority assignee dueDate',
      populate: { path: 'assignee', select: 'firstName lastName avatar' },
    });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project._id);
  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this task');
  }

  // Get comment count
  const commentCount = await Comment.countDocuments({
    task: task._id,
    isDeleted: false,
  });

  res.json({
    success: true,
    data: {
      task,
      commentCount,
    },
  });
});

/**
 * @desc    Create task
 * @route   POST /api/v1/tasks
 * @access  Private
 */
export const createTask = asyncHandler(async (req, res) => {
  const allowedFields = [
    'title',
    'description',
    'project',
    'status',
    'priority',
    'assignee',
    'dueDate',
    'startDate',
    'estimatedHours',
    'tags',
    'parentTask',
    'checklist',
  ];

  const taskData = pick(req.body, allowedFields);
  taskData.reporter = req.user._id;

  // Verify project exists and user has access
  const project = await Project.findById(taskData.project);
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this project');
  }

  // If parent task is specified, verify it exists and belongs to same project
  if (taskData.parentTask) {
    const parentTask = await Task.findById(taskData.parentTask);
    if (!parentTask) {
      throw new NotFoundError('Parent task not found');
    }
    if (parentTask.project.toString() !== taskData.project.toString()) {
      throw new BadRequestError('Parent task must belong to the same project');
    }
  }

  // Get the highest order number for this project
  const lastTask = await Task.findOne({ project: taskData.project })
    .sort({ order: -1 })
    .select('order');
  taskData.order = lastTask ? lastTask.order + 1 : 0;

  const task = await Task.create(taskData);

  // If task is assigned, create notification and send email
  if (task.assignee) {
    const assignee = await User.findById(task.assignee);
    if (assignee && assignee._id.toString() !== req.user._id.toString()) {
      await Notification.notify({
        recipient: task.assignee,
        type: 'task.assigned',
        title: 'New Task Assigned',
        message: `You've been assigned to "${task.title}"`,
        data: {
          task: task._id,
          project: project._id,
          actor: req.user._id,
          actionUrl: `/tasks/${task._id}`,
        },
      });

      try {
        await emailService.sendTaskAssigned(assignee, task, req.user);
      } catch (error) {
        console.error('Failed to send task assignment email:', error);
      }
    }
  }

  // Log activity
  await Activity.log({
    type: 'task.created',
    actor: req.user._id,
    project: project._id,
    task: task._id,
    metadata: { taskTitle: task.title },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await task.populate('project', 'name slug color');
  await task.populate('assignee', 'firstName lastName avatar');
  await task.populate('reporter', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task },
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/v1/tasks/:id
 * @access  Private
 */
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this task');
  }

  const allowedFields = [
    'title',
    'description',
    'status',
    'priority',
    'assignee',
    'dueDate',
    'startDate',
    'estimatedHours',
    'actualHours',
    'tags',
    'checklist',
  ];

  const updates = pick(req.body, allowedFields);
  const oldValues = pick(task.toObject(), Object.keys(updates));

  // Track if assignee changed
  const assigneeChanged =
    updates.assignee &&
    (!task.assignee || task.assignee.toString() !== updates.assignee.toString());

  // Track if status changed
  const statusChanged = updates.status && task.status !== updates.status;

  Object.assign(task, updates);
  await task.save();

  // Handle assignee change notification
  if (assigneeChanged && updates.assignee) {
    const assignee = await User.findById(updates.assignee);
    if (assignee && assignee._id.toString() !== req.user._id.toString()) {
      await Notification.notify({
        recipient: updates.assignee,
        type: 'task.assigned',
        title: 'Task Assigned',
        message: `You've been assigned to "${task.title}"`,
        data: {
          task: task._id,
          project: project._id,
          actor: req.user._id,
          actionUrl: `/tasks/${task._id}`,
        },
      });

      try {
        await emailService.sendTaskAssigned(assignee, task, req.user);
      } catch (error) {
        console.error('Failed to send task assignment email:', error);
      }
    }
  }

  // Log activity
  await Activity.log({
    type: statusChanged ? 'task.status_changed' : 'task.updated',
    actor: req.user._id,
    project: project._id,
    task: task._id,
    changes: {
      before: oldValues,
      after: updates,
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await task.populate('project', 'name slug color');
  await task.populate('assignee', 'firstName lastName avatar');
  await task.populate('reporter', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: { task },
  });
});

/**
 * @desc    Update task status
 * @route   PUT /api/v1/tasks/:id/status
 * @access  Private
 */
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this task');
  }

  const oldStatus = task.status;
  task.status = status;
  await task.save();

  // Notify watchers and assignee about status change
  const notifyUsers = [
    ...task.watchers,
    task.assignee,
    task.reporter,
  ].filter(
    (id) => id && id.toString() !== req.user._id.toString()
  );

  const uniqueUsers = [...new Set(notifyUsers.map((id) => id.toString()))];

  if (uniqueUsers.length > 0) {
    await Notification.notifyMany(uniqueUsers, {
      type: 'task.completed',
      title: 'Task Status Updated',
      message: `"${task.title}" status changed to ${status}`,
      data: {
        task: task._id,
        project: project._id,
        actor: req.user._id,
        actionUrl: `/tasks/${task._id}`,
      },
    });
  }

  // Log activity
  await Activity.log({
    type: 'task.status_changed',
    actor: req.user._id,
    project: project._id,
    task: task._id,
    changes: {
      before: { status: oldStatus },
      after: { status },
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await task.populate('project', 'name slug color');
  await task.populate('assignee', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Task status updated',
    data: { task },
  });
});

/**
 * @desc    Delete task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project);
  const userRole = project.getMemberRole(req.user._id);

  // Only owner, lead, reporter, or admin can delete
  if (
    !['owner', 'lead'].includes(userRole) &&
    task.reporter.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ForbiddenError('You do not have permission to delete this task');
  }

  // Delete subtasks
  await Task.deleteMany({ parentTask: task._id });

  // Delete comments
  await Comment.deleteMany({ task: task._id });

  // Delete task
  await task.deleteOne();

  // Log activity
  await Activity.log({
    type: 'task.deleted',
    actor: req.user._id,
    project: project._id,
    metadata: { taskTitle: task.title },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
});

/**
 * @desc    Add/Remove watcher
 * @route   POST /api/v1/tasks/:id/watch
 * @access  Private
 */
export const toggleWatcher = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this task');
  }

  const watcherIndex = task.watchers.findIndex(
    (w) => w.toString() === req.user._id.toString()
  );

  if (watcherIndex > -1) {
    task.watchers.splice(watcherIndex, 1);
  } else {
    task.watchers.push(req.user._id);
  }

  await task.save();
  await task.populate('watchers', 'firstName lastName avatar');

  res.json({
    success: true,
    message: watcherIndex > -1 ? 'Unwatched task' : 'Watching task',
    data: {
      isWatching: watcherIndex === -1,
      watchers: task.watchers,
    },
  });
});

/**
 * @desc    Update checklist item
 * @route   PUT /api/v1/tasks/:id/checklist/:itemId
 * @access  Private
 */
export const updateChecklistItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { isCompleted, text } = req.body;

  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check access through project
  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this task');
  }

  // Find checklist item
  const itemIndex = task.checklist.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Checklist item not found');
  }

  // Update item
  if (isCompleted !== undefined) {
    task.checklist[itemIndex].isCompleted = isCompleted;
    if (isCompleted) {
      task.checklist[itemIndex].completedAt = new Date();
      task.checklist[itemIndex].completedBy = req.user._id;
    } else {
      task.checklist[itemIndex].completedAt = null;
      task.checklist[itemIndex].completedBy = null;
    }
  }

  if (text !== undefined) {
    task.checklist[itemIndex].text = text;
  }

  await task.save();

  res.json({
    success: true,
    message: 'Checklist item updated',
    data: {
      checklist: task.checklist,
      checklistProgress: task.checklistProgress,
    },
  });
});

/**
 * @desc    Reorder tasks (drag and drop)
 * @route   PUT /api/v1/tasks/reorder
 * @access  Private
 */
export const reorderTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body; // Array of { id, order, status }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new BadRequestError('Tasks array is required');
  }

  // Update each task's order and optionally status
  const bulkOps = tasks.map(({ id, order, status }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order, ...(status && { status }) } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  res.json({
    success: true,
    message: 'Tasks reordered successfully',
  });
});

/**
 * @desc    Get accessible task counts grouped by status
 * @route   GET /api/v1/tasks/status-summary
 * @access  Private
 */
export const getTaskStatusSummary = asyncHandler(async (req, res) => {
  const statuses = ['todo', 'in-progress', 'review', 'completed', 'blocked'];
  const userProjects = await Project.find({
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
    isArchived: false,
  }).select('_id');
  const projectIds = userProjects.map((project) => project._id);
  const baseQuery = {
    project: { $in: projectIds },
    isArchived: false,
  };

  const [grouped, overdue] = await Promise.all([
    Task.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Task.countDocuments({
      ...baseQuery,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' },
    }),
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
      overdue,
    },
  });
});

/**
 * @desc    Get my tasks (assigned to me)
 * @route   GET /api/v1/tasks/my-tasks
 * @access  Private
 */
export const getMyTasks = asyncHandler(async (req, res) => {
  const { status, priority, dueDate } = req.query;

  const query = {
    assignee: req.user._id,
    isArchived: false,
  };

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dueDate) {
      case 'overdue':
        query.dueDate = { $lt: today };
        query.status = { $ne: 'completed' };
        break;
      case 'today':
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: today, $lte: endOfDay };
        break;
      case 'week':
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        query.dueDate = { $gte: today, $lte: endOfWeek };
        break;
    }
  }

  const tasks = await Task.find(query)
    .sort({ dueDate: 1, priority: -1, createdAt: -1 })
    .populate('project', 'name slug color')
    .populate('reporter', 'firstName lastName avatar');

  // Group by status
  const grouped = {
    todo: [],
    'in-progress': [],
    review: [],
    completed: [],
    blocked: [],
  };

  tasks.forEach((task) => {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  });

  res.json({
    success: true,
    data: {
      tasks,
      grouped,
      total: tasks.length,
    },
  });
});
