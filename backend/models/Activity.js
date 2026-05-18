import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        // Project activities
        'project.created',
        'project.updated',
        'project.deleted',
        'project.archived',
        'project.member_added',
        'project.member_removed',
        'project.member_role_changed',
        // Task activities
        'task.created',
        'task.updated',
        'task.deleted',
        'task.status_changed',
        'task.assigned',
        'task.unassigned',
        'task.comment_added',
        'task.attachment_added',
        'task.attachment_removed',
        // Team activities
        'team.created',
        'team.updated',
        'team.member_joined',
        'team.member_left',
        'team.member_role_changed',
        // User activities
        'user.logged_in',
        'user.logged_out',
        'user.profile_updated',
        'user.password_changed',
      ],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });
activitySchema.index({ team: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// TTL index to automatically delete old activities (optional - 90 days)
// activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log activity
activitySchema.statics.log = async function (data) {
  return await this.create(data);
};

// Static method to get project timeline
activitySchema.statics.getProjectTimeline = async function (projectId, options = {}) {
  const { page = 1, limit = 20, types } = options;

  const query = { project: projectId };
  if (types && types.length > 0) {
    query.type = { $in: types };
  }

  const activities = await this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('actor', 'firstName lastName avatar')
    .populate('targetUser', 'firstName lastName avatar')
    .populate('task', 'title');

  const total = await this.countDocuments(query);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to get user activity feed
activitySchema.statics.getUserFeed = async function (userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  // Get user's projects and teams
  const Project = mongoose.model('Project');
  const Team = mongoose.model('Team');

  const userProjects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id');

  const userTeams = await Team.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id');

  const projectIds = userProjects.map((p) => p._id);
  const teamIds = userTeams.map((t) => t._id);

  const activities = await this.find({
    $or: [
      { project: { $in: projectIds } },
      { team: { $in: teamIds } },
      { actor: userId },
      { targetUser: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('actor', 'firstName lastName avatar')
    .populate('project', 'name slug')
    .populate('task', 'title')
    .populate('team', 'name slug');

  return activities;
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
