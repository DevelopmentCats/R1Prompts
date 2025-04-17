/**
 * Validates that a required environment variable exists
 * @param key The environment variable key to validate
 * @returns The value of the environment variable
 * @throws Error if the environment variable is not set
 */
export const validateEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};