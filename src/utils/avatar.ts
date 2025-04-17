export const getAvatarUrl = (avatarUrl?: string): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;

  // Get the base URL from the API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Remove leading /api if it exists in the avatarUrl
  const cleanAvatarUrl = avatarUrl.replace(/^\/api/, '');
  
  // If it's already a full uploads path
  if (cleanAvatarUrl.startsWith('/uploads/avatars/')) {
    return `${apiUrl}/api${cleanAvatarUrl}`;
  }
  
  // If it's just a filename or partial path, ensure it goes in avatars directory
  const fileName = cleanAvatarUrl.split('/').pop();
  return `${apiUrl}/api/uploads/avatars/${fileName}`;
};
