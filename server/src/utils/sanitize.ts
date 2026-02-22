/**
 * Input sanitization utilities
 * Ensures consistent data quality and prevents injection attacks
 */

/**
 * Sanitize email: lowercase, trim, validate format
 */
export const sanitizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  
  const sanitized = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
};

/**
 * Sanitize text: trim, remove excessive whitespace
 */
export const sanitizeText = (text: string | null | undefined): string | null => {
  if (!text) return null;
  
  return text
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

/**
 * Sanitize phone: remove non-numeric characters except +
 */
export const sanitizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  
  // Keep only digits, +, -, (, ), and spaces
  const sanitized = phone.trim().replace(/[^\d+\-() ]/g, '');
  
  if (sanitized.length < 10) {
    throw new Error('Invalid phone number');
  }
  
  return sanitized;
};

/**
 * Sanitize name: trim, capitalize properly
 */
export const sanitizeName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Sanitize numeric input
 */
export const sanitizeNumber = (value: any): number => {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    throw new Error('Invalid number');
  }
  
  return num;
};
