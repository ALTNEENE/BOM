import { Comment, Task, Project, Activity, Notification } from '../models/index.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { asyncHandler, pick } from '../utils/helpers.js';

/**
 * @desc    Get comments for a task
 * @route   GET /api/v1/comments/task/:taskId
 * @access  Private
 */
export const getTaskComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Verify task exists and user has access
  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this task');
  }

  const result = await Comment.getTaskComments(taskId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Create comment
 * @route   POST /api/v1/comments
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
  const { content, taskId, parentComment, mentions } = req.body;

  // Verify task exists and user has access
  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    throw new ForbiddenError('You do not have access to this task');
  }

  // If replying to a comment, verify parent exists
  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (!parent || parent.task.toString() !== taskId) {
      throw new NotFoundError('Parent comment not found');
    }
  }

  const comment = await Comment.create({
    content,
    task: taskId,
    author: req.user._id,
    parentComment,
    mentions: mentions || [],
  });

  await comment.populate('author', 'firstName lastName avatar');

  // Notify mentioned users
  if (mentions && mentions.length > 0) {
    const uniqueMentions = [...new Set(mentions)].filter(
      (id) => id !== req.user._id.toString()
    );

    if (uniqueMentions.length > 0) {
      await Notification.notifyMany(uniqueMentions, {
        type: 'task.mention',
        title: 'You were mentioned',
        message: `${req.user.fullName} mentioned you in a comment on "${task.title}"`,
        data: {
          task: task._id,
          project: project._id,
          comment: comment._id,
          actor: req.user._id,
          actionUrl: `/tasks/${task._id}`,
        },
      });
    }
  }

  // Notify task assignee and watchers
  const notifyUsers = [
    task.assignee,
    task.reporter,
    ...task.watchers,
  ].filter(
    (id) =>
      id &&
      id.toString() !== req.user._id.toString() &&
      (!mentions || !mentions.includes(id.toString()))
  );

  const uniqueUsers = [...new Set(notifyUsers.map((id) => id.toString()))];

  if (uniqueUsers.length > 0) {
    await Notification.notifyMany(uniqueUsers, {
      type: 'task.comment',
      title: 'New Comment',
      message: `${req.user.fullName} commented on "${task.title}"`,
      data: {
        task: task._id,
        project: project._id,
        comment: comment._id,
        actor: req.user._id,
        actionUrl: `/tasks/${task._id}`,
      },
    });
  }

  // Log activity
  await Activity.log({
    type: 'task.comment_added',
    actor: req.user._id,
    project: project._id,
    task: task._id,
    metadata: {
      commentId: comment._id,
      isReply: !!parentComment,
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({
    success: true,
    message: 'Comment added',
    data: { comment },
  });
});

/**
 * @desc    Update comment
 * @route   PUT /api/v1/comments/:id
 * @access  Private
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Only author can edit
  if (comment.author.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You can only edit your own comments');
  }

  // Check if comment was deleted
  if (comment.isDeleted) {
    throw new ForbiddenError('Cannot edit a deleted comment');
  }

  comment.content = content;
  await comment.save();

  await comment.populate('author', 'firstName lastName avatar');

  res.json({
    success: true,
    message: 'Comment updated',
    data: { comment },
  });
});

/**
 * @desc    Delete comment (soft delete)
 * @route   DELETE /api/v1/comments/:id
 * @access  Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Get task and project for permission check
  const task = await Task.findById(comment.task);
  const project = await Project.findById(task.project);
  const userRole = project.getMemberRole(req.user._id);

  // Author, project owner/lead, or admin can delete
  if (
    comment.author.toString() !== req.user._id.toString() &&
    !['owner', 'lead'].includes(userRole) &&
    req.user.role !== 'admin'
  ) {
    throw new ForbiddenError('You do not have permission to delete this comment');
  }

  // Soft delete
  comment.isDeleted = true;
  comment.deletedAt = new Date();
  comment.content = '[Comment deleted]';
  await comment.save();

  res.json({
    success: true,
    message: 'Comment deleted',
  });
});

/**
 * @desc    Add reaction to comment
 * @route   POST /api/v1/comments/:id/reactions
 * @access  Private
 */
export const addReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Check if user already reacted with this emoji
  const existingReaction = comment.reactions.find(
    (r) =>
      r.user.toString() === req.user._id.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    // Remove reaction (toggle off)
    comment.reactions = comment.reactions.filter(
      (r) =>
        !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
    );
  } else {
    // Add reaction
    comment.reactions.push({
      emoji,
      user: req.user._id,
    });
  }

  await comment.save();
  await comment.populate('reactions.user', 'firstName lastName avatar');

  res.json({
    success: true,
    message: existingReaction ? 'Reaction removed' : 'Reaction added',
    data: { reactions: comment.reactions },
  });
});

/**
 * @desc    Get comment by ID
 * @route   GET /api/v1/comments/:id
 * @access  Private
 */
export const getComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id)
    .populate('author', 'firstName lastName avatar')
    .populate('mentions', 'firstName lastName avatar')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: { path: 'author', select: 'firstName lastName avatar' },
    });

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Verify access through task and project
  const task = await Task.findById(comment.task);
  const project = await Project.findById(task.project);

  if (!project.isMember(req.user._id) && project.visibility === 'private') {
    throw new ForbiddenError('You do not have access to this comment');
  }

  res.json({
    success: true,
    data: { comment },
  });
});
