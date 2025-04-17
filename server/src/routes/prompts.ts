import express, { Request, Response, Router } from 'express';
import { AppDataSource } from '../config/database';
import { Prompt, PromptCategory } from '../entities/Prompt';
import { auth, adminAuth, isAuthenticated, optionalAuth } from '../middleware/auth';
import { signatureAuth } from '../middleware/signatureAuth';
import { Like } from 'typeorm';
import { User } from '../entities/User';
import { PromptMetrics } from '../entities/PromptMetrics';
import { PromptVote } from '../entities/PromptVote';
import { PromptCopy } from '../entities/PromptCopy';
import { AnonymousPromptCopy } from '../entities/AnonymousPromptCopy';
import { upload } from '../middleware/upload';
import path from 'path';
import { SafeUser, toSafeUser } from '../types/user';
import { GlobalStats } from '../entities/GlobalStats';
import * as crypto from 'crypto';

const router = Router();

// Type for prompt response
type PromptResponse = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  isPublic: boolean;
  likes: number;
  tags: string[];
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  totalViews: number;
  totalCopies: number;
  averageRating: number;
  promptVotes: PromptVote[];
  metrics: PromptMetrics[];
  authorSafe: SafeUser;
  canEdit?: boolean;
  canDelete?: boolean;
  hasVoted?: boolean;
};

// Helper function to transform prompt data
const transformPromptData = (prompt: any, user?: { id: string; isAdmin?: boolean }): PromptResponse => {
  // Create a default author if none exists
  const authorSafe = prompt.author ? {
    id: prompt.author.id,
    username: prompt.author.username,
    bio: prompt.author.bio || '',
    website: prompt.author.website || '',
    avatarUrl: prompt.author.avatarUrl || '',
    darkMode: prompt.author.darkMode,
    isAdmin: prompt.author.isAdmin,
    createdAt: prompt.author.createdAt,
    updatedAt: prompt.author.updatedAt,
  } : {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'Anonymous',
    bio: '',
    website: '',
    avatarUrl: '',
    darkMode: true,
    isAdmin: false,
    createdAt: prompt.createdAt,
    updatedAt: prompt.createdAt,
  };

  // Check if user is admin or owner
  const isAdmin = user?.isAdmin === true;
  const isOwner = user?.id === authorSafe.id;

  console.log('Transforming prompt:', {
    id: prompt.id,
    hasVoted: prompt.hasVoted,
    userId: user?.id
  });

  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    category: prompt.category,
    isPublic: prompt.isPublic,
    likes: prompt.likes || 0,
    totalViews: prompt.totalViews || 0,
    totalCopies: prompt.totalCopies || 0,
    averageRating: prompt.averageRating || 0,
    tags: prompt.tags || [],
    imageUrls: prompt.imageUrls || [],
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    authorSafe,
    promptVotes: prompt.votes || [],
    metrics: prompt.metrics || [],
    canEdit: isAdmin || isOwner,
    canDelete: isAdmin || isOwner,
    hasVoted: !!prompt.hasVoted
  };
};

// Helper function to hash IP address
const hashIP = (ip: string): string => {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_HASH_SECRET!)
    .digest('hex');
};

// Get current user's prompts
router.get('/user', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompts = await promptRepository.find({
      where: { author: { id: req.user.id } },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'title',
        'description',
        'content',
        'category',
        'isPublic',
        'tags',
        'imageUrls',
        'createdAt',
        'votes',
        'totalCopies'
      ],
      relations: ['author'],
    });

    res.json(prompts.map(prompt => transformPromptData(prompt)));
  } catch (err) {
    console.error('Error fetching user prompts:', err);
    res.status(500).json({ message: 'Error fetching prompts' });
  }
});

