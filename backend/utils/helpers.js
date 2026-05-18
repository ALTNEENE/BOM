/**
 * Async handler wrapper to avoid try-catch in every controller
 * @param {Function} fn - Async function to wrap
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build pagination response
 * @param {Object} options - Pagination options
 */
export const buildPagination = ({ page, limit, total }) => {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build query filters from request query parameters
 * @param {Object} query - Request query object
 * @param {Array} allowedFields - Fields allowed for filtering
 */
export const buildFilters = (query, allowedFields) => {
  const filters = {};

  allowedFields.forEach((field) => {
    if (query[field] !== undefined) {
      filters[field] = query[field];
    }
  });

  return filters;
};

/**
 * Build sort object from query string
 * @param {string} sortString - Sort string (e.g., "-createdAt,name")
 */
export const buildSort = (sortString, defaultSort = '-createdAt') => {
  if (!sortString) return defaultSort;

  return sortString
    .split(',')
    .map((field) => field.trim())
    .join(' ');
};

/**
 * Remove undefined/null values from an object
 * @param {Object} obj - Object to clean
 */
export const cleanObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  );
};

/**
 * Pick specific fields from an object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to pick
 */
export const pick = (obj, fields) => {
  return fields.reduce((acc, field) => {
    if (obj.hasOwnProperty(field)) {
      acc[field] = obj[field];
    }
    return acc;
  }, {});
};

/**
 * Omit specific fields from an object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to omit
 */
export const omit = (obj, fields) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !fields.includes(key))
  );
};

/**
 * Generate random string
 * @param {number} length - String length
 */
export const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date for API response
 * @param {Date} date - Date to format
 */
export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

/**
 * Check if string is valid MongoDB ObjectId
 * @param {string} id - String to check
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sleep helper for delays
 * @param {number} ms - Milliseconds to sleep
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sanitize user object for response (remove sensitive fields)
 * @param {Object} user - User object
 */
export const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.refreshTokens;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpires;
  return userObj;
};
