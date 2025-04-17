import { User } from '../entities/User';

// Type for user data that's safe to send in responses
export type SafeUser = Pick<User, 
  | 'id' 
  | 'username' 
  | 'avatarUrl' 
  | 'bio' 
  | 'website' 
  | 'createdAt' 
  | 'updatedAt' 
  | 'isAdmin' 
  | 'darkMode'
>;

// Function to transform User entity to SafeUser
export const toSafeUser = (user: User): SafeUser => {
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
