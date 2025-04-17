"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = void 0;
/**
 * Validates that a required environment variable exists
 * @param key The environment variable key to validate
 * @returns The value of the environment variable
 * @throws Error if the environment variable is not set
 */
const validateEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};
exports.validateEnv = validateEnv;