// Get all public prompts with optional auth for vote status
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    const {
      category,
      search,
      tag,
      sort = 'newest',
      page = 1,
      limit: rawLimit = 20,
    } = req.query;

    console.log('Sort parameter:', sort); // Debug log

    // Enforce a maximum limit to prevent excessive loading
    const limit = Math.min(Number(rawLimit), 50);

    // Build base query for getting prompts
    let queryBuilder = promptRepository
      .createQueryBuilder('prompt')
      .leftJoinAndSelect('prompt.author', 'author')
      .select([
        'prompt.id',
        'prompt.title',
        'prompt.description',
        'prompt.content',
        'prompt.category',
        'prompt.isPublic',
        'prompt.likes',
        'prompt.totalViews',
        'prompt.totalCopies',
        'prompt.averageRating',
        'prompt.tags',
        'prompt.imageUrls',
        'prompt.createdAt',
        'prompt.updatedAt',
        'author.id',
        'author.username',
        'author.bio',
        'author.website',
        'author.avatarUrl',
        'author.darkMode',
        'author.isAdmin',
        'author.createdAt',
        'author.updatedAt'
      ]);

    console.log('User authenticated:', isAuthenticated(req));
    console.log('User ID:', req.user?.id);

    // Only join votes for the current user if authenticated
    if (isAuthenticated(req)) {
      queryBuilder = queryBuilder
        .leftJoin('prompt_votes', 'votes', 'votes.promptId = prompt.id AND votes.userId = :userId', { userId: req.user.id })
        .addSelect('CASE WHEN votes.id IS NOT NULL THEN 1 ELSE 0 END', 'hasVoted');
    }

    // Add base where clause
    queryBuilder = queryBuilder
      .where('prompt.isPublic = :isPublic', { isPublic: true });

    // Add search filter if provided
    if (search) {
      queryBuilder = queryBuilder
        .andWhere('(LOWER(prompt.title) LIKE LOWER(:search) OR LOWER(prompt.description) LIKE LOWER(:search))', {
          search: `%${search}%`,
        });
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      queryBuilder = queryBuilder.andWhere('prompt.category = :category', {
        category,
      });
    }

    // Add tag filter if provided
    if (tag) {
      queryBuilder = queryBuilder.andWhere(':tag = ANY(prompt.tags)', { tag });
    }

    // Add sorting
    switch (sort) {
      case 'likes':
        queryBuilder = queryBuilder
          .orderBy('prompt.likes', 'DESC')
          .addOrderBy('prompt.createdAt', 'DESC');
        break;
      case 'copies':
        queryBuilder = queryBuilder
          .orderBy('prompt.totalCopies', 'DESC')
          .addOrderBy('prompt.createdAt', 'DESC');
        break;
      case 'newest':
      default:
        queryBuilder = queryBuilder.orderBy('prompt.createdAt', 'DESC');
    }

    console.log('Final SQL:', queryBuilder.getSql());
    console.log('Parameters:', queryBuilder.getParameters());

    // Get total count using a separate query
    const totalCount = await promptRepository
      .createQueryBuilder('prompt')
      .where('prompt.isPublic = :isPublic', { isPublic: true })
      .getCount();

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);
    const prompts = await queryBuilder
      .skip(skip)
      .take(Number(limit))
      .getRawMany();

    console.log('Raw SQL results:', JSON.stringify(prompts[0], null, 2));

    // Transform the results maintaining accurate counts
    const transformedPrompts = prompts.map(raw => {
      // Handle tags - split if string, otherwise use empty array
      const tags = typeof raw.prompt_tags === 'string' && raw.prompt_tags 
        ? raw.prompt_tags.split(/[,#]/)
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag)
        : [];

      // Handle imageUrls - make into array if string, otherwise use empty array
      const imageUrls = typeof raw.prompt_imageUrls === 'string' && raw.prompt_imageUrls
        ? [raw.prompt_imageUrls]
        : [];

      const prompt = {
        id: raw.prompt_id,
        title: raw.prompt_title,
        description: raw.prompt_description,
        content: raw.prompt_content,
        category: raw.prompt_category,
        isPublic: raw.prompt_isPublic,
        likes: raw.prompt_likes,
        totalViews: raw.prompt_totalViews,
        totalCopies: raw.prompt_totalCopies,
        averageRating: raw.prompt_averageRating,
        tags,
        imageUrls,
        createdAt: raw.prompt_createdAt,
        updatedAt: raw.prompt_updatedAt,
        hasVoted: raw.hasVoted === 1,
        author: {
          id: raw.author_id,
          username: raw.author_username,
          bio: raw.author_bio,
          website: raw.author_website,
          avatarUrl: raw.author_avatarUrl,
          darkMode: raw.author_darkMode,
          isAdmin: raw.author_isAdmin,
          createdAt: raw.author_createdAt,
          updatedAt: raw.author_updatedAt
        }
      };

      console.log('Raw prompt data:', {
        id: prompt.id,
        rawTags: raw.prompt_tags,
        rawImageUrls: raw.prompt_imageUrls,
        hasVoted: raw.hasVoted,
        transformedTags: prompt.tags,
        transformedImageUrls: prompt.imageUrls
      });

      return transformPromptData(prompt, isAuthenticated(req) ? { id: req.user.id } : undefined);
    });

    // Return paginated results
    res.json({
      prompts: transformedPrompts,
      totalPages: Math.ceil(totalCount / +limit),
      currentPage: +page,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ message: 'Error fetching prompts' });
  }
});

