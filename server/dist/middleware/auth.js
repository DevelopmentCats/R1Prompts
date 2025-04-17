"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.optionalAuth = exports.auth = void 0;
exports.isAuthenticated = isAuthenticated;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
// Type guard to check if a request is authenticated
function isAuthenticated(req) {
    return req.user !== undefined;
}
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }
        const token = authHeader.replace('Bearer ', '');
        try {
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Fetch user to get admin status
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: decoded.userId }
            });
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
            // Add user info to request
            req.user = {
                id: user.id,
                isAdmin: user.isAdmin
            };
            // Set auth headers
            res.setHeader('X-User-Id', user.id);
            res.setHeader('X-User-Admin', user.isAdmin ? 'true' : 'false');
            console.log('Auth middleware - user data:', {
                id: user.id,
                isAdmin: user.isAdmin
            });
            next();
        }
        catch (err) {
            console.error('Token verification failed:', err);
            res.status(401).json({ message: 'Token is not valid' });
        }
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.auth = auth;
// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            // No token, but that's okay - just continue without auth
            return next();
        }
        const token = authHeader.replace('Bearer ', '');
        try {
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Fetch user to get admin status
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: decoded.userId }
            });
            if (!user) {
                // Invalid user, but that's okay - just continue without auth
                return next();
            }
            // Add user info to request
            req.user = {
                id: user.id,
                isAdmin: user.isAdmin
            };
            // Set auth headers
            res.setHeader('X-User-Id', user.id);
            res.setHeader('X-User-Admin', user.isAdmin ? 'true' : 'false');
            console.log('Optional auth middleware - user data:', {
                id: user.id,
                isAdmin: user.isAdmin
            });
            next();
        }
        catch (err) {
            // Token verification failed, but that's okay - just continue without auth
            console.error('Token verification failed in optional auth:', err);
            next();
        }
    }
    catch (err) {
        console.error('Optional auth middleware error:', err);
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        // First run the regular auth middleware
        await (0, exports.auth)(req, res, async () => {
            if (!req.user?.isAdmin) {
                return res.status(403).json({ message: 'Admin access required' });
            }
            next();
        });
    }
    catch (err) {
        res.status(403).json({ message: 'Admin access required' });
    }
};
exports.adminAuth = adminAuth;
