export const getPromptImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    console.warn("Null or undefined image URL provided to getPromptImageUrl");
    return '';
  }

  try {
    // If it's already a full URL (starts with http), return it as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Get the base URL from the API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // IMPORTANT: The server serves static files at /api/uploads/* path
    
    // Case 1: URL is stored with /api prefix (e.g., "/api/uploads/prompt-images/xyz.jpg")
    if (imageUrl.startsWith('/api/')) {
      // Replace the /api with the full API URL base
      return `${apiUrl}${imageUrl}`;
    }
    
    // Case 2: URL is stored without /api prefix but starts with /uploads
    if (imageUrl.startsWith('/uploads/')) {
      // Add the API URL and /api prefix
      return `${apiUrl}/api${imageUrl}`;
    }
    
    // Case 3: URL is just a filename or relative path
    // Assume it belongs in the prompt-images directory
    if (!imageUrl.includes('/')) {
      return `${apiUrl}/api/uploads/prompt-images/${imageUrl}`;
    }
    
    // Default case: Add API URL with /api prefix
    return `${apiUrl}/api${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } catch (error) {
    console.error(`Error processing image URL: ${imageUrl}`, error);
    return '';
  }
};