// Get popular tags
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompts = await promptRepository
      .createQueryBuilder('prompt')
      .select('prompt.tags')
      .where('prompt.isPublic = :isPublic', { isPublic: true })
      .getMany();
    
    // Return empty array if no prompts exist
    if (!prompts || prompts.length === 0) {
      return res.json([]);
    }
    
    const tagCounts = new Map<string, number>();
    
    prompts.forEach((prompt: Prompt) => {
      if (prompt.tags) {
        prompt.tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    const result = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Number(req.query.limit) || 10);

    res.json(result);
  } catch (err) {
    console.error('Error fetching popular tags:', err);
    res.status(500).json({ message: 'Error fetching popular tags' });
  }
});

// Get popular tags
router.get('/popular-tags', async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    const tags = await promptRepository
      .createQueryBuilder('prompt')
      .select('prompt.tags', 'tags')
      .getMany();

    const tagCounts: Record<string, number> = {};

    tags.forEach(prompt => {
      prompt.tags.forEach((tag: string) => {
        if (!tagCounts[tag]) {
          tagCounts[tag] = 0;
        }
        tagCounts[tag]++;
      });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

    res.json(sortedTags.slice(0, 10));
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ message: 'Error fetching popular tags' });
  }
});

// Get prompts by user ID
router.get('/byUserId/:userId', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const queryBuilder = promptRepository.createQueryBuilder('prompt')
      .innerJoinAndSelect('prompt.author', 'author')
      .leftJoinAndSelect('prompt.metrics', 'metrics')
      .where('author.id = :userId', { userId: req.params.userId });

    // Show private prompts only if the user is viewing their own profile
    if (!req.user || req.user.id !== req.params.userId) {
      queryBuilder.andWhere('prompt.isPublic = :isPublic', { isPublic: true });
    }

    const prompts = await queryBuilder
      .orderBy('prompt.createdAt', 'DESC')
      .getMany();

    // Transform prompts and only include edit/delete options for own prompts
    const transformedPrompts = prompts.map(prompt => {
      const data = transformPromptData(prompt);
      // Only include edit/delete capabilities if it's the user's own prompt
      if (req.user && req.user.id === prompt.author.id) {
        data.canEdit = true;
        data.canDelete = true;
      }
      return data;
    });

    res.json(transformedPrompts);
  } catch (err) {
    console.error('Error fetching user prompts:', err);
    res.status(500).json({ message: 'Error fetching prompts' });
  }
});

// Get prompt by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    
    // Create base query
    let queryBuilder = promptRepository
      .createQueryBuilder('prompt')
      .leftJoinAndSelect('prompt.author', 'author')
      .leftJoinAndSelect('prompt.metrics', 'metrics');

    // Only join votes for the current user if authenticated
    if (isAuthenticated(req)) {
      queryBuilder = queryBuilder
        .leftJoin('prompt_votes', 'votes', 'votes.promptId = prompt.id AND votes.userId = :userId', { userId: req.user.id })
        .addSelect('CASE WHEN votes.id IS NOT NULL THEN 1 ELSE 0 END', 'hasVoted');
    }

    // Get the prompt
    const prompt = await queryBuilder
      .where('prompt.id = :id', { id: req.params.id })
      .getOne();

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Transform the prompt data with user info if authenticated
    const userData = isAuthenticated(req) ? {
      id: req.user.id,
      isAdmin: req.user.isAdmin
    } : undefined;

    const response = transformPromptData(prompt, userData);
    res.json(response);

  } catch (err) {
    console.error('Error fetching prompt:', err);
    res.status(500).json({ message: 'Error fetching prompt' });
  }
});

