import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// Indexes
// commentSchema.index({ task: 1, createdAt: -1 });
// commentSchema.index({ author: 1 });
// commentSchema.index({ parentComment: 1 });

// Pre-save hook to track edits
commentSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static method to get comments with nested replies
commentSchema.statics.getTaskComments = async function (taskId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const comments = await this.find({
    task: taskId,
    parentComment: null,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'firstName lastName avatar')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: { path: 'author', select: 'firstName lastName avatar' },
    });

  const total = await this.countDocuments({
    task: taskId,
    parentComment: null,
    isDeleted: false,
  });

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
