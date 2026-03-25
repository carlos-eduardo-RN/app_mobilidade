/**
 * Errors Domain
 * Erros customizados do sistema
 */

export enum ErrorCode {
  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_USER_ROLE = 'INVALID_USER_ROLE',
  
  // Ride Errors
  RIDE_NOT_FOUND = 'RIDE_NOT_FOUND',
  INVALID_RIDE_STATE = 'INVALID_RIDE_STATE',
  RIDE_ALREADY_ASSIGNED = 'RIDE_ALREADY_ASSIGNED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  
  // Driver Errors
  DRIVER_NOT_FOUND = 'DRIVER_NOT_FOUND',
  DRIVER_ALREADY_BUSY = 'DRIVER_ALREADY_BUSY',
  DRIVER_OFFLINE = 'DRIVER_OFFLINE',
  DRIVER_INVALID_LOCATION = 'DRIVER_INVALID_LOCATION',
  
  // Matching Errors
  NO_DRIVERS_AVAILABLE = 'NO_DRIVERS_AVAILABLE',
  MATCHING_TIMEOUT = 'MATCHING_TIMEOUT',
  
  // Timeout Errors
  DRIVER_ACCEPT_TIMEOUT = 'DRIVER_ACCEPT_TIMEOUT',
  RIDE_INACTIVITY_TIMEOUT = 'RIDE_INACTIVITY_TIMEOUT',
  GLOBAL_TIMEOUT = 'GLOBAL_TIMEOUT',
  
  // Location Errors
  INVALID_LOCATION = 'INVALID_LOCATION',
  LOCATION_NOT_FOUND = 'LOCATION_NOT_FOUND',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}

export class ApplicationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404);
    this.name = 'NotFoundError';
  }
}

export class StateTransitionError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message, 409, details);
    this.name = 'StateTransitionError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(code, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class TimeoutError extends ApplicationError {
  constructor(
    code: ErrorCode = ErrorCode.GLOBAL_TIMEOUT,
    message: string = 'Operação excedeu timeout',
    details?: Record<string, any>
  ) {
    super(code, message, 408, details);
    this.name = 'TimeoutError';
  }
}