// Copy a prompt (POST endpoint)
router.post('/:id/copy', optionalAuth, async (req: Request, res: Response) => {
  try {
    console.log('Copy request for prompt:', req.params.id);
    const promptRepository = AppDataSource.getRepository(Prompt);
    const copyRepository = AppDataSource.getRepository(PromptCopy);
    const anonymousCopyRepository = AppDataSource.getRepository(AnonymousPromptCopy);
    
    const prompt = await promptRepository.findOne({
      where: { id: req.params.id },
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    if (isAuthenticated(req)) {
      console.log('Creating copy for authenticated user:', req.user.id);
      // For authenticated users, check if they've already copied
      const existingCopy = await copyRepository.findOne({
        where: {
          promptId: req.params.id,
          userId: req.user.id,
        },
      });

      if (existingCopy) {
        return res.json({ 
          message: 'Already copied',
          totalCopies: prompt.totalCopies,
        });
      }

      // Create new copy record
      const copy = copyRepository.create({
        promptId: req.params.id,
        userId: req.user.id,
      });
      await copyRepository.save(copy);
      console.log('Saved user copy');
    } else {
      // For anonymous users, track by hashed IP
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const ipHash = hashIP(clientIp);

      const existingAnonymousCopy = await anonymousCopyRepository.findOne({
        where: {
          promptId: req.params.id,
          ipHash,
        },
      });

      if (existingAnonymousCopy) {
        return res.json({ 
          message: 'Already copied',
          totalCopies: prompt.totalCopies,
        });
      }

      // Create new anonymous copy record
      const anonymousCopy = anonymousCopyRepository.create({
        promptId: req.params.id,
        ipHash,
      });
      await anonymousCopyRepository.save(anonymousCopy);
      console.log('Saved anonymous copy');
    }

    // Get the updated prompt to get the latest count from the trigger
    const updatedPrompt = await promptRepository.findOne({
      where: { id: req.params.id },
    });

    console.log('Copy saved, returning updated count:', updatedPrompt?.totalCopies);

    res.json({ 
      message: 'Prompt copied successfully',
      totalCopies: updatedPrompt?.totalCopies || prompt.totalCopies,
    });
  } catch (error) {
    console.error('Error copying prompt:', error);
    res.status(500).json({ message: 'Error copying prompt' });
  }
});

// Check if user has copied a prompt (GET endpoint)
router.get('/:id/copy', async (req: Request, res: Response) => {
  try {
    // If user is not authenticated, they haven't copied it
    if (!isAuthenticated(req)) {
      return res.json({ copied: false });
    }

    const copyRepository = AppDataSource.getRepository(PromptCopy);
    const copy = await copyRepository.findOne({
      where: {
        promptId: req.params.id,
        userId: req.user.id,
      },
    });

    res.json({ copied: !!copy });
  } catch (error) {
    console.error('Error checking copy status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new prompt (requires signature verification)
router.post('/', [auth, signatureAuth], async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { title, description, content, category, isPublic, tags, imageUrls } = req.body;
    
    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }
    if (!Object.values(PromptCategory).includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const userRepository = AppDataSource.getRepository(User);
    const globalStatsRepository = AppDataSource.getRepository(GlobalStats);
    
    const author = await userRepository.findOneBy({ id: req.user.id });
    if (!author) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Increment user's prompt generation count
    author.promptsGenerated += 1;
    await userRepository.save(author);

    // Increment global prompt count
    let globalStats = await globalStatsRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' }
    });

    if (!globalStats) {
      globalStats = globalStatsRepository.create({
        totalPromptsGenerated: 1
      });
    } else {
      globalStats.totalPromptsGenerated += 1;
    }
    await globalStatsRepository.save(globalStats);

    // Parse tags from string if needed
    let parsedTags = tags;
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = [];
      }
    }

    const newPrompt = new Prompt();
    newPrompt.title = title;
    newPrompt.description = description;
    newPrompt.content = content;
    newPrompt.category = category;
    newPrompt.isPublic = isPublic !== false;
    newPrompt.tags = parsedTags?.filter((tag: string) => tag.trim()) ?? [];
    newPrompt.imageUrls = imageUrls || []; // Use the imageUrls from the request body
    newPrompt.author = author;
    newPrompt.likes = 0;
    newPrompt.totalViews = 0;
    newPrompt.totalCopies = 0;

    const prompt = await promptRepository.save(newPrompt);
    res.status(201).json(transformPromptData(prompt, { id: req.user.id }));
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ message: 'Error creating prompt' });
  }
});

