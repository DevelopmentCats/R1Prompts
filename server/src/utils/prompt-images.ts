/**
 * Get the full URL for a prompt image
 * @param imagePath - The path or URL of the prompt image
 * @returns The full URL for the prompt image
 */
export function getPromptImageUrl(imagePath: string | null): string {
    if (!imagePath) {
        return `${process.env.VITE_APP_URL}/default-prompt-image.png`;
    }

    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // Otherwise, construct the full URL
    return `${process.env.VITE_APP_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}
