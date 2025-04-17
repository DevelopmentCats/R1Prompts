"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const encryption_1 = require("./encryption");
const database_1 = require("../config/database");
const ApiKey_1 = require("../entities/ApiKey");
const typeorm_1 = require("typeorm");
class ApiKeyManager {
    static repository;
    static KEY_PREFIX = 'r1_';
    static ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days
    static initialize() {
        this.repository = database_1.AppDataSource.getRepository(ApiKey_1.ApiKey);
    }
    /**
     * Generate a new API key
     * @returns The generated API key
     */
    static generateApiKey() {
        const randomBytes = crypto_1.default.randomBytes(32);
        const key = this.KEY_PREFIX + randomBytes.toString('base64url');
        return key;
    }
    /**
     * Create a new API key for a user
     * @param userId - The user ID
     * @returns The generated API key
     */
    static async createApiKey(userId) {
        const key = this.generateApiKey();
        const hashedKey = encryption_1.Encryption.hash(key);
        const apiKey = new ApiKey_1.ApiKey();
        apiKey.userId = userId;
        apiKey.hashedKey = hashedKey;
        apiKey.lastRotated = new Date();
        apiKey.expiresAt = new Date(Date.now() + this.ROTATION_INTERVAL);
        await this.repository.save(apiKey);
        return key;
    }
    /**
     * Get an existing API key or create a new one
     * @param userId - The user ID
     * @returns The API key
     */
    static async getOrCreateApiKey(userId) {
        try {
            // Try to find an existing valid API key
            const existingKey = await this.repository.findOne({
                where: {
                    userId,
                    expiresAt: (0, typeorm_1.MoreThan)(new Date())
                }
            });
            if (existingKey) {
                return existingKey.hashedKey;
            }
            // If no valid key exists, create a new one
            return await this.createApiKey(userId);
        }
        catch (error) {
            console.error('Error in getOrCreateApiKey:', error);
            // If anything goes wrong, create a new key
            return await this.createApiKey(userId);
        }
    }
    /**
     * Validate an API key
     * @param key - The API key to validate
     * @returns The user ID if valid, null if invalid
     */
    static async validateApiKey(key) {
        if (!key.startsWith(this.KEY_PREFIX)) {
            return null;
        }
        const apiKeys = await this.repository.find();
        for (const apiKey of apiKeys) {
            if (encryption_1.Encryption.verifyHash(key, apiKey.hashedKey)) {
                // Check if key needs rotation
                if (Date.now() > apiKey.expiresAt.getTime()) {
                    return null;
                }
                return apiKey.userId;
            }
        }
        return null;
    }
    /**
     * Rotate an API key
     * @param oldKey - The old API key
     * @returns The new API key
     */
    static async rotateApiKey(oldKey) {
        const userId = await this.validateApiKey(oldKey);
        if (!userId) {
            return null;
        }
        const apiKey = await this.repository.findOne({ where: { userId } });
        if (!apiKey) {
            return null;
        }
        // Generate new key
        const newKey = this.generateApiKey();
        apiKey.hashedKey = encryption_1.Encryption.hash(newKey);
        apiKey.lastRotated = new Date();
        apiKey.expiresAt = new Date(Date.now() + this.ROTATION_INTERVAL);
        await this.repository.save(apiKey);
        return newKey;
    }
    /**
     * Delete an API key
     * @param key - The API key to delete
     */
    static async deleteApiKey(key) {
        const userId = await this.validateApiKey(key);
        if (!userId) {
            return false;
        }
        await this.repository.delete({ userId });
        return true;
    }
}
exports.ApiKeyManager = ApiKeyManager;
