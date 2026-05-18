import { ApiError } from '../utils/errors.js';

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(message, 400);
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} '${value}' already exists`;
  return new ApiError(message, 409);
};

/**
 * Handle Mongoose validation error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  const message = 'Validation failed';
  return new ApiError(message, 422, errors);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new ApiError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new ApiError('Token has expired. Please log in again.', 401);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    errors: err.errors || null,
    stack: err.stack,
    error: err,
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || null,
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    console.error('ERROR 💥:', err);

    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 not found
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export { errorHandler, notFound };
