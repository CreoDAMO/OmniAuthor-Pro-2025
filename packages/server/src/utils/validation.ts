import { UserInputError } from 'apollo-server-express';

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateInput(input: any, rules: ValidationRule[]): void {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = input[rule.field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(rule.message || `${rule.field} is required`);
      continue;
    }

    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Check minimum length
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push(rule.message || `${rule.field} must be at least ${rule.minLength} characters long`);
    }

    // Check maximum length
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(rule.message || `${rule.field} must be no more than ${rule.maxLength} characters long`);
    }

    // Check pattern
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(rule.message || `${rule.field} format is invalid`);
    }

    // Check custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push(rule.message || `${rule.field} is invalid`);
    }
  }

  if (errors.length > 0) {
    throw new UserInputError('Validation failed', { validationErrors: errors });
  }
}

// Common validation rules
export const emailRule: ValidationRule = {
  field: 'email',
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: 'Please provide a valid email address'
};

export const passwordRule: ValidationRule = {
  field: 'password',
  required: true,
  minLength: 8,
  message: 'Password must be at least 8 characters long'
};

export const nameRule: ValidationRule = {
  field: 'name',
  required: true,
  minLength: 2,
  maxLength: 50,
  message: 'Name must be between 2 and 50 characters'
};

export const titleRule: ValidationRule = {
  field: 'title',
  required: true,
  minLength: 1,
  maxLength: 200,
  message: 'Title must be between 1 and 200 characters'
};

export const contentRule: ValidationRule = {
  field: 'content',
  maxLength: 50000,
  message: 'Content must be no more than 50,000 characters'
};

// Validation helper functions
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
