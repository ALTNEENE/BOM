import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    checklist: [
      {
        text: {
          type: String,
          required: true,
          maxlength: 500,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    order: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subtasks
taskSchema.virtual('subtasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'parentTask',
});

// Virtual for comments
taskSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'task',
});

// Virtual for checklist progress
taskSchema.virtual('checklistProgress').get(function () {
  if (!this.checklist || this.checklist.length === 0) return null;
  const completed = this.checklist.filter((item) => item.isCompleted).length;
  return {
    completed,
    total: this.checklist.length,
    percentage: Math.round((completed / this.checklist.length) * 100),
  };
});

// Virtual to check if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > new Date(this.dueDate);
});

// Indexes
// taskSchema.index({ project: 1, status: 1 });
// taskSchema.index({ assignee: 1 });
// taskSchema.index({ reporter: 1 });
// taskSchema.index({ dueDate: 1 });
// taskSchema.index({ status: 1 });
// taskSchema.index({ parentTask: 1 });
// taskSchema.index({ isArchived: 1 });
// taskSchema.index({ createdAt: -1 });
// taskSchema.index({ project: 1, order: 1 });

// Update completedAt when status changes
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

// Update project progress after task save
taskSchema.post('save', async function () {
  const Project = mongoose.model('Project');
  const progress = await Project.calculateProgress(this.project);
  await Project.findByIdAndUpdate(this.project, { progress });
});

// Update project progress after task delete
taskSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Project = mongoose.model('Project');
    const progress = await Project.calculateProgress(doc.project);
    await Project.findByIdAndUpdate(doc.project, { progress });
  }
});

// Static method to get task statistics for a project
taskSchema.statics.getProjectStats = async function (projectId) {
  const stats = await this.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId), isArchived: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    todo: 0,
    'in-progress': 0,
    review: 0,
    completed: 0,
    blocked: 0,
    total: 0,
  };

  stats.forEach((s) => {
    result[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
