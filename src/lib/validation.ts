/**
 * Professional Real-World Validation and Sanitization Standards
 * Implements strict rules for Names, Emails, Phone Numbers (E.164 / Pakistan default),
 * Dates of Birth, Addresses, and Numeric metrics.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * 1. Full Name Validation
 * - Length: 2 to 100 characters.
 * - Accept real human names only: letters, spaces, hyphens, and apostrophes.
 * - Reject numbers, symbols, and whitespace-only strings.
 * Examples: 'Shahid Ali', 'O\'Connor', 'Mary-Jane'
 */
export function validateFullName(name: unknown, fieldLabel = 'Full Name'): ValidationResult {
  if (typeof name !== 'string') {
    return { valid: false, error: `${fieldLabel} must be a valid text string.` };
  }

  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} cannot be empty or contain only spaces.` };
  }

  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, error: `${fieldLabel} must be between 2 and 100 characters.` };
  }

  // Regex strictly allows alphabetic unicode letters, single spaces between words, hyphens, apostrophes
  const nameRegex = /^[A-Za-z\u00C0-\u024F]+(?:[' -][A-Za-z\u00C0-\u024F]+)*$/;

  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes. Numbers and symbols are not permitted.`,
    };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * 2. Email Address Validation
 * - Length: up to 254 characters (RFC standard).
 * - Standard RFC-compatible format.
 * - Normalize to lowercase.
 * - Reject malformed emails.
 */
export function validateEmail(email: unknown, fieldLabel = 'Email Address'): ValidationResult {
  if (typeof email !== 'string') {
    return { valid: false, error: `${fieldLabel} must be a valid text string.` };
  }

  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required.` };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: `${fieldLabel} cannot exceed 254 characters.` };
  }

  // Strict email regex requiring proper user and domain parts with TLD of at least 2 chars
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} is not in a valid email format (e.g. name@domain.com).` };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2 || parts[0].length > 64 || parts[1].length > 255) {
    return { valid: false, error: `${fieldLabel} exceeds standard length specifications.` };
  }

  const tld = parts[1].split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, error: `${fieldLabel} domain must have a valid top-level domain.` };
  }

  return { valid: true, normalized: trimmed.toLowerCase() };
}

/**
 * 3. Phone Number Validation & E.164 Normalization
 * - Maximum length 20 characters.
 * - Default Pakistan (+92): converts 03XXXXXXXXX or 3XXXXXXXXX to +923XXXXXXXXX.
 * - Supports valid international numbers starting with + followed by 7 to 15 digits.
 * - Rejects letters and invalid length or invalid formats.
 */
export function validatePhoneNumber(phone: unknown, fieldLabel = 'Phone Number'): ValidationResult {
  if (typeof phone !== 'string') {
    return { valid: false, error: `${fieldLabel} must be a valid text string.` };
  }

  const trimmed = phone.trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required.` };
  }

  // Reject if contains alphabetic characters
  if (/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} cannot contain alphabetic characters.` };
  }

  // Clean away spaces, hyphens, and parentheses
  const cleaned = trimmed.replace(/[\s\-()]/g, '');

  let normalized = cleaned;

  // Handle Pakistan local formats (e.g., 03XXXXXXXXX -> +923XXXXXXXXX)
  if (/^03\d{9}$/.test(cleaned)) {
    normalized = `+92${cleaned.slice(1)}`;
  } else if (/^3\d{9}$/.test(cleaned)) {
    normalized = `+92${cleaned}`;
  } else if (/^00923\d{9}$/.test(cleaned)) {
    normalized = `+92${cleaned.slice(4)}`;
  } else if (/^923\d{9}$/.test(cleaned)) {
    normalized = `+${cleaned}`;
  } else if (!normalized.startsWith('+') && /^\d{10,15}$/.test(cleaned)) {
    normalized = `+${cleaned}`;
  }

  // E.164 standard: + followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;

  if (!e164Regex.test(normalized)) {
    return {
      valid: false,
      error: `${fieldLabel} is invalid. Please provide a valid mobile number (e.g., 03001234567 or +923001234567).`,
    };
  }

  return { valid: true, normalized };
}

