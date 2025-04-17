export const getPromptImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) return imageUrl;

  // Get the base URL from the API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Remove leading /api if it exists in the imageUrl
  const cleanImageUrl = imageUrl.replace(/^\/api/, '');
  
  // All prompt image URLs should start with /uploads/prompt-images
  if (cleanImageUrl.startsWith('/uploads/')) {
    return `${apiUrl}/api${cleanImageUrl}`;
  }
  
  // For any other format, ensure we have /uploads/prompt-images/
  const fileName = cleanImageUrl.split('/').pop();
  return `${apiUrl}/api/uploads/prompt-images/${fileName}`;
};