// Upload an image for a prompt
router.post('/upload-image', auth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Return the URL that will be used to access the image
    const imageUrl = `/api/uploads/prompt-images/${req.file.filename}`;
    
    res.status(201).json({ url: imageUrl });
  } catch (error) {
    console.error('Error uploading prompt image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Update prompt (requires signature verification)
router.patch('/:id', [auth, signatureAuth], async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompt = await promptRepository.findOne({
      where: { id: req.params.id },
      relations: ['author'],
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Allow both the prompt owner and admins to edit
    if (prompt.author.id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this prompt' });
    }

    Object.assign(prompt, req.body);
    await promptRepository.save(prompt);
    res.json(transformPromptData(prompt));
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ message: 'Error updating prompt' });
  }
});

// Delete prompt (requires signature verification)
router.delete('/:id', [auth, signatureAuth], async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompt = await promptRepository.findOne({
      where: { id: req.params.id },
      relations: ['author'],
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    if (prompt.author.id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this prompt' });
    }

    await promptRepository.remove(prompt);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ message: 'Error deleting prompt' });
  }
});

// Vote on prompt (requires signature verification)
router.post('/:id/vote', [auth, signatureAuth], async (req: Request, res: Response) => {
  console.log('Vote endpoint started');
  const manager = AppDataSource.manager;
  
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Starting vote operation for prompt:', req.params.id);

    // Get the current vote count using raw query
    const currentVotes = await manager.query(
      'SELECT likes FROM prompts WHERE id = $1',
      [req.params.id]
    );

    if (!currentVotes || currentVotes.length === 0) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    const currentLikes = currentVotes[0].likes || 0;
    console.log('Current likes:', currentLikes);

    // Check for existing vote
    const existingVote = await manager.findOne(PromptVote, {
      where: {
        promptId: req.params.id,
        userId: req.user.id
      }
    });

    console.log('Has existing vote:', !!existingVote);

    let newLikes = currentLikes;
    let voted = false;

    if (existingVote) {
      // Remove vote
      console.log('Removing vote');
      await manager.remove(existingVote);
      newLikes = Math.max(0, currentLikes - 1);
    } else {
      // Add vote
      console.log('Adding vote');
      const vote = manager.create(PromptVote, {
        promptId: req.params.id,
        userId: req.user.id
      });
      await manager.save(vote);
      newLikes = currentLikes + 1;
      voted = true;
    }

    // Update likes count using raw query
    await manager.query(
      'UPDATE prompts SET likes = $1 WHERE id = $2',
      [newLikes, req.params.id]
    );

    console.log('Updated likes:', newLikes);

    return res.status(200).json({
      voted,
      votes: newLikes,
      hasVoted: voted
    });

  } catch (error: any) {
    console.error('Error voting:', error);
    return res.status(500).json({ 
      message: 'Error processing vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Like/Unlike prompt
router.post('/:id/like', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const userRepository = AppDataSource.getRepository(User);
    const voteRepository = AppDataSource.getRepository(PromptVote);
    
    const [prompt, user] = await Promise.all([
      promptRepository.findOne({
        where: { id: req.params.id },
        relations: ['votes']
      }),
      userRepository.findOneBy({ id: req.user.id })
    ]);

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userIndex = prompt.votes.findIndex((vote) => vote.userId === user.id);
    
    if (userIndex > -1) {
      prompt.votes = prompt.votes.filter((vote) => vote.userId !== user.id);
      prompt.likes--;
    } else {
      const newVote = new PromptVote();
      newVote.promptId = prompt.id;
      newVote.userId = user.id;
      newVote.prompt = prompt;
      newVote.user = user;
      const vote = await voteRepository.save(newVote);
      prompt.votes = [...(prompt.votes || []), vote];
      prompt.likes++;
    }

    await promptRepository.save(prompt);
    res.json(transformPromptData(prompt));
  } catch (err) {
    console.error('Error updating prompt likes:', err);
    res.status(500).json({ message: 'Error updating prompt likes' });
  }
});

// Get vote status for a prompt
router.get('/:id/vote', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const voteRepository = AppDataSource.getRepository(PromptVote);
    const vote = await voteRepository.findOne({
      where: { promptId: req.params.id, userId: req.user.id }
    });

    return res.json({ voted: !!vote });
  } catch (error) {
    console.error('Error checking vote status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Rate prompt
router.post('/:id/rate', auth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating' });
    }

    const promptRepository = AppDataSource.getRepository(Prompt);
    const metricsRepository = AppDataSource.getRepository(PromptMetrics);

    const prompt = await promptRepository.findOne({
      where: { id: req.params.id },
      relations: ['metrics'],
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    let metrics = await metricsRepository.findOne({
      where: {
        prompt: { id: prompt.id },
        user: { id: req.user!.id },
      },
    });

    if (!metrics) {
      metrics = metricsRepository.create({
        prompt,
        user: req.user!,
        rating,
      });
    } else {
      metrics.rating = rating;
    }

    await metricsRepository.save(metrics);

    // Update total votes instead of average rating
    prompt.votes = await metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.promptId = :promptId', { promptId: prompt.id })
      .andWhere('metrics.rating IS NOT NULL')
      .select('COUNT(metrics.rating)', 'total')
      .getRawOne()
      .then(result => result.total || 0);

    await promptRepository.save(prompt);

    res.json({ votes: prompt.votes });
  } catch (err) {
    console.error('Error rating prompt:', err);
    res.status(500).json({ message: 'Error rating prompt' });
  }
});

// Admin Routes

// Get all prompts for admin
router.get('/admin/all', adminAuth, async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [prompts, total] = await promptRepository
      .createQueryBuilder('prompt')
      .innerJoinAndSelect('prompt.author', 'author')
      .select([
        'prompt.id',
        'prompt.title',
        'prompt.createdAt',
        'author.id',
        'author.username',
        'author.avatarUrl',
        'author.bio',
        'author.website',
        'author.createdAt',
        'author.updatedAt',
        'author.isAdmin',
        'author.darkMode'
      ])
      .orderBy('prompt.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const transformedPrompts = prompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      createdAt: prompt.createdAt,
      authorSafe: toSafeUser(prompt.author)
    }));

    res.json({
      items: transformedPrompts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching prompts:', err);
    res.status(500).json({ message: 'Error fetching prompts' });
  }
});

// Delete prompt (admin only)
router.delete('/admin/:id', auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompt = await promptRepository.findOne({
      where: { id: req.params.id },
      relations: ['author'],
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Delete associated metrics and votes first
    const metricsRepository = AppDataSource.getRepository(PromptMetrics);
    const voteRepository = AppDataSource.getRepository(PromptVote);
    
    await Promise.all([
      metricsRepository.delete({ prompt: { id: prompt.id } }),
      voteRepository.delete({ prompt: { id: prompt.id } }),
    ]);

    // Then delete the prompt
    await promptRepository.remove(prompt);

    res.json({ message: 'Prompt deleted successfully' });
  } catch (err) {
    console.error('Error deleting prompt:', err);
    res.status(500).json({ message: 'Error deleting prompt' });
  }
});

// Get global stats - no rate limiting for this endpoint
router.get('/stats/global', async (_req: Request, res: Response) => {
  try {
    const globalStatsRepo = AppDataSource.getRepository(GlobalStats);
    let globalStats = await globalStatsRepo.findOne({ where: {} });
    
    if (!globalStats) {
      globalStats = globalStatsRepo.create({
        totalPromptsGenerated: 0
      });
      await globalStatsRepo.save(globalStats);
    }
    
    res.json(globalStats);
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ message: 'Error fetching global stats' });
  }
});

export default router;
