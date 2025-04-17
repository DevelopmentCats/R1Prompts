"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvatarUrl = getAvatarUrl;
/**
 * Get the full URL for an avatar image
 * @param imagePath - The path or URL of the avatar image
 * @returns The full URL for the avatar image
 */
function getAvatarUrl(imagePath) {
    if (!imagePath) {
        return `${process.env.VITE_APP_URL}/default-avatar.png`;
    }
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // Otherwise, construct the full URL
    return `${process.env.VITE_APP_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}
