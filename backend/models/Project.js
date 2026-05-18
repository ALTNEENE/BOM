import mongoose from 'mongoose';
import slugify from 'slugify';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner is required'],
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['viewer', 'member', 'lead'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    budget: {
      estimated: {
        type: Number,
        min: 0,
      },
      spent: {
        type: Number,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    color: {
      type: String,
      default: '#3B82F6',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ['private', 'team', 'public'],
      default: 'team',
    },
    settings: {
      allowMemberInvites: { type: Boolean, default: false },
      taskApprovalRequired: { type: Boolean, default: false },
      autoArchiveDays: { type: Number, default: 30 },
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for task count (populated from Task model)
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  justOne: false,
});

// Indexes
// projectSchema.index({ slug: 1 });
// projectSchema.index({ owner: 1 });
// projectSchema.index({ status: 1 });
// projectSchema.index({ 'members.user': 1 });
// projectSchema.index({ isArchived: 1 });
// projectSchema.index({ createdAt: -1 });

// Generate slug before saving
projectSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.model('Project').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  next();
});

// Update completedDate when status changes to completed
projectSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedDate) {
      this.completedDate = new Date();
    } else if (this.status !== 'completed') {
      this.completedDate = null;
    }
  }
  next();
});

// Static method to calculate project progress
projectSchema.statics.calculateProgress = async function (projectId) {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project: projectId });

  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

// Method to check if user is a member
projectSchema.methods.isMember = function (userId) {
  return (
    this.owner.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString())
  );
};

// Method to get user's role in project
projectSchema.methods.getMemberRole = function (userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
