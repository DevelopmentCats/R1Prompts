import { Request, Response, NextFunction } from 'express';
import { RequestSigning } from '../utils/requestSigning';
import { ApiKeyManager } from '../utils/apiKeyManager';

export const signatureAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip signature verification for non-sensitive routes
    const nonSensitiveRoutes = [
      '/api/auth/login', 
      '/api/auth/register',
      '/api/uploads/prompt-images/'
    ];
    
    if (nonSensitiveRoutes.includes(req.path)) {
      return next();
    }

    const apiKey = req.header('x-api-key');
    if (!apiKey) {
      return next(); // Fall back to regular JWT auth if no API key
    }

    const userId = await ApiKeyManager.validateApiKey(apiKey);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    const isValidSignature = RequestSigning.verifySignature(req, apiKey);
    if (!isValidSignature) {
      return res.status(401).json({ message: 'Invalid request signature' });
    }

    // Add userId to request for later use
    req.user = { id: userId };
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(500).json({ message: 'Error verifying request signature' });
  }
};
