import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'task.assigned',
        'task.due_soon',
        'task.overdue',
        'task.completed',
        'task.comment',
        'task.mention',
        'project.invited',
        'project.removed',
        'project.update',
        'team.invited',
        'team.joined',
        'team.removed',
        'system.announcement',
        'system.maintenance',
      ],
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    data: {
      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
      team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
      comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      actionUrl: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// notificationSchema.index({ recipient: 1, createdAt: -1 });
// notificationSchema.index({ type: 1 });

// TTL index to auto-delete old read notifications (optional - 30 days)
// notificationSchema.index(
//   { readAt: 1 },
//   { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { isRead: true } }
// );

// Pre-save hook to set readAt
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static method to create notification
notificationSchema.statics.notify = async function (data) {
  return await this.create(data);
};

// Static method to create bulk notifications
notificationSchema.statics.notifyMany = async function (recipients, notificationData) {
  const notifications = recipients.map((recipientId) => ({
    ...notificationData,
    recipient: recipientId,
  }));
  return await this.insertMany(notifications);
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;

  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('data.actor', 'firstName lastName avatar')
    .populate('data.project', 'name slug')
    .populate('data.task', 'title')
    .populate('data.team', 'name slug');

  const total = await this.countDocuments(query);
  const unreadCount = await this.countDocuments({ recipient: userId, isRead: false });

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function (userId, notificationIds = null) {
  const query = { recipient: userId, isRead: false };
  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return await this.updateMany(query, {
    isRead: true,
    readAt: new Date(),
  });
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
