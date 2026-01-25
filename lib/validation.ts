/**
 * Input Validation & Sanitization Library
 *
 * Provides schema-based validation, type checking, length limits, and sanitization
 * for all user inputs following OWASP best practices.
 *
 * SECURITY: All user inputs should be validated before being sent to the database.
 */

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export interface FieldValidation {
  field: string;
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

// =============================================================================
// VALIDATION CONSTANTS - Define limits to prevent abuse
// =============================================================================

export const LIMITS = {
  // Authentication
  EMAIL_MAX_LENGTH: 254,           // RFC 5321 standard
  PASSWORD_MIN_LENGTH: 8,          // OWASP recommendation
  PASSWORD_MAX_LENGTH: 128,        // Prevent DoS via bcrypt
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,

  // Collections
  COLLECTION_NAME_MAX_LENGTH: 100,
  COLLECTION_DESCRIPTION_MAX_LENGTH: 500,

  // Items
  ITEM_NAME_MAX_LENGTH: 200,
  ITEM_FACTION_MAX_LENGTH: 100,
  ITEM_NOTES_MAX_LENGTH: 2000,
  ITEM_QUANTITY_MAX: 10000,        // Reasonable upper limit

  // Social features
  BIO_MAX_LENGTH: 150,
  LOCATION_MAX_LENGTH: 100,
  WEBSITE_URL_MAX_LENGTH: 200,
  COMMENT_MIN_LENGTH: 1,
  COMMENT_MAX_LENGTH: 1000,

  // General
  MAX_SEARCH_QUERY_LENGTH: 100,
  UUID_LENGTH: 36,
} as const;

// =============================================================================
// REGEX PATTERNS - Strict patterns for input validation
// =============================================================================

const PATTERNS = {
  // Email: RFC 5322 simplified pattern
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Username: alphanumeric, underscores, hyphens only
  USERNAME: /^[a-zA-Z0-9_-]+$/,

  // UUID v4 format
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Safe text: no control characters, no null bytes
  SAFE_TEXT: /^[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/,
} as const;

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize string input by trimming and removing dangerous characters
 * SECURITY: Prevents XSS and injection attacks
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove null bytes (prevents null byte injection)
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace (multiple spaces to single)
    .replace(/\s+/g, ' ');
}

/**
 * Sanitize string for display (HTML escape)
 * SECURITY: Prevents XSS when displaying user content
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize number input
 * SECURITY: Ensures value is a valid finite number within bounds
 */
export function sanitizeNumber(
  input: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const num = typeof input === 'number' ? input : parseFloat(String(input));

  if (!Number.isFinite(num)) {
    return null;
  }

  // Clamp to bounds
  return Math.max(min, Math.min(max, Math.floor(num)));
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate email address
 * SECURITY: Strict validation prevents malformed emails
 */
export function validateEmail(email: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof email !== 'string') {
    return { isValid: false, errors: ['Email must be a string'] };
  }

  const sanitized = sanitizeString(email).toLowerCase();

  if (!sanitized) {
    errors.push('Email is required');
  } else if (sanitized.length > LIMITS.EMAIL_MAX_LENGTH) {
    errors.push(`Email must be less than ${LIMITS.EMAIL_MAX_LENGTH} characters`);
  } else if (!PATTERNS.EMAIL.test(sanitized)) {
    errors.push('Please enter a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate password
 * SECURITY: Enforces minimum complexity requirements
 */
export function validatePassword(password: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return { isValid: false, errors: ['Password must be a string'] };
  }

  // Don't sanitize passwords - preserve all characters
  const pwd = password;

  if (!pwd) {
    errors.push('Password is required');
  } else {
    if (pwd.length < LIMITS.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${LIMITS.PASSWORD_MIN_LENGTH} characters`);
    }
    if (pwd.length > LIMITS.PASSWORD_MAX_LENGTH) {
      errors.push(`Password must be less than ${LIMITS.PASSWORD_MAX_LENGTH} characters`);
    }
    // Check for at least one letter and one number (basic complexity)
    if (!/[a-zA-Z]/.test(pwd)) {
      errors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Password must contain at least one number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: pwd,
  };
}

/**
 * Validate username
 * SECURITY: Restricts to safe characters only
 */
export function validateUsername(username: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof username !== 'string') {
    return { isValid: false, errors: ['Username must be a string'] };
  }

  const sanitized = sanitizeString(username);

  if (!sanitized) {
    errors.push('Username is required');
  } else if (sanitized.length < LIMITS.USERNAME_MIN_LENGTH) {
    errors.push(`Username must be at least ${LIMITS.USERNAME_MIN_LENGTH} characters`);
  } else if (sanitized.length > LIMITS.USERNAME_MAX_LENGTH) {
    errors.push(`Username must be less than ${LIMITS.USERNAME_MAX_LENGTH} characters`);
  } else if (!PATTERNS.USERNAME.test(sanitized)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate UUID format
 * SECURITY: Ensures IDs are properly formatted
 */
export function validateUUID(id: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof id !== 'string') {
    return { isValid: false, errors: ['ID must be a string'] };
  }

  const sanitized = sanitizeString(id).toLowerCase();

  if (!sanitized) {
    errors.push('ID is required');
  } else if (!PATTERNS.UUID.test(sanitized)) {
    errors.push('Invalid ID format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate collection name
 */
export function validateCollectionName(name: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof name !== 'string') {
    return { isValid: false, errors: ['Collection name must be a string'] };
  }

  const sanitized = sanitizeString(name);

  if (!sanitized) {
    errors.push('Collection name is required');
  } else if (sanitized.length > LIMITS.COLLECTION_NAME_MAX_LENGTH) {
    errors.push(`Collection name must be less than ${LIMITS.COLLECTION_NAME_MAX_LENGTH} characters`);
  } else if (!PATTERNS.SAFE_TEXT.test(sanitized)) {
    errors.push('Collection name contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate collection description
 */
export function validateCollectionDescription(description: unknown): ValidationResult {
  // Description is optional
  if (description === null || description === undefined || description === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof description !== 'string') {
    return { isValid: false, errors: ['Description must be a string'] };
  }

  const sanitized = sanitizeString(description);

  if (sanitized.length > LIMITS.COLLECTION_DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be less than ${LIMITS.COLLECTION_DESCRIPTION_MAX_LENGTH} characters`);
  } else if (!PATTERNS.SAFE_TEXT.test(sanitized)) {
    errors.push('Description contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate item name
 */
export function validateItemName(name: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof name !== 'string') {
    return { isValid: false, errors: ['Item name must be a string'] };
  }

  const sanitized = sanitizeString(name);

  if (!sanitized) {
    errors.push('Item name is required');
  } else if (sanitized.length > LIMITS.ITEM_NAME_MAX_LENGTH) {
    errors.push(`Item name must be less than ${LIMITS.ITEM_NAME_MAX_LENGTH} characters`);
  } else if (!PATTERNS.SAFE_TEXT.test(sanitized)) {
    errors.push('Item name contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate item faction
 */
export function validateItemFaction(faction: unknown): ValidationResult {
  // Faction is optional
  if (faction === null || faction === undefined || faction === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof faction !== 'string') {
    return { isValid: false, errors: ['Faction must be a string'] };
  }

  const sanitized = sanitizeString(faction);

  if (sanitized.length > LIMITS.ITEM_FACTION_MAX_LENGTH) {
    errors.push(`Faction must be less than ${LIMITS.ITEM_FACTION_MAX_LENGTH} characters`);
  } else if (!PATTERNS.SAFE_TEXT.test(sanitized)) {
    errors.push('Faction contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate item notes
 */
export function validateItemNotes(notes: unknown): ValidationResult {
  // Notes are optional
  if (notes === null || notes === undefined || notes === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof notes !== 'string') {
    return { isValid: false, errors: ['Notes must be a string'] };
  }

  // Allow newlines in notes
  const sanitized = notes.trim().replace(/\0/g, '');

  if (sanitized.length > LIMITS.ITEM_NOTES_MAX_LENGTH) {
    errors.push(`Notes must be less than ${LIMITS.ITEM_NOTES_MAX_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate item quantity/count
 */
export function validateItemQuantity(quantity: unknown, fieldName: string = 'Quantity'): ValidationResult {
  const errors: string[] = [];

  const num = sanitizeNumber(quantity, 0, LIMITS.ITEM_QUANTITY_MAX);

  if (num === null && quantity !== null && quantity !== undefined && quantity !== '') {
    errors.push(`${fieldName} must be a valid number`);
  } else if (num !== null && num < 0) {
    errors.push(`${fieldName} cannot be negative`);
  } else if (num !== null && num > LIMITS.ITEM_QUANTITY_MAX) {
    errors.push(`${fieldName} cannot exceed ${LIMITS.ITEM_QUANTITY_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: num ?? 0,
  };
}

/**
 * Validate game system enum
 */
export function validateGameSystem(system: unknown): ValidationResult {
  const validSystems = ['wh40k', 'aos', 'legion', 'other'];

  if (system === null || system === undefined || system === '') {
    return { isValid: true, errors: [], sanitizedValue: 'other' };
  }

  if (typeof system !== 'string') {
    return { isValid: false, errors: ['Game system must be a string'] };
  }

  const sanitized = sanitizeString(system).toLowerCase();

  if (!validSystems.includes(sanitized)) {
    return {
      isValid: false,
      errors: [`Invalid game system. Must be one of: ${validSystems.join(', ')}`],
    };
  }

  return { isValid: true, errors: [], sanitizedValue: sanitized };
}

/**
 * Validate item status enum
 */
export function validateItemStatus(status: unknown): ValidationResult {
  const validStatuses = ['nib', 'assembled', 'primed', 'painted', 'based'];

  if (status === null || status === undefined || status === '') {
    return { isValid: true, errors: [], sanitizedValue: 'nib' };
  }

  if (typeof status !== 'string') {
    return { isValid: false, errors: ['Status must be a string'] };
  }

  const sanitized = sanitizeString(status).toLowerCase();

  if (!validStatuses.includes(sanitized)) {
    return {
      isValid: false,
      errors: [`Invalid status. Must be one of: ${validStatuses.join(', ')}`],
    };
  }

  return { isValid: true, errors: [], sanitizedValue: sanitized };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: unknown): ValidationResult {
  if (query === null || query === undefined || query === '') {
    return { isValid: true, errors: [], sanitizedValue: '' };
  }

  const errors: string[] = [];

  if (typeof query !== 'string') {
    return { isValid: false, errors: ['Search query must be a string'] };
  }

  const sanitized = sanitizeString(query);

  if (sanitized.length > LIMITS.MAX_SEARCH_QUERY_LENGTH) {
    errors.push(`Search query must be less than ${LIMITS.MAX_SEARCH_QUERY_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate user bio
 */
export function validateBio(bio: unknown): ValidationResult {
  if (bio === null || bio === undefined || bio === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof bio !== 'string') {
    return { isValid: false, errors: ['Bio must be a string'] };
  }

  // Allow newlines in bio
  const sanitized = bio.trim().replace(/\0/g, '');

  if (sanitized.length > LIMITS.BIO_MAX_LENGTH) {
    errors.push(`Bio must be less than ${LIMITS.BIO_MAX_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate user location
 */
export function validateLocation(location: unknown): ValidationResult {
  if (location === null || location === undefined || location === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof location !== 'string') {
    return { isValid: false, errors: ['Location must be a string'] };
  }

  const sanitized = sanitizeString(location);

  if (sanitized.length > LIMITS.LOCATION_MAX_LENGTH) {
    errors.push(`Location must be less than ${LIMITS.LOCATION_MAX_LENGTH} characters`);
  } else if (!PATTERNS.SAFE_TEXT.test(sanitized)) {
    errors.push('Location contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate website URL
 */
export function validateWebsiteUrl(url: unknown): ValidationResult {
  if (url === null || url === undefined || url === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }

  const errors: string[] = [];

  if (typeof url !== 'string') {
    return { isValid: false, errors: ['Website URL must be a string'] };
  }

  const sanitized = sanitizeString(url);

  if (sanitized.length > LIMITS.WEBSITE_URL_MAX_LENGTH) {
    errors.push(`Website URL must be less than ${LIMITS.WEBSITE_URL_MAX_LENGTH} characters`);
  } else {
    // Basic URL validation
    try {
      const parsed = new URL(sanitized.startsWith('http') ? sanitized : `https://${sanitized}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('Website URL must use http or https');
      }
    } catch {
      errors.push('Please enter a valid website URL');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized || null,
  };
}

/**
 * Validate comment content
 */
export function validateComment(content: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof content !== 'string') {
    return { isValid: false, errors: ['Comment must be a string'] };
  }

  // Allow newlines in comments
  const sanitized = content.trim().replace(/\0/g, '');

  if (!sanitized || sanitized.length < LIMITS.COMMENT_MIN_LENGTH) {
    errors.push('Comment cannot be empty');
  } else if (sanitized.length > LIMITS.COMMENT_MAX_LENGTH) {
    errors.push(`Comment must be less than ${LIMITS.COMMENT_MAX_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

// =============================================================================
// SCHEMA-BASED VALIDATION
// =============================================================================

interface SchemaField {
  validate: (value: unknown) => ValidationResult;
  required?: boolean;
}

type Schema = Record<string, SchemaField>;

/**
 * Validate an object against a schema
 * SECURITY: Rejects unexpected fields to prevent mass assignment attacks
 */
export function validateSchema<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema,
  rejectUnexpectedFields: boolean = true
): { isValid: boolean; errors: Record<string, string[]>; sanitizedData: Partial<T> } {
  const errors: Record<string, string[]> = {};
  const sanitizedData: Record<string, unknown> = {};

  if (typeof data !== 'object' || data === null) {
    return {
      isValid: false,
      errors: { _root: ['Data must be an object'] },
      sanitizedData: {} as Partial<T>,
    };
  }

  const inputData = data as Record<string, unknown>;

  // Check for unexpected fields (mass assignment protection)
  if (rejectUnexpectedFields) {
    const unexpectedFields = Object.keys(inputData).filter(
      key => !Object.prototype.hasOwnProperty.call(schema, key)
    );

    if (unexpectedFields.length > 0) {
      errors._unexpected = [`Unexpected fields: ${unexpectedFields.join(', ')}`];
    }
  }

  // Validate each field in schema
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = inputData[field];

    // Check required fields
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors[field] = [`${field} is required`];
      continue;
    }

    // Run field validation
    const result = fieldSchema.validate(value);

    if (!result.isValid) {
      errors[field] = result.errors;
    } else {
      sanitizedData[field] = result.sanitizedValue;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: sanitizedData as Partial<T>,
  };
}

// =============================================================================
// PRE-BUILT SCHEMAS
// =============================================================================

export const SCHEMAS = {
  signUp: {
    email: { validate: validateEmail, required: true },
    password: { validate: validatePassword, required: true },
    username: { validate: validateUsername, required: true },
  },

  signIn: {
    email: { validate: validateEmail, required: true },
    password: { validate: (v: unknown) => ({ isValid: !!v, errors: v ? [] : ['Password is required'], sanitizedValue: v }), required: true },
  },

  collection: {
    name: { validate: validateCollectionName, required: true },
    description: { validate: validateCollectionDescription, required: false },
  },

  item: {
    name: { validate: validateItemName, required: true },
    collection_id: { validate: validateUUID, required: true },
    game_system: { validate: validateGameSystem, required: false },
    faction: { validate: validateItemFaction, required: false },
    quantity: { validate: (v: unknown) => validateItemQuantity(v, 'Quantity'), required: false },
    status: { validate: validateItemStatus, required: false },
    nib_count: { validate: (v: unknown) => validateItemQuantity(v, 'NIB count'), required: false },
    assembled_count: { validate: (v: unknown) => validateItemQuantity(v, 'Assembled count'), required: false },
    primed_count: { validate: (v: unknown) => validateItemQuantity(v, 'Primed count'), required: false },
    painted_count: { validate: (v: unknown) => validateItemQuantity(v, 'Painted count'), required: false },
    based_count: { validate: (v: unknown) => validateItemQuantity(v, 'Based count'), required: false },
    notes: { validate: validateItemNotes, required: false },
  },

  profile: {
    username: { validate: validateUsername, required: false },
    avatar_url: { validate: (v: unknown) => ({ isValid: true, errors: [], sanitizedValue: v }), required: false },
    background_image_url: { validate: (v: unknown) => ({ isValid: true, errors: [], sanitizedValue: v }), required: false },
    is_public: { validate: (v: unknown) => ({ isValid: true, errors: [], sanitizedValue: !!v }), required: false },
    bio: { validate: validateBio, required: false },
    location: { validate: validateLocation, required: false },
    website_url: { validate: validateWebsiteUrl, required: false },
  },

  comment: {
    content: { validate: validateComment, required: true },
    item_id: { validate: validateUUID, required: false },
    collection_id: { validate: validateUUID, required: false },
  },
} as const;
