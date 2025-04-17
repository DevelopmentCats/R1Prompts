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
const dotenv = __importStar(require("dotenv"));
// Load environment variables first
dotenv.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const prompts_1 = __importDefault(require("./routes/prompts"));
const users_1 = __importDefault(require("./routes/users"));
const promptVotes_1 = __importDefault(require("./routes/promptVotes"));
const generate_1 = __importDefault(require("./routes/generate"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
require("reflect-metadata");
const apiKeyManager_1 = require("./utils/apiKeyManager");
const signatureAuth_1 = require("./middleware/signatureAuth");
const rateLimit_1 = require("./middleware/rateLimit");
const http_1 = require("http");
const botRenderer_1 = require("./middleware/botRenderer");
// Initialize API Key Manager
apiKeyManager_1.ApiKeyManager.initialize();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Trust proxy settings
app.set('trust proxy', 1);
// Essential middleware first
app.use(express_1.default.json());
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://r1prompts.com', 'https://www.r1prompts.com']
        : allowedOrigins,
    credentials: true
}));
// Bot renderer after essential middleware but before routes
app.use(botRenderer_1.botRenderer);
// Apply rate limiting
app.use('/api/auth', rateLimit_1.authLimiter);
app.use('/api', (req, res, next) => {
    // Exclude stats endpoint from rate limiting
    if (req.path === '/prompts/stats/global') {
        return next();
    }
    (0, rateLimit_1.apiLimiter)(req, res, next);
});
// Serve static files from uploads directory
const uploadsPath = path_1.default.join(__dirname, '../uploads');
console.log('Static files path:', uploadsPath);
// Ensure uploads directory exists
if (!fs_1.default.existsSync(uploadsPath)) {
    console.log('Creating uploads directory...');
    fs_1.default.mkdirSync(uploadsPath, { recursive: true });
    fs_1.default.mkdirSync(path_1.default.join(uploadsPath, 'avatars'), { recursive: true });
    fs_1.default.mkdirSync(path_1.default.join(uploadsPath, 'prompt-images'), { recursive: true });
}
// Serve static files with CORS headers
app.use('/api/uploads', (req, res, next) => {
    const origin = req.headers.origin || '';
    if (process.env.NODE_ENV === 'production') {
        if (origin && ['https://r1prompts.com', 'https://www.r1prompts.com'].includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
    }
    else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(uploadsPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
    }
}));
// Add signature auth as global middleware
app.use(signatureAuth_1.signatureAuth);
// Initialize database connection before setting up routes
const initializeApp = async () => {
    try {
        await database_1.AppDataSource.initialize();
        console.log('Database connected successfully');
        // API routes
        app.use('/api/auth', auth_1.default);
        app.use('/api/prompts', prompts_1.default);
        app.use('/api/users', users_1.default);
        app.use('/api/votes', promptVotes_1.default);
        app.use('/api/generate', generate_1.default);
        // Serve static files for production
        if (process.env.NODE_ENV === 'production') {
            // Serve frontend static files
            const frontendPath = path_1.default.join(__dirname, '../../dist');
            app.use(express_1.default.static(frontendPath));
            // Handle all other routes by serving index.html
            app.get('*', (req, res) => {
                res.sendFile(path_1.default.join(frontendPath, 'index.html'));
            });
        }
        else {
            // In development, proxy requests to Vite dev server
            const { createProxyMiddleware } = require('http-proxy-middleware');
            app.use('/', createProxyMiddleware({
                target: 'http://localhost:5173',
                changeOrigin: true,
                ws: true,
            }));
        }
        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({
                message: err.message || 'Internal Server Error',
            });
        });
        // Add a test endpoint
        app.get('/api/test', (req, res) => {
            res.json({
                message: 'API is working',
                path: req.path,
                headers: req.headers
            });
        });
        // Health check endpoint
        app.get('/health', (req, res) => {
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
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
};
initializeApp();
