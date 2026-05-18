import crypto from 'crypto';
import { User, Activity } from '../models/index.js';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import { asyncHandler, sanitizeUser } from '../utils/helpers.js';
import emailService from '../utils/email.js';

/**
 * Set token cookies helper
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
  });

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send welcome email
  try {
    await emailService.sendWelcome(user);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await emailService.sendEmailVerification(user, verificationUrl);
  } catch (error) {
    console.error('Email sending failed:', error);
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  await user.save({ validateBeforeSave: false });

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: sanitizeUser(user),
      accessToken,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  // Update last login
  user.lastLogin = new Date();

  // Clean expired refresh tokens
  user.cleanExpiredRefreshTokens();

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  await user.save({ validateBeforeSave: false });

  // Log activity
  await Activity.log({
    type: 'user.logged_in',
    actor: user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: sanitizeUser(user),
      accessToken,
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken && req.user) {
    // Remove refresh token from database
    req.user.refreshTokens = req.user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken
    );
    await req.user.save({ validateBeforeSave: false });

    // Log activity
    await Activity.log({
      type: 'user.logged_out',
      actor: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Clear cookies
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // Note: verifyRefreshToken middleware attaches user and refreshToken to req
  const { user, refreshToken: oldRefreshToken } = req;

  // Remove old refresh token
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.token !== oldRefreshToken
  );

  // Generate new tokens
  const accessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  // Save new refresh token
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  await user.save({ validateBeforeSave: false });

  // Set cookies
  setTokenCookies(res, accessToken, newRefreshToken);

  res.json({
    success: true,
    data: {
      accessToken,
    },
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
});

/**
 * @desc    Forgot password - send reset email
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists or not
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent',
    });
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send email
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await emailService.sendPasswordReset(user, resetUrl);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent',
    });
  } catch (error) {
    // Clear reset token on email failure
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new Error('Failed to send password reset email');
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Invalidate all refresh tokens (security measure)
  user.refreshTokens = [];

  await user.save();

  // Log activity
  await Activity.log({
    type: 'user.password_changed',
    actor: user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * @desc    Resend email verification
 * @route   POST /api/v1/auth/resend-verification
 * @access  Private
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isEmailVerified) {
    throw new BadRequestError('Email is already verified');
  }

  // Generate new verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send email
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await emailService.sendEmailVerification(user, verificationUrl);

    res.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    throw new Error('Failed to send verification email');
  }
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Set new password
  user.password = newPassword;

  // Invalidate all refresh tokens except current
  const currentRefreshToken = req.cookies?.refreshToken;
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.token === currentRefreshToken
  );

  await user.save();

  // Log activity
  await Activity.log({
    type: 'user.password_changed',
    actor: user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
export const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // Clear all refresh tokens
  user.refreshTokens = [];
  await user.save({ validateBeforeSave: false });

  // Clear cookies
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({
    success: true,
    message: 'Logged out from all devices',
  });
});
