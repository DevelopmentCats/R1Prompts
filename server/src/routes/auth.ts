import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { auth, isAuthenticated } from '../middleware/auth';
import { ApiKeyManager } from '../utils/apiKeyManager';
import { Encryption } from '../utils/encryption';
import { validatePassword } from '../utils/passwordValidation';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await userRepository.findOne({ 
      where: [
        { email: normalizedEmail },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = userRepository.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      isAdmin: false
    });

    await userRepository.save(user);

    // Generate token with original email
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Generate API key
    const apiKey = await ApiKeyManager.createApiKey(user.id);

    // Return user data without sensitive information
    const { password: _, email: __, ...userWithoutSensitive } = user;
    res.status(201).json({ 
      user: userWithoutSensitive,
      token,
      apiKey
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email 
    const normalizedEmail = email.toLowerCase();
    
    let user = await userRepository.findOne({ 
      where: { email: normalizedEmail },
      select: ['id', 'username', 'password', 'isAdmin']
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token with original email
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Get or create API key
    const apiKey = await ApiKeyManager.getOrCreateApiKey(user.id);

    // Return minimal user data needed for initial auth
    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      },
      apiKey
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Get current user
router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user.id },
      select: ['id', 'username', 'bio', 'website', 'avatarUrl', 'emailNotifications', 'darkMode', 'isAdmin', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Rotate API key
router.post('/rotate-api-key', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const oldKey = req.header('x-api-key');
    if (!oldKey) {
      return res.status(400).json({ message: 'Current API key is required' });
    }

    const newKey = await ApiKeyManager.rotateApiKey(oldKey);
    res.json({ apiKey: newKey });
  } catch (err) {
    res.status(500).json({ message: 'Error rotating API key' });
  }
});

// Get current user's API keys
router.get('/api-keys', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const apiKeys = await AppDataSource.getRepository('ApiKey').find({
      where: { userId: req.user.id },
      select: ['id', 'lastRotated', 'expiresAt']
    });
    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ message: 'Error fetching API keys' });
  }
});

// Create a new API key for the current user
router.post('/api-keys', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const key = await ApiKeyManager.createApiKey(req.user.id);
    res.json({ key });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ message: 'Error creating API key' });
  }
});

export default router;