/**
 * 4. Date of Birth Validation
 * - Format: YYYY-MM-DD.
 * - Accept valid calendar dates only.
 * - Reject future dates.
 * - Reasonable age limits:
 *   - Student: between 3 and 25 years old.
 *   - Staff: between 18 and 80 years old.
 *   - General: between 1 and 120 years old.
 */
export function validateDateOfBirth(
  dob: unknown,
  roleType: 'STUDENT' | 'STAFF' | 'GENERAL' = 'GENERAL',
  fieldLabel = 'Date of Birth'
): ValidationResult {
  if (typeof dob !== 'string') {
    return { valid: false, error: `${fieldLabel} must be a valid date string (YYYY-MM-DD).` };
  }

  const trimmed = dob.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} must follow the YYYY-MM-DD format.` };
  }

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return { valid: false, error: `${fieldLabel} is an invalid calendar date.` };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedDate > today) {
    return { valid: false, error: `${fieldLabel} cannot be in the future.` };
  }

  // Calculate age
  let age = today.getFullYear() - parsedDate.getFullYear();
  const mDiff = today.getMonth() - parsedDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsedDate.getDate())) {
    age--;
  }

  if (roleType === 'STUDENT') {
    if (age < 3 || age > 25) {
      return {
        valid: false,
        error: `Student ${fieldLabel} must correspond to an age between 3 and 25 years (calculated age: ${age}).`,
      };
    }
  } else if (roleType === 'STAFF') {
    if (age < 18 || age > 75) {
      return {
        valid: false,
        error: `Staff ${fieldLabel} must correspond to an age between 18 and 75 years (calculated age: ${age}).`,
      };
    }
  } else {
    if (age < 0 || age > 120) {
      return { valid: false, error: `${fieldLabel} must reflect a reasonable age.` };
    }
  }

  return { valid: true, normalized: trimmed };
}

/**
 * 5. Address Validation
 * - Length: 5 to 255 characters.
 * - Supports house numbers, street names, areas, cities, postal codes, and country.
 * - Rejects empty or meaningless values.
 */
export function validateAddress(address: unknown, fieldLabel = 'Address'): ValidationResult {
  if (typeof address !== 'string') {
    return { valid: false, error: `${fieldLabel} must be a text string.` };
  }

  const trimmed = address.trim().replace(/\s+/g, ' ');

  if (!trimmed || trimmed.length < 5) {
    return { valid: false, error: `${fieldLabel} must be at least 5 characters long.` };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: `${fieldLabel} cannot exceed 255 characters.` };
  }

  // Must contain at least some alphabetic letters (not just pure punctuation or pure numbers)
  if (!/[a-zA-Z\u00C0-\u024F]/.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} must include street, city, or area name.` };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * 6. CNIC Validation (Pakistan National Identity Card format: XXXXX-XXXXXXX-X)
 */
export function validateCNIC(cnic: unknown, fieldLabel = 'CNIC'): ValidationResult {
  if (!cnic || typeof cnic !== 'string') {
    return { valid: true, normalized: '' }; // Optional in some contexts
  }

  const trimmed = cnic.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }

  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  if (!cnicRegex.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldLabel} must follow standard Pakistan format (e.g. 42201-1234567-1).`,
    };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * 7. Numeric & Percentage Validation
 */
export function validatePercentage(
  val: unknown,
  fieldLabel = 'Percentage'
): { valid: boolean; error?: string; value: number } {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num < 0 || num > 100) {
    return { valid: false, error: `${fieldLabel} must be between 0.00 and 100.00.`, value: 0 };
  }
  return { valid: true, value: Number(num.toFixed(2)) };
}

export function validatePositiveAmount(
  val: unknown,
  fieldLabel = 'Amount'
): { valid: boolean; error?: string; value: number } {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num < 0) {
    return { valid: false, error: `${fieldLabel} must be a valid positive amount.`, value: 0 };
  }
  return { valid: true, value: Number(num.toFixed(2)) };
}
