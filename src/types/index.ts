import { PromptCategory } from './prompt';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  category: PromptCategory;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  totalVotes: number;
  isPublic: boolean;
}

export interface UserSettings {
  userId: string;
  theme: 'dark' | 'light';
  emailNotifications: boolean;
  language: string;
}
