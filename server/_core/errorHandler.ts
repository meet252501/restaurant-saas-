/**
 * CENTRALIZED ERROR HANDLER
 * Handles errors from third-party services (Twilio, Razorpay, etc.)
 * Provides retry logic, fallbacks, and detailed logging
 */

import { db } from "../db";

export interface ErrorLog {
  id: string;
  service: 'twilio' | 'razorpay' | 'database' | 'api';
  errorCode: string;
  errorMessage: string;
  context: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

class ErrorHandler {
  private errorLogs: Map<string, ErrorLog> = new Map();

  /**
   * Log an error with retry capability
   */
  async logError(
    service: ErrorLog['service'],
    errorCode: string,
    errorMessage: string,
    context: Record<string, any>,
    maxRetries: number = 3
  ): Promise<ErrorLog> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorLog: ErrorLog = {
      id: errorId,
      service,
      errorCode,
      errorMessage,
      context,
      retryCount: 0,
      maxRetries,
      nextRetryAt: null,
      resolvedAt: null,
      createdAt: new Date(),
    };

    this.errorLogs.set(errorId, errorLog);

    // Log to console for immediate visibility
    console.error(`[${service.toUpperCase()}] ${errorCode}: ${errorMessage}`, context);

    // TODO: Send to error tracking service (Sentry, DataDog, etc.)
    // await this.sendToErrorTracking(errorLog);

    return errorLog;
  }

  /**
   * Retry a failed operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[RETRY] Attempt ${attempt}/${maxRetries} failed. Error: ${lastError.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          console.log(`[RETRY] Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Handle Twilio SMS/Call errors
   */
  async handleTwilioError(
    errorCode: string,
    errorMessage: string,
    context: { phoneNumber: string; messageType: 'sms' | 'call'; bookingId: string }
  ): Promise<{ shouldRetry: boolean; fallback: string }> {
    const errorLog = await this.logError('twilio', errorCode, errorMessage, context);

    // Twilio-specific error handling
    switch (errorCode) {
      case '21211':
        // Invalid phone number
        return {
          shouldRetry: false,
          fallback: `Invalid phone number: ${context.phoneNumber}. Please verify the customer contact.`,
        };

      case '20003':
        // Authentication error
        return {
          shouldRetry: true,
          fallback: 'SMS service temporarily unavailable. Will retry shortly.',
        };

      case '21602':
        // Message too long
        return {
          shouldRetry: false,
          fallback: 'Message too long. Please shorten the booking confirmation message.',
        };

      default:
        // Unknown error - retry
        return {
          shouldRetry: true,
          fallback: 'SMS delivery failed. Will retry shortly.',
        };
    }
  }

  /**
   * Handle Razorpay payment errors
   */
  async handleRazorpayError(
    errorCode: string,
    errorMessage: string,
    context: { bookingId: string; amount: number; customerId: string }
  ): Promise<{ shouldRetry: boolean; userMessage: string }> {
    const errorLog = await this.logError('razorpay', errorCode, errorMessage, context);

    // Razorpay-specific error handling
    switch (errorCode) {
      case 'BAD_REQUEST_ERROR':
        return {
          shouldRetry: false,
          userMessage: 'Invalid payment details. Please check the amount and try again.',
        };

      case 'GATEWAY_ERROR':
        return {
          shouldRetry: true,
          userMessage: 'Payment gateway temporarily unavailable. Please try again in a moment.',
        };

      case 'AUTHENTICATION_ERROR':
        return {
          shouldRetry: false,
          userMessage: 'Payment service authentication failed. Please contact support.',
        };

      case 'NETWORK_ERROR':
        return {
          shouldRetry: true,
          userMessage: 'Network error. Please check your connection and try again.',
        };

      default:
        return {
          shouldRetry: true,
          userMessage: 'Payment processing failed. Please try again.',
        };
    }
  }

  /**
   * Handle database errors
   */
  async handleDatabaseError(
    errorCode: string,
    errorMessage: string,
    context: { operation: string; table: string }
  ): Promise<{ shouldRetry: boolean; fallback: string }> {
    const errorLog = await this.logError('database', errorCode, errorMessage, context);

    // Database-specific error handling
    if (errorMessage.includes('UNIQUE constraint failed')) {
      return {
        shouldRetry: false,
        fallback: 'This record already exists. Please check your data.',
      };
    }

    if (errorMessage.includes('FOREIGN KEY constraint failed')) {
      return {
        shouldRetry: false,
        fallback: 'Invalid reference. Please check the related records.',
      };
    }

    if (errorMessage.includes('database is locked')) {
      return {
        shouldRetry: true,
        fallback: 'Database temporarily locked. Please try again.',
      };
    }

    // Default: retry
    return {
      shouldRetry: true,
      fallback: 'Database operation failed. Please try again.',
    };
  }

  /**
   * Get error status for UI display
   */
  getErrorStatus(errorId: string): ErrorLog | null {
    return this.errorLogs.get(errorId) || null;
  }

  /**
   * Get all unresolved errors
   */
  getUnresolvedErrors(): ErrorLog[] {
    return Array.from(this.errorLogs.values()).filter(e => !e.resolvedAt);
  }

  /**
   * Mark error as resolved
   */
  markErrorResolved(errorId: string): void {
    const errorLog = this.errorLogs.get(errorId);
    if (errorLog) {
      errorLog.resolvedAt = new Date();
    }
  }

  /**
   * Clear old error logs (older than 24 hours)
   */
  clearOldLogs(ageHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - ageHours * 60 * 60 * 1000);

    for (const [errorId, errorLog] of this.errorLogs.entries()) {
      if (errorLog.createdAt < cutoffTime && errorLog.resolvedAt) {
        this.errorLogs.delete(errorId);
      }
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
