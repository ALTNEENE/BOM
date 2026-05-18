/**
 * Custom API Error class for handling operational errors
 */
class ApiError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors = null) {
    super(message, 400, errors);
  }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Validation Error (422)
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 422, errors);
  }
}

/**
 * Too Many Requests Error (429)
 */
class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
};
