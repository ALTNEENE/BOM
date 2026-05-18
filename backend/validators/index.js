import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

/**
 * Validate request and throw error if validation fails
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    throw new ValidationError('Validation failed', formattedErrors);
  }
  next();
};

/**
 * User validation rules
 */
export const userValidation = {
  register: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    validate,
  ],
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department cannot exceed 100 characters'),
    body('jobTitle')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Job title cannot exceed 100 characters'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number cannot exceed 20 characters'),
    validate,
  ],
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Please confirm your password')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
    validate,
  ],
  forgotPassword: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    validate,
  ],
  resetPassword: [
    param('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    validate,
  ],
};

/**
 * Project validation rules
 */
export const projectValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ max: 100 })
      .withMessage('Project name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('status')
      .optional()
      .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage('Invalid color format'),
    body('visibility')
      .optional()
      .isIn(['private', 'team', 'public'])
      .withMessage('Invalid visibility'),
    validate,
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid project ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Project name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('status')
      .optional()
      .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    validate,
  ],
  addMember: [
    param('id').isMongoId().withMessage('Invalid project ID'),
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('role')
      .optional()
      .isIn(['viewer', 'member', 'lead'])
      .withMessage('Invalid role'),
    validate,
  ],
};

/**
 * Task validation rules
 */
export const taskValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 200 })
      .withMessage('Task title cannot exceed 200 characters'),
    body('project')
      .notEmpty()
      .withMessage('Project is required')
      .isMongoId()
      .withMessage('Invalid project ID'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'completed', 'blocked'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('assignee')
      .optional()
      .isMongoId()
      .withMessage('Invalid assignee ID'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('estimatedHours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated hours must be a positive number'),
    validate,
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Task title cannot exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'completed', 'blocked'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    validate,
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['todo', 'in-progress', 'review', 'completed', 'blocked'])
      .withMessage('Invalid status'),
    validate,
  ],
};

/**
 * Comment validation rules
 */
export const commentValidation = {
  create: [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Comment content is required')
      .isLength({ max: 5000 })
      .withMessage('Comment cannot exceed 5000 characters'),
    body('taskId')
      .notEmpty()
      .withMessage('Task ID is required')
      .isMongoId()
      .withMessage('Invalid task ID'),
    body('parentComment')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent comment ID'),
    validate,
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid comment ID'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Comment content is required')
      .isLength({ max: 5000 })
      .withMessage('Comment cannot exceed 5000 characters'),
    validate,
  ],
};

/**
 * Team validation rules
 */
export const teamValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Team name is required')
      .isLength({ max: 100 })
      .withMessage('Team name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage('Invalid color format'),
    validate,
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid team ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Team name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    validate,
  ],
  addMember: [
    param('id').isMongoId().withMessage('Invalid team ID'),
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('role')
      .optional()
      .isIn(['member', 'moderator', 'admin'])
      .withMessage('Invalid role'),
    validate,
  ],
};

/**
 * Common pagination validation
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

/**
 * MongoDB ObjectId validation
 */
export const objectIdValidation = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  validate,
];
