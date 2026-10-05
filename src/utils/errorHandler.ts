/**
 * errorHandler.ts
 *
 * Centralized error handling and logging for HomeCare237
 * Provides consistent error management across the application
 */

export const ErrorType = {
  NETWORK: "NETWORK",
  AUTHENTICATION: "AUTHENTICATION",
  AUTHORIZATION: "AUTHORIZATION",
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  SERVER: "SERVER",
  CLIENT: "CLIENT",
  UNKNOWN: "UNKNOWN"
} as const;

export const ErrorSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];
export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  stack?: string;
  userContext?: {
    userId?: string;
    role?: string;
    action?: string;
  };
}

class ErrorHandler {
  private errors: AppError[] = [];
  private maxErrors = 100;
  private errorCallbacks: ((error: AppError) => void)[] = [];

  /**
   * Creates a standardized error object
   */
  createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any,
    code?: string
  ): AppError {
    return {
      type,
      severity,
      message,
      code,
      details,
      timestamp: new Date(),
      stack: new Error().stack
    };
  }

  /**
   * Logs an error to the system
   */
  log(error: AppError, userContext?: AppError["userContext"]): void {
    const errorWithContext = {
      ...error,
      userContext: {
        ...userContext,
        userId: userContext?.userId || "anonymous"
      }
    };

    // Add to internal error log
    this.errors.push(errorWithContext);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Console logging based on severity
    const logMethod = this.getLogMethod(error.severity);
    logMethod(`[${error.type}] ${error.message}`, errorWithContext);

    // Notify registered callbacks
    this.errorCallbacks.forEach(callback => callback(errorWithContext));

    // In production, send to error tracking service
    if (import.meta.env.PROD && error.severity === ErrorSeverity.CRITICAL) {
      this.sendToErrorTracking(errorWithContext);
    }
  }

  /**
   * Handles caught exceptions
   */
  handleException(error: Error, context?: any): void {
    const appError = this.createError(
      ErrorType.UNKNOWN,
      error.message || "An unexpected error occurred",
      ErrorSeverity.HIGH,
      context
    );
    appError.stack = error.stack;
    this.log(appError);
  }

  /**
   * Handles API errors
   */
  handleApiError(
    response: Response,
    defaultMessage: string = "API request failed"
  ): AppError {
    const type = this.getErrorTypeFromStatus(response.status);
    const severity = this.getSeverityFromStatus(response.status);
    
    return this.createError(
      type,
      `${defaultMessage}: ${response.statusText}`,
      severity,
      { status: response.status, url: response.url },
      `HTTP_${response.status}`
    );
  }

  /**
   * Handles validation errors
   */
  handleValidationError(field: string, message: string): AppError {
    return this.createError(
      ErrorType.VALIDATION,
      `Validation error for ${field}: ${message}`,
      ErrorSeverity.LOW,
      { field }
    );
  }

  /**
   * Registers a callback for error notifications
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Gets recent errors
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errors.slice(-count);
  }

  /**
   * Clears error log
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Gets appropriate console method for severity
   */
  private getLogMethod(severity: ErrorSeverity): (...args: any[]) => void {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.debug;
      case ErrorSeverity.MEDIUM:
        return console.info;
      case ErrorSeverity.HIGH:
        return console.warn;
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Maps HTTP status to error type
   */
  private getErrorTypeFromStatus(status: number): any {
    if (status >= 400 && status < 500) {
      if (status === 401) return ErrorType.AUTHENTICATION;
      if (status === 403) return ErrorType.AUTHORIZATION;
      if (status === 404) return ErrorType.NOT_FOUND;
      if (status === 422) return ErrorType.VALIDATION;
      return ErrorType.CLIENT;
    }
    if (status >= 500) return ErrorType.SERVER;
    return ErrorType.NETWORK;
  }

  /**
   * Maps HTTP status to error severity
   */
  private getSeverityFromStatus(status: number): any {
    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status >= 400 && status < 500) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Sends error to external tracking service (placeholder)
   */
  private sendToErrorTracking(error: AppError): void {
    // In production, integrate with services like Sentry, LogRocket, etc.
    // For now, we'll just log to console
    console.log("[Error Tracking]", error);
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Higher-order function to wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { userId?: string; role?: string; action?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        errorHandler.handleException(error, context);
      } else {
        errorHandler.log(
          errorHandler.createError(
            ErrorType.UNKNOWN,
            String(error),
            ErrorSeverity.MEDIUM,
            context
          ),
          context
        );
      }
      throw error;
    }
  }) as T;
}

/**
 * Error Boundary component props (for React implementation)
 */
export interface ErrorBoundaryProps {
  children: any;
  fallback?: any;
  onError?: (error: Error, errorInfo: any) => void;
}

/**
 * Custom error types for specific scenarios
 */
export class AuthenticationError extends Error {
  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Authorization failed") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string = "Validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends Error {
  constructor(message: string = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}