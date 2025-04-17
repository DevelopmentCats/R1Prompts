"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestSigning = void 0;
const crypto_1 = __importDefault(require("crypto"));
class RequestSigning {
    static SIGNATURE_HEADER = 'x-r1-signature';
    static TIMESTAMP_HEADER = 'x-r1-timestamp';
    static MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes
    /**
     * Generate a signature for a request
     * @param method - HTTP method
     * @param path - Request path
     * @param body - Request body
     * @param timestamp - Request timestamp
     * @param apiKey - API key
     * @returns The request signature
     */
    static generateSignature(method, path, body, timestamp, apiKey) {
        const payload = [
            method.toUpperCase(),
            path,
            JSON.stringify(body || ''),
            timestamp.toString(),
            apiKey
        ].join('|');
        return crypto_1.default
            .createHmac('sha256', apiKey)
            .update(payload)
            .digest('hex');
    }
    /**
     * Verify a request signature
     * @param req - Express request object
     * @param apiKey - API key
     * @returns Whether the signature is valid
     */
    static verifySignature(req, apiKey) {
        const signature = req.header(this.SIGNATURE_HEADER);
        const timestamp = parseInt(req.header(this.TIMESTAMP_HEADER) || '0', 10);
        if (!signature || !timestamp) {
            return false;
        }
        // Check timestamp freshness
        const now = Date.now();
        if (Math.abs(now - timestamp) > this.MAX_TIMESTAMP_DIFF) {
            return false;
        }
        const expectedSignature = this.generateSignature(req.method, req.path, req.body, timestamp, apiKey);
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    /**
     * Sign a request (client-side)
     * @param req - Request object
     * @param apiKey - API key
     * @returns Headers to add to the request
     */
    static signRequest(method, path, body, apiKey) {
        const timestamp = Date.now();
        const signature = this.generateSignature(method, path, body, timestamp, apiKey);
        return {
            [this.SIGNATURE_HEADER]: signature,
            [this.TIMESTAMP_HEADER]: timestamp.toString()
        };
    }
}
exports.RequestSigning = RequestSigning;
