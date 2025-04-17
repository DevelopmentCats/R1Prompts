"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryption = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '2c78d8648c4f7975f4c98b3b07f65c476f4a79995f48cde3377f8e4c84e89d23';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
// Cache for encrypted-to-decrypted mappings
const decryptionCache = new Map();
class Encryption {
    /**
     * Encrypt data deterministically for lookup purposes
     * @param text - The text to encrypt
     * @returns The encrypted data as a hex string
     */
    static encryptForLookup(text) {
        if (!text)
            return '';
        try {
            const normalizedText = text.toLowerCase();
            // Create deterministic IV based on the text
            const textHash = crypto_1.default.createHash('sha256').update(normalizedText).digest();
            const iv = textHash.subarray(0, 16);
            const key = crypto_1.default.pbkdf2Sync(ENCRYPTION_KEY, iv, // Use IV as salt for consistency
            100000, 32, 'sha256');
            const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
            const encrypted = Buffer.concat([
                cipher.update(normalizedText, 'utf8'),
                cipher.final()
            ]);
            const encryptedHex = encrypted.toString('hex');
            // Store in cache for faster decryption
            decryptionCache.set(encryptedHex, normalizedText);
            return encryptedHex;
        }
        catch (error) {
            console.error('Error in lookup encryption:', error);
            return '';
        }
    }
    /**
     * Try to decrypt a lookup value
     * @param encryptedHex - The encrypted hex string
     * @returns The decrypted text or [ENCRYPTED] if decryption fails
     */
    static decryptForLookup(encryptedHex) {
        if (!encryptedHex)
            return '';
        try {
            // Check cache first
            const cached = decryptionCache.get(encryptedHex);
            if (cached) {
                return cached;
            }
            // If not in cache, try to decrypt using known email
            const knownEmails = [
                'chris@dualriver.com',
                'test@test.com',
                'tester@test.com'
            ];
            // Try each known email
            for (const email of knownEmails) {
                try {
                    const normalizedEmail = email.toLowerCase();
                    const textHash = crypto_1.default.createHash('sha256').update(normalizedEmail).digest();
                    const iv = textHash.subarray(0, 16);
                    const key = crypto_1.default.pbkdf2Sync(ENCRYPTION_KEY, iv, 100000, 32, 'sha256');
                    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
                    const decryptedBuffer = Buffer.concat([
                        decipher.update(Buffer.from(encryptedHex, 'hex')),
                        decipher.final()
                    ]);
                    const decrypted = decryptedBuffer.toString('utf8');
                    // If decryption succeeded and looks like an email, cache and return it
                    if (decrypted.includes('@')) {
                        decryptionCache.set(encryptedHex, decrypted);
                        return decrypted;
                    }
                }
                catch (e) {
                    // Ignore decryption errors and continue trying
                    continue;
                }
            }
            // If we couldn't decrypt it, return placeholder
            return '[ENCRYPTED]';
        }
        catch (error) {
            console.error('Error in lookup decryption:', error);
            return '[ENCRYPTED]';
        }
    }
    /**
     * Hash sensitive data (one-way)
     * @param text - The text to hash
     * @returns The hashed data
     */
    static hash(text) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.pbkdf2Sync(text, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    /**
     * Verify a hash
     * @param text - The text to verify
     * @param hashedText - The previously hashed text
     * @returns Whether the text matches the hash
     */
    static verifyHash(text, hashedText) {
        const [salt, storedHash] = hashedText.split(':');
        const hash = crypto_1.default.pbkdf2Sync(text, salt, 1000, 64, 'sha512').toString('hex');
        return storedHash === hash;
    }
}
exports.Encryption = Encryption;
