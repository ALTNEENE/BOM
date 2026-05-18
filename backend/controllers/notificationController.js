import { Notification } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { asyncHandler } from '../utils/helpers.js';

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

  const result = await Notification.getUserNotifications(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    unreadOnly: unreadOnly === 'true',
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user._id);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You can only mark your own notifications as read');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.markAsRead(req.user._id);

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
  });
});

/**
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/v1/notifications/read-many
 * @access  Private
 */
export const markManyAsRead = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new BadRequestError('Notification IDs array is required');
  }

  const result = await Notification.markAsRead(req.user._id, notificationIds);

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You can only delete your own notifications');
  }

  await notification.deleteOne();

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/v1/notifications/clear-read
 * @access  Private
 */
export const clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    recipient: req.user._id,
    isRead: true,
  });

  res.json({
    success: true,
    message: `${result.deletedCount} read notifications cleared`,
  });
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/v1/notifications/clear-all
 * @access  Private
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    recipient: req.user._id,
  });

  res.json({
    success: true,
    message: `${result.deletedCount} notifications cleared`,
  });
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/v1/notifications/preferences
 * @access  Private
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const preferences = req.user.preferences?.notifications || {
    email: true,
    push: true,
    taskReminders: true,
    projectUpdates: true,
  };

  res.json({
    success: true,
    data: { preferences },
  });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/v1/notifications/preferences
 * @access  Private
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { email, push, taskReminders, projectUpdates } = req.body;

  const updates = {};
  if (email !== undefined) updates['preferences.notifications.email'] = email;
  if (push !== undefined) updates['preferences.notifications.push'] = push;
  if (taskReminders !== undefined)
    updates['preferences.notifications.taskReminders'] = taskReminders;
  if (projectUpdates !== undefined)
    updates['preferences.notifications.projectUpdates'] = projectUpdates;

  const User = (await import('../models/User.js')).default;
  await User.findByIdAndUpdate(req.user._id, { $set: updates });

  res.json({
    success: true,
    message: 'Notification preferences updated',
  });
});
