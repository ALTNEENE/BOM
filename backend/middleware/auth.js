import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { asyncHandler } from '../utils/helpers.js';

/**
 * Protect routes - verify JWT token
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new UnauthorizedError('Please log in to access this resource');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    throw error;
  }
});

/**
 * Optional authentication - attach user if token exists, but don't require it
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid or expired - continue without user
    }
  }

  next();
});

/**
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Please log in to access this resource');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Please log in to access this resource');
  }

  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  next();
};

/**
 * Check if user is admin or manager
 */
export const isManagerOrAdmin = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Please log in to access this resource');
  }

  if (!['admin', 'manager'].includes(req.user.role)) {
    throw new ForbiddenError('Manager or admin access required');
  }

  next();
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = asyncHandler(async (req, res, next) => {
  const refreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
    );

    if (!tokenExists) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    throw error;
  }
});
