/**
 * Facebook-style username generation utilities
 * Rules: 5+ characters, alphanumeric + periods only, lowercase
 */

/**
 * Generate a username from first and last name
 * Tries variations: firstname.lastname, firstnamelastname, firstname.lastname123
 */
export const generateUsername = (firstName: string, lastName: string): string => {
  // Clean and lowercase the names
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Generate base username (firstname.lastname)
  let username = `${cleanFirst}.${cleanLast}`;
  
  // Ensure minimum 5 characters
  if (username.length < 5) {
    // Add random numbers if too short
    const randomNum = Math.floor(Math.random() * 1000);
    username = `${username}${randomNum}`;
  }
  
  return username;
};

/**
 * Generate alternative usernames if the primary one is taken
 */
export const generateAlternativeUsernames = (firstName: string, lastName: string): string[] => {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const alternatives: string[] = [];
  
  // firstname.lastname
  alternatives.push(`${cleanFirst}.${cleanLast}`);
  
  // firstnamelastname
  alternatives.push(`${cleanFirst}${cleanLast}`);
  
  // firstname.lastname with numbers
  for (let i = 1; i <= 5; i++) {
    const randomNum = Math.floor(Math.random() * 1000);
    alternatives.push(`${cleanFirst}.${cleanLast}${randomNum}`);
    alternatives.push(`${cleanFirst}${cleanLast}${randomNum}`);
  }
  
  // Filter to ensure all are at least 5 characters
  return alternatives.filter(u => u.length >= 5);
};

/**
 * Validate username format
 * Rules: 5+ characters, alphanumeric and periods only, can't start/end with period
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }
  
  if (username.length < 5) {
    return { valid: false, error: "Username must be at least 5 characters" };
  }
  
  if (username.length > 30) {
    return { valid: false, error: "Username must be 30 characters or less" };
  }
  
  if (!/^[a-z0-9.]+$/.test(username)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and periods" };
  }
  
  if (username.startsWith('.') || username.endsWith('.')) {
    return { valid: false, error: "Username cannot start or end with a period" };
  }
  
  if (username.includes('..')) {
    return { valid: false, error: "Username cannot have consecutive periods" };
  }
  
  return { valid: true };
};
