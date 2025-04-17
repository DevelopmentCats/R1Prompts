"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const Prompt_1 = require("../entities/Prompt");
const auth_1 = require("../middleware/auth");
const signatureAuth_1 = require("../middleware/signatureAuth");
const User_1 = require("../entities/User");
const PromptMetrics_1 = require("../entities/PromptMetrics");
const PromptVote_1 = require("../entities/PromptVote");
const PromptCopy_1 = require("../entities/PromptCopy");
const AnonymousPromptCopy_1 = require("../entities/AnonymousPromptCopy");
const upload_1 = require("../middleware/upload");
const user_1 = require("../types/user");
const GlobalStats_1 = require("../entities/GlobalStats");
const crypto = __importStar(require("crypto"));
const router = (0, express_1.Router)();
// Helper function to transform prompt data
const transformPromptData = (prompt, user) => {
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
        isPublic: prompt.isPublic,
        likes: prompt.likes,
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
    };
};
// Helper function to hash IP address
const hashIP = (ip) => {
    return crypto
        .createHash('sha256')
        .update(ip + process.env.IP_HASH_SECRET)
        .digest('hex');
};
// Get current user's prompts
router.get('/user', auth_1.auth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
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
    }
    catch (err) {
        console.error('Error fetching user prompts:', err);
        res.status(500).json({ message: 'Error fetching prompts' });
    }
});
// Get all prompts with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const { category, search, tag, sort = 'newest', page = 1, limit: rawLimit = 20, } = req.query;
        console.log('Sort parameter:', sort); // Debug log
        // Enforce a maximum limit to prevent excessive loading
        const limit = Math.min(Number(rawLimit), 50);
        // Build base query for getting prompts
        let queryBuilder = promptRepository
            .createQueryBuilder('prompt')
            .leftJoinAndSelect('prompt.author', 'author');
        // Only join votes for the current user if authenticated
        if ((0, auth_1.isAuthenticated)(req)) {
            queryBuilder = queryBuilder
                .leftJoinAndSelect('prompt.votes', 'votes', 'votes.userId = :userId', { userId: req.user.id });
        }
        // Add base where clause
        queryBuilder = queryBuilder
            .where('prompt.isPublic = :isPublic', { isPublic: true });
        // Apply category filter
        if (category && category !== 'all') {
            queryBuilder = queryBuilder.andWhere('prompt.category = :category', { category });
        }
        // Apply tag filter
        if (tag) {
            queryBuilder = queryBuilder.andWhere('prompt.tags LIKE :tag', { tag: `%${tag}%` });
        }
        // Apply search filter if provided
        if (search) {
            queryBuilder = queryBuilder
                .andWhere('(prompt.title ILIKE :search OR prompt.description ILIKE :search OR prompt.tags::text ILIKE :search)', { search: `%${search}%` });
        }
        // Apply sorting
        switch (sort) {
            case 'votes':
                queryBuilder = queryBuilder.orderBy('prompt.likes', 'DESC');
                break;
            case 'copies':
                queryBuilder = queryBuilder.orderBy('prompt.totalCopies', 'DESC');
                break;
            case 'newest':
            default:
                queryBuilder = queryBuilder.orderBy('prompt.createdAt', 'DESC');
        }
        console.log('Query before pagination:', queryBuilder.getSql());
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
            .getMany();
        console.log('Raw results:', JSON.stringify(prompts, null, 2));
        // Transform the results maintaining accurate counts
        const transformedPrompts = prompts.map(prompt => {
            return transformPromptData(prompt, (0, auth_1.isAuthenticated)(req) ? { id: req.user.id } : undefined);
        });
        // Return paginated results
        res.json({
            prompts: transformedPrompts,
            totalPages: Math.ceil(totalCount / +limit),
            currentPage: +page,
            totalCount,
        });
    }
    catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({ message: 'Error fetching prompts' });
    }
});
// Get popular tags
router.get('/tags/popular', async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const prompts = await promptRepository
            .createQueryBuilder('prompt')
            .select('prompt.tags')
            .where('prompt.isPublic = :isPublic', { isPublic: true })
            .getMany();
        // Return empty array if no prompts exist
        if (!prompts || prompts.length === 0) {
            return res.json([]);
        }
        const tagCounts = new Map();
        prompts.forEach((prompt) => {
            if (prompt.tags) {
                prompt.tags.forEach((tag) => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            }
        });
        const result = Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, Number(req.query.limit) || 10);
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching popular tags:', err);
        res.status(500).json({ message: 'Error fetching popular tags' });
    }
});
// Get popular tags
router.get('/popular-tags', async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const tags = await promptRepository
            .createQueryBuilder('prompt')
            .select('prompt.tags', 'tags')
            .getMany();
        const tagCounts = {};
        tags.forEach(prompt => {
            prompt.tags.forEach((tag) => {
                if (!tagCounts[tag]) {
                    tagCounts[tag] = 0;
                }
                tagCounts[tag]++;
            });
        });
        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        res.json(sortedTags.slice(0, 10));
    }
    catch (error) {
        console.error('Error fetching popular tags:', error);
        res.status(500).json({ message: 'Error fetching popular tags' });
    }
});
// Get prompts by user ID
router.get('/byUserId/:userId', auth_1.auth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
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
    }
    catch (err) {
        console.error('Error fetching user prompts:', err);
        res.status(500).json({ message: 'Error fetching prompts' });
    }
});
// Get prompt by ID
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const prompt = await promptRepository
            .createQueryBuilder('prompt')
            .select([
            'prompt.id',
            'prompt.title',
            'prompt.description',
            'prompt.content',
            'prompt.category',
            'prompt.isPublic',
            'prompt.tags',
            'prompt.imageUrls',
            'prompt.createdAt',
            'prompt.votes',
            'prompt.totalCopies',
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
            .innerJoin('prompt.author', 'author')
            .leftJoinAndSelect('prompt.metrics', 'metrics')
            .leftJoinAndSelect('prompt.votes', 'votes')
            .where('prompt.id = :id', { id: req.params.id })
            .getOne();
        if (!prompt) {
            return res.status(404).json({ message: 'Prompt not found' });
        }
        // Update the totals before sending response
        await prompt.updateTotals();
        await promptRepository.save(prompt);
        // Transform the prompt data with user info if authenticated
        const userData = (0, auth_1.isAuthenticated)(req) ? {
            id: req.user.id,
            isAdmin: req.user.isAdmin
        } : undefined;
        console.log('User data for transform:', userData);
        const response = transformPromptData(prompt, userData);
        console.log('GET /:id response:', {
            id: response.id,
            authorId: response.authorSafe.id,
            userId: userData?.id,
            isAdmin: userData?.isAdmin,
            canEdit: response.canEdit,
            canDelete: response.canDelete
        });
        return res.json(response);
    }
    catch (error) {
        console.error('Error fetching prompt:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Copy a prompt (POST endpoint)
router.post('/:id/copy', async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const copyRepository = database_1.AppDataSource.getRepository(PromptCopy_1.PromptCopy);
        const anonymousCopyRepository = database_1.AppDataSource.getRepository(AnonymousPromptCopy_1.AnonymousPromptCopy);
        const prompt = await promptRepository.findOne({
            where: { id: req.params.id },
            relations: ['author', 'votes', 'promptCopies', 'anonymousCopies'],
        });
        if (!prompt) {
            return res.status(404).json({ message: 'Prompt not found' });
        }
        let shouldIncrementCount = false;
        if ((0, auth_1.isAuthenticated)(req)) {
            // For authenticated users, check if they've already copied
            const existingCopy = await copyRepository.findOne({
                where: {
                    promptId: req.params.id,
                    userId: req.user.id,
                },
            });
            if (!existingCopy) {
                // Create new copy record
                const copy = copyRepository.create({
                    promptId: req.params.id,
                    userId: req.user.id,
                });
                await copyRepository.save(copy);
                shouldIncrementCount = true;
            }
        }
        else {
            // For anonymous users, track by hashed IP
            const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
            const ipHash = hashIP(clientIp);
            try {
                // Create new anonymous copy record
                const anonymousCopy = anonymousCopyRepository.create({
                    promptId: req.params.id,
                    ipHash,
                });
                await anonymousCopyRepository.save(anonymousCopy);
                shouldIncrementCount = true;
            }
            catch (err) { // Type as any to access PostgreSQL error code
                // If we get a unique constraint violation, the IP has already copied this prompt
                if (err?.code === '23505') { // PostgreSQL unique violation code
                    shouldIncrementCount = false;
                }
                else {
                    throw err;
                }
            }
        }
        // Only increment the total copies count if this is a new copy
        if (shouldIncrementCount) {
            await prompt.updateTotals();
            await promptRepository.save(prompt);
        }
        res.json({
            message: 'Prompt copied successfully',
            isAuthenticated: (0, auth_1.isAuthenticated)(req),
            totalCopies: prompt.totalCopies,
        });
    }
    catch (error) {
        console.error('Error copying prompt:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Check if user has copied a prompt (GET endpoint)
router.get('/:id/copy', async (req, res) => {
    try {
        // If user is not authenticated, they haven't copied it
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.json({ copied: false });
        }
        const copyRepository = database_1.AppDataSource.getRepository(PromptCopy_1.PromptCopy);
        const copy = await copyRepository.findOne({
            where: {
                promptId: req.params.id,
                userId: req.user.id,
            },
        });
        res.json({ copied: !!copy });
    }
    catch (error) {
        console.error('Error checking copy status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Create a new prompt (requires signature verification)
router.post('/', [auth_1.auth, signatureAuth_1.signatureAuth], async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
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
        if (!Object.values(Prompt_1.PromptCategory).includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const globalStatsRepository = database_1.AppDataSource.getRepository(GlobalStats_1.GlobalStats);
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
        }
        else {
            globalStats.totalPromptsGenerated += 1;
        }
        await globalStatsRepository.save(globalStats);
        // Parse tags from string if needed
        let parsedTags = tags;
        if (typeof tags === 'string') {
            try {
                parsedTags = JSON.parse(tags);
            }
            catch (e) {
                parsedTags = [];
            }
        }
        const newPrompt = new Prompt_1.Prompt();
        newPrompt.title = title;
        newPrompt.description = description;
        newPrompt.content = content;
        newPrompt.category = category;
        newPrompt.isPublic = isPublic !== false;
        newPrompt.tags = parsedTags?.filter((tag) => tag.trim()) ?? [];
        newPrompt.imageUrls = imageUrls || []; // Use the imageUrls from the request body
        newPrompt.author = author;
        newPrompt.likes = 0;
        newPrompt.totalViews = 0;
        newPrompt.totalCopies = 0;
        const prompt = await promptRepository.save(newPrompt);
        res.status(201).json(transformPromptData(prompt, { id: req.user.id }));
    }
    catch (error) {
        console.error('Error creating prompt:', error);
        res.status(500).json({ message: 'Error creating prompt' });
    }
});
// Upload an image for a prompt
router.post('/upload-image', auth_1.auth, upload_1.upload.single('image'), async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        // Return the URL that will be used to access the image
        const imageUrl = `/api/uploads/prompt-images/${req.file.filename}`;
        res.status(201).json({ url: imageUrl });
    }
    catch (error) {
        console.error('Error uploading prompt image:', error);
        res.status(500).json({ message: 'Error uploading image' });
    }
});
// Update prompt (requires signature verification)
router.patch('/:id', [auth_1.auth, signatureAuth_1.signatureAuth], async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
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
    }
    catch (error) {
        console.error('Error updating prompt:', error);
        res.status(500).json({ message: 'Error updating prompt' });
    }
});
// Delete prompt (requires signature verification)
router.delete('/:id', [auth_1.auth, signatureAuth_1.signatureAuth], async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
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
    }
    catch (error) {
        console.error('Error deleting prompt:', error);
        res.status(500).json({ message: 'Error deleting prompt' });
    }
});
// Rate prompt
router.post('/:id/rate', auth_1.auth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid rating' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const metricsRepository = database_1.AppDataSource.getRepository(PromptMetrics_1.PromptMetrics);
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
                user: { id: req.user.id },
            },
        });
        if (!metrics) {
            metrics = metricsRepository.create({
                prompt,
                user: req.user,
                rating,
            });
        }
        else {
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
    }
    catch (err) {
        console.error('Error rating prompt:', err);
        res.status(500).json({ message: 'Error rating prompt' });
    }
});
// Like/Unlike prompt
router.post('/:id/like', auth_1.auth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const voteRepository = database_1.AppDataSource.getRepository(PromptVote_1.PromptVote);
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
        }
        else {
            const newVote = new PromptVote_1.PromptVote();
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
    }
    catch (err) {
        console.error('Error updating prompt likes:', err);
        res.status(500).json({ message: 'Error updating prompt likes' });
    }
});
// Get vote status for a prompt
router.get('/:id/vote', auth_1.auth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const voteRepository = database_1.AppDataSource.getRepository(PromptVote_1.PromptVote);
        const vote = await voteRepository.findOne({
            where: { promptId: req.params.id, userId: req.user.id }
        });
        return res.json({ voted: !!vote });
    }
    catch (error) {
        console.error('Error checking vote status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// Vote on prompt (requires signature verification)
router.post('/:id/vote', [auth_1.auth, signatureAuth_1.signatureAuth], async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        let voted = false;
        let votes = 0;
        await database_1.AppDataSource.manager.transaction(async (manager) => {
            // Get the prompt and check if user has already voted in a single query
            const prompt = await manager.findOne(Prompt_1.Prompt, {
                where: { id: req.params.id },
                relations: ['votes']
            });
            if (!prompt) {
                throw new Error('Prompt not found');
            }
            const existingVote = await manager.findOne(PromptVote_1.PromptVote, {
                where: {
                    promptId: req.params.id,
                    userId: req.user.id
                }
            });
            const user = await manager.findOne(User_1.User, {
                where: { id: req.user.id }
            });
            if (!user) {
                throw new Error('User not found');
            }
            if (existingVote) {
                // Remove vote if already voted
                await manager.remove(existingVote);
                voted = false;
            }
            else {
                // Create new vote
                const vote = manager.create(PromptVote_1.PromptVote, {
                    promptId: req.params.id,
                    userId: req.user.id
                });
                await manager.save(vote);
                voted = true;
            }
            // Update vote count
            const votesCount = await manager
                .getRepository(PromptVote_1.PromptVote)
                .count({
                where: { promptId: req.params.id }
            });
            prompt.likes = votesCount;
            await manager.save(prompt);
            votes = votesCount;
        });
        return res.json({ voted, votes });
    }
    catch (error) {
        console.error('Error voting for prompt:', error);
        if (error.message === 'Prompt not found' || error.message === 'User not found') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error voting for prompt' });
    }
});
// Admin Routes
// Get all prompts for admin
router.get('/admin/all', auth_1.adminAuth, async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
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
            authorSafe: (0, user_1.toSafeUser)(prompt.author)
        }));
        res.json({
            items: transformedPrompts,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    }
    catch (err) {
        console.error('Error fetching prompts:', err);
        res.status(500).json({ message: 'Error fetching prompts' });
    }
});
// Delete prompt (admin only)
router.delete('/admin/:id', auth_1.auth, auth_1.adminAuth, async (req, res) => {
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const prompt = await promptRepository.findOne({
            where: { id: req.params.id },
            relations: ['author'],
        });
        if (!prompt) {
            return res.status(404).json({ message: 'Prompt not found' });
        }
        // Delete associated metrics and votes first
        const metricsRepository = database_1.AppDataSource.getRepository(PromptMetrics_1.PromptMetrics);
        const voteRepository = database_1.AppDataSource.getRepository(PromptVote_1.PromptVote);
        await Promise.all([
            metricsRepository.delete({ prompt: { id: prompt.id } }),
            voteRepository.delete({ prompt: { id: prompt.id } }),
        ]);
        // Then delete the prompt
        await promptRepository.remove(prompt);
        res.json({ message: 'Prompt deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting prompt:', err);
        res.status(500).json({ message: 'Error deleting prompt' });
    }
});
// Get global stats - no rate limiting for this endpoint
router.get('/stats/global', async (_req, res) => {
    try {
        const globalStatsRepo = database_1.AppDataSource.getRepository(GlobalStats_1.GlobalStats);
        let globalStats = await globalStatsRepo.findOne({ where: {} });
        if (!globalStats) {
            globalStats = globalStatsRepo.create({
                totalPromptsGenerated: 0
            });
            await globalStatsRepo.save(globalStats);
        }
        res.json(globalStats);
    }
    catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ message: 'Error fetching global stats' });
    }
});
exports.default = router;
