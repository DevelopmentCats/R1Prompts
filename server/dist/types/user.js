"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSafeUser = void 0;
// Function to transform User entity to SafeUser
const toSafeUser = (user) => {
    if (!user || !user.id || !user.username) {
        throw new Error('Invalid user data');
    }
    return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        website: user.website || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isAdmin: user.isAdmin || false,
        darkMode: user.darkMode || false
    };
};
exports.toSafeUser = toSafeUser;
