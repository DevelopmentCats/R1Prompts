import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import promptRoutes from './routes/prompts';
import userRoutes from './routes/users';
import promptVoteRoutes from './routes/promptVotes';
import generateRoutes from './routes/generate';
import path from 'path';
import fs from 'fs';
import 'reflect-metadata';
import { ApiKeyManager } from './utils/apiKeyManager';
import { signatureAuth } from './middleware/signatureAuth';
import { authLimiter, apiLimiter } from './middleware/rateLimit';
import { createServer } from 'http';
import { botRenderer } from './middleware/botRenderer';

// Initialize API Key Manager
ApiKeyManager.initialize();

const app = express();
const server = createServer(app);

// Trust proxy settings
app.set('trust proxy', 1);

// Essential middleware first
app.use(express.json());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://r1prompts.com', 'https://www.r1prompts.com'] 
    : allowedOrigins,
  credentials: true
}));

// Bot renderer after essential middleware but before routes
app.use(botRenderer);

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Exclude stats endpoint from rate limiting
  if (req.path === '/prompts/stats/global') {
    return next();
  }
  apiLimiter(req, res, next);
});

// Serve static files from uploads directory
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Static files path:', uploadsPath);

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsPath, { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'prompt-images'), { recursive: true });
}

// Serve static files with CORS headers
app.use('/api/uploads', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '';
  if (process.env.NODE_ENV === 'production') {
    if (origin && ['https://r1prompts.com', 'https://www.r1prompts.com'].includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res: Response, path: string) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }
}));

// Add signature auth as global middleware
app.use(signatureAuth);

// Initialize database connection before setting up routes
const initializeApp = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/prompts', promptRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/votes', promptVoteRoutes);
    app.use('/api/generate', generateRoutes);

    // Serve static files for production
    if (process.env.NODE_ENV === 'production') {
      // Serve frontend static files
      const frontendPath = path.join(__dirname, '../../dist');
      app.use(express.static(frontendPath));

      // Handle all other routes by serving index.html
      app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
      });
    } else {
      // In development, proxy requests to Vite dev server
      const { createProxyMiddleware } = require('http-proxy-middleware');
      app.use('/', createProxyMiddleware({
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true,
      }));
    }

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        message: err.message || 'Internal Server Error',
      });
    });

    // Add a test endpoint
    app.get('/api/test', (req: Request, res: Response) => {
      res.json({ 
        message: 'API is working',
        path: req.path,
        headers: req.headers
      });
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        headers: req.headers
      });
    });

    const PORT = parseInt(process.env.PORT || '5000', 10);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Server accessible at:`);
      console.log(`  - http://localhost:${PORT}`);
      console.log(`  - http://192.168.1.214:${PORT}`);
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

initializeApp();
