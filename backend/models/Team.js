import mongoose from 'mongoose';
import slugify from 'slugify';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team owner is required'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['member', 'moderator', 'admin'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    avatar: {
      type: String,
    },
    color: {
      type: String,
      default: '#6366F1',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      isPublic: { type: Boolean, default: false },
      allowMemberInvites: { type: Boolean, default: true },
      defaultProjectVisibility: {
        type: String,
        enum: ['private', 'team', 'public'],
        default: 'team',
      },
    },
    inviteCode: {
      code: String,
      expiresAt: Date,
      usageLimit: Number,
      usageCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for member count
teamSchema.virtual('memberCount').get(function () {
  return this.members.length + 1; // +1 for owner
});

// Virtual for projects
teamSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'team',
});

// Indexes
// teamSchema.index({ slug: 1 });
// teamSchema.index({ owner: 1 });
// teamSchema.index({ 'members.user': 1 });
// teamSchema.index({ 'inviteCode.code': 1 });

// Generate slug before saving
teamSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.model('Team').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  next();
});

// Method to check if user is a member
teamSchema.methods.isMember = function (userId) {
  const ownerId = this.owner?._id || this.owner;
  if (ownerId && ownerId.toString() === userId.toString()) return true;
  
  return this.members.some((m) => {
    const memberId = m.user?._id || m.user;
    return memberId && memberId.toString() === userId.toString();
  });
};

// Method to get user's role in team
teamSchema.methods.getMemberRole = function (userId) {
  const ownerId = this.owner?._id || this.owner;
  if (ownerId && ownerId.toString() === userId.toString()) return 'owner';
  
  const member = this.members.find((m) => {
    const memberId = m.user?._id || m.user;
    return memberId && memberId.toString() === userId.toString();
  });
  return member ? member.role : null;
};

// Method to generate invite code
teamSchema.methods.generateInviteCode = function (expiresInDays = 7, usageLimit = null) {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  this.inviteCode = {
    code,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    usageLimit,
    usageCount: 0,
  };
  return code;
};

// Method to check if invite code is valid
teamSchema.methods.isInviteCodeValid = function (code) {
  if (!this.inviteCode || !this.inviteCode.code) return false;
  if (this.inviteCode.code !== code) return false;
  if (new Date() > this.inviteCode.expiresAt) return false;
  if (
    this.inviteCode.usageLimit !== null &&
    this.inviteCode.usageCount >= this.inviteCode.usageLimit
  ) {
    return false;
  }
  return true;
};

const Team = mongoose.model('Team', teamSchema);

export default Team;
