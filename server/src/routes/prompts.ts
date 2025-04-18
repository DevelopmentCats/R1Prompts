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
  totalVotes: number;
  tags: string[];
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  totalViews: number;
  totalCopies: number;
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

  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    category: prompt.category,
    isPublic: prompt.isPublic === false ? false : true, // Default to true if undefined
    totalVotes: prompt.totalVotes || 0,
    totalViews: prompt.totalViews || 0,
    totalCopies: prompt.totalCopies || 0,
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

    // Enforce a maximum limit to prevent excessive loading
    const limit = Math.min(Number(rawLimit), 50);
    const skip = (Number(page) - 1) * Number(limit);

    // Build ORDER BY clause based on sort parameter
    let orderByClause;
    switch (sort) {
      case 'votes':
        orderByClause = 'p."totalVotes" DESC, p."createdAt" DESC';
        break;
      case 'copies':
        orderByClause = 'p."totalCopies" DESC, p."createdAt" DESC';
        break;
      case 'newest':
      default:
        orderByClause = 'p."createdAt" DESC';
    }

    // Use QueryBuilder instead of raw SQL to avoid parameter issues
    const queryBuilder = promptRepository.createQueryBuilder('p')
      .select([
        'p.id as prompt_id',
        'p.title as prompt_title',
        'p.description as prompt_description',
        'p.content as prompt_content',
        'p.category as prompt_category',
        'p.isPublic as prompt_isPublic',
        'p.totalVotes as prompt_totalVotes',
        'p.totalViews as prompt_totalViews',
        'p.totalCopies as prompt_totalCopies',
        'p.tags as prompt_tags',
        'p.imageUrls as prompt_imageUrls',
        'p.createdAt as prompt_createdAt',
        'p.updatedAt as prompt_updatedAt',
        'a.id as author_id',
        'a.username as author_username',
        'a.bio as author_bio',
        'a.website as author_website',
        'a.avatarUrl as author_avatarUrl',
        'a.darkMode as author_darkMode',
        'a.isAdmin as author_isAdmin',
        'a.createdAt as author_createdAt',
        'a.updatedAt as author_updatedAt'
      ])
      .leftJoin('users', 'a', 'p.author_id = a.id')
      .where('p.isPublic = :isPublic', { isPublic: true });

    // Add vote status for authenticated users
    if (isAuthenticated(req)) {
      queryBuilder.addSelect('CASE WHEN pv.id IS NOT NULL THEN 1 ELSE 0 END', 'hasVoted')
        .leftJoin('prompt_votes', 'pv', 'p.id = pv.promptId AND pv.userId = :userId', 
          { userId: req.user!.id });
    } else {
      queryBuilder.addSelect('0', 'hasVoted');
    }

    // Add search filter if provided
    if (search) {
      queryBuilder.andWhere('(LOWER(p.title) LIKE LOWER(:search) OR LOWER(p.description) LIKE LOWER(:search))', 
        { search: `%${search}%` });
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      queryBuilder.andWhere('p.category = :category', { category });
    }

    // Add tag filter if provided
    if (tag) {
      queryBuilder.andWhere(':tag = ANY(p.tags)', { tag });
    }

    // Add sorting and pagination
    queryBuilder
      .skip(skip)
      .take(limit);

    // Apply proper sorting based on sort parameter
    if (sort === 'votes') {
      queryBuilder
        .orderBy('p.totalVotes', 'DESC')
        .addOrderBy('p.createdAt', 'DESC')
        .addOrderBy('p.id', 'ASC');
    } else if (sort === 'copies') {
      queryBuilder
        .orderBy('p.totalCopies', 'DESC')
        .addOrderBy('p.createdAt', 'DESC')
        .addOrderBy('p.id', 'ASC');
    } else {
      queryBuilder
        .orderBy('p.createdAt', 'DESC')
        .addOrderBy('p.id', 'ASC');
    }

    // Execute the query
    const [prompts, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount()
    ]);

    // Transform the results
    const transformedPrompts = prompts.map((raw: any) => {
      // Handle tags - split if string, otherwise use empty array
      const tags = Array.isArray(raw.prompt_tags) ? raw.prompt_tags.filter((tag: string) => tag && tag.trim()) : 
                    (typeof raw.prompt_tags === 'string' ? raw.prompt_tags.split(',').filter((tag: string) => tag && tag.trim()) : []);
      
      // Handle imageUrls - make into array if string, otherwise use empty array
      // The database column is called 'imageUrls' but SQL returns lowercase 'imageurls'
      const rawImageUrls = raw.prompt_imageurls || raw.prompt_imageUrls;
      const imageUrls = Array.isArray(rawImageUrls) ? rawImageUrls :
                       (typeof rawImageUrls === 'string' && rawImageUrls.trim() ? [rawImageUrls] : []);

      const prompt = {
        id: raw.prompt_id,
        title: raw.prompt_title,
        description: raw.prompt_description,
        content: raw.prompt_content,
        category: raw.prompt_category,
        isPublic: raw.prompt_ispublic === true, // Ensure boolean conversion
        totalVotes: parseInt(raw.prompt_totalvotes || 0, 10), // Ensure numeric conversion and handle case
        totalViews: parseInt(raw.prompt_totalviews || 0, 10), // Ensure numeric conversion and handle case
        totalCopies: parseInt(raw.prompt_totalcopies || 0, 10), // Ensure numeric conversion and handle case
        tags,
        imageUrls,
        createdAt: raw.prompt_createdat,
        updatedAt: raw.prompt_updatedat,
        hasVoted: raw.hasvoted === 1,
        author: {
          id: raw.author_id,
          username: raw.author_username,
          bio: raw.author_bio || '',
          website: raw.author_website || '',
          avatarUrl: raw.author_avatarurl || '',
          darkMode: !!raw.author_darkmode,
          isAdmin: !!raw.author_isadmin,
          createdAt: raw.author_createdat,
          updatedAt: raw.author_updatedat
        }
      };

      return transformPromptData(prompt, isAuthenticated(req) ? { id: req.user!.id } : undefined);
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
    // Add detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
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
    }

    // Get the updated prompt to get the latest count from the trigger
    const updatedPrompt = await promptRepository.findOne({
      where: { id: req.params.id },
    });

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
    newPrompt.totalVotes = 0;
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
  const manager = AppDataSource.manager;
  
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the current vote count using raw query
    const currentPrompt = await manager.query(
      'SELECT "totalVotes" FROM prompts WHERE id = $1',
      [req.params.id]
    );

    if (!currentPrompt || currentPrompt.length === 0) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    const currentVotes = currentPrompt[0].totalVotes || 0;

    // Check for existing vote
    const existingVote = await manager.findOne(PromptVote, {
      where: {
        promptId: req.params.id,
        userId: req.user.id
      }
    });

    let newVoteCount = currentVotes;
    let voted = false;

    if (existingVote) {
      // Remove vote
      await manager.remove(existingVote);
      newVoteCount = Math.max(0, currentVotes - 1);
    } else {
      // Add vote
      const vote = manager.create(PromptVote, {
        promptId: req.params.id,
        userId: req.user.id
      });
      await manager.save(vote);
      newVoteCount = currentVotes + 1;
      voted = true;
    }

    // Update vote count using raw query
    await manager.query(
      'UPDATE prompts SET "totalVotes" = $1 WHERE id = $2',
      [newVoteCount, req.params.id]
    );

    return res.status(200).json({
      voted,
      votes: newVoteCount,
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
