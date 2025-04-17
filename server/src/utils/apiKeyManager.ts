import crypto from 'crypto';
import { Encryption } from './encryption';
import { validateEnv } from './validateEnv';
import { AppDataSource } from '../config/database';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/ApiKey';
import { MoreThan } from 'typeorm';

export class ApiKeyManager {
  private static repository: Repository<ApiKey>;
  private static readonly KEY_PREFIX = 'r1_';
  private static readonly ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days

  static initialize() {
    this.repository = AppDataSource.getRepository(ApiKey);
  }

  /**
   * Generate a new API key
   * @returns The generated API key
   */
  static generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32);
    const key = this.KEY_PREFIX + randomBytes.toString('base64url');
    return key;
  }

  /**
   * Create a new API key for a user
   * @param userId - The user ID
   * @returns The generated API key
   */
  static async createApiKey(userId: string): Promise<string> {
    const key = this.generateApiKey();
    const hashedKey = Encryption.hash(key);
    
    const apiKey = new ApiKey();
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
  static async getOrCreateApiKey(userId: string): Promise<string> {
    try {
      // Try to find an existing valid API key
      const existingKey = await this.repository.findOne({
        where: { 
          userId,
          expiresAt: MoreThan(new Date())
        }
      });

      if (existingKey) {
        return existingKey.hashedKey;
      }

      // If no valid key exists, create a new one
      return await this.createApiKey(userId);
    } catch (error) {
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
  static async validateApiKey(key: string): Promise<string | null> {
    if (!key.startsWith(this.KEY_PREFIX)) {
      return null;
    }

    const apiKeys = await this.repository.find();
    
    for (const apiKey of apiKeys) {
      if (Encryption.verifyHash(key, apiKey.hashedKey)) {
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
  static async rotateApiKey(oldKey: string): Promise<string | null> {
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
    apiKey.hashedKey = Encryption.hash(newKey);
    apiKey.lastRotated = new Date();
    apiKey.expiresAt = new Date(Date.now() + this.ROTATION_INTERVAL);
    
    await this.repository.save(apiKey);
    
    return newKey;
  }

  /**
   * Delete an API key
   * @param key - The API key to delete
   */
  static async deleteApiKey(key: string): Promise<boolean> {
    const userId = await this.validateApiKey(key);
    if (!userId) {
      return false;
    }

    await this.repository.delete({ userId });
    return true;
  }
}
