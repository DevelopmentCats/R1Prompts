export enum PromptCategory {
  'general' = 'general',
  'generative-ui' = 'generative-ui',
  'teach-mode' = 'teach-mode',
  'lam' = 'lam'
}

// Shared mapping for displaying categories in a nice format
export const CATEGORY_DISPLAY_NAMES: Record<PromptCategory, string> = {
  [PromptCategory.general]: 'General',
  [PromptCategory['generative-ui']]: 'Generative UI',
  [PromptCategory['teach-mode']]: 'Teach Mode',
  [PromptCategory.lam]: 'LAM'
};

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  isPublic: boolean;
  totalVotes: number;
  tags: string[];
  imageUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  totalViews: number;
  totalCopies: number;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}
