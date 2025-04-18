import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Prompt } from '../entities/Prompt';
import { PromptVote } from '../entities/PromptVote';
import { auth, adminAuth, isAuthenticated } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { z } from 'zod';
import { MoreThan, Like } from 'typeorm';
import path from 'path';
import fs from 'fs';
import { SafeUser, toSafeUser } from '../types/user';
import { GlobalStats } from '../entities/GlobalStats';

const router = Router();

// Helper function to safely remove password - only use this when email is needed
export const excludePassword = (user: User): Omit<User, 'password'> => {
  if (!user) {
    throw new Error('User object is required');
  }

  try {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error excluding password from user:', error);
    // Return minimal safe data on error
    return { 
      id: user.id,
      username: user.username,
      email: user.email,
    } as Omit<User, 'password'>;
  }
};

// Helper function to safely remove sensitive data
export const excludeSensitiveData = (user: User): SafeUser => {
  return toSafeUser(user);
};

// Profile update schema
const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  website: z.string()
    .transform((str: string) => str === '' ? undefined : str)
    .pipe(z.string().url().optional())
    .optional(),
  avatarUrl: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  darkMode: z.boolean().optional(),
});

// Get current user's profile (needs email for settings)
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Getting profile for user:', req.user?.id);
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.bio',
        'user.website',
        'user.avatarUrl',
        'user.emailNotifications',
        'user.darkMode',
        'user.isAdmin',
        'user.createdAt',
        'user.promptsGenerated'
      ])
      .where('user.id = :id', { id: req.user!.id })
      .getOne();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Make sure to include admin status from the request
    user.isAdmin = req.user?.isAdmin ?? false;

    // Remove password and return - TypeORM transformer will handle email decryption
    const userWithoutPassword = excludePassword(user);
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Get user profile by ID (public view - no email needed)
router.get('/byId/:userId', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.userId },
      select: ['id', 'username', 'bio', 'website', 'avatarUrl', 'createdAt', 'promptsGenerated'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return safe user data
    const safeUser = {
      id: user.id,
      username: user.username,
      bio: user.bio,
      website: user.website,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      promptsGenerated: user.promptsGenerated
    };

    res.json(safeUser);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Get user profile by username (public view - no email needed)
router.get('/:username', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { username: req.params.username },
      select: ['id', 'username', 'bio', 'website', 'avatarUrl', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(excludeSensitiveData(user));
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Get user by ID for internal use (no email needed)
router.get('/internal/:userId', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.userId },
      select: ['id', 'username', 'bio', 'website', 'avatarUrl', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(excludeSensitiveData(user));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.patch('/profile',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userRepository = AppDataSource.getRepository(User);

      // Handle file upload case
      if (req.file) {
        const avatarUrl = `/uploads/${req.file.filename}`;
        await userRepository.update(req.user!.id, { avatarUrl });
        return res.json({ avatarUrl });
      }

      // Validate request body
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }

      // Get current user
      const user = await userRepository.findOneBy({ id: req.user!.id });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updateData = { ...result.data };

      // Update user - TypeORM transformer will handle email encryption
      await userRepository.update(user.id, updateData);

      // Get updated user
      const updatedUser = await userRepository.findOneBy({ id: user.id });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found after update' });
      }

      res.json(excludePassword(updatedUser));
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  }
);

// Admin routes
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // First get the count
    const total = await userRepository.count();

    // Then get the users with their prompts count
    const users = await userRepository
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.promptsCount', 'user.prompts')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.bio',
        'user.website',
        'user.avatarUrl',
        'user.createdAt',
        'user.promptsGenerated',
        'user.isAdmin'
      ])
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Return users without sensitive information
    const usersWithoutPasswords = users.map((user: any) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      items: usersWithoutPasswords,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.get('/admin/metrics', adminAuth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const promptRepository = AppDataSource.getRepository(Prompt);
    const globalStatsRepository = AppDataSource.getRepository(GlobalStats);

    const [
      totalUsers,
      totalPrompts,
      recentUsers,
      recentPrompts,
      globalStats
    ] = await Promise.all([
      userRepository.count(),
      promptRepository.count(),
      userRepository.count({
        where: {
          createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      }),
      promptRepository.count({
        where: {
          createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      }),
      globalStatsRepository.findOne({
        where: {},
        order: { createdAt: 'DESC' }
      })
    ]);

    res.json({
      totalUsers,
      totalPrompts,
      recentUsers,
      recentPrompts,
      totalPromptsGenerated: globalStats?.totalPromptsGenerated || 0
    });
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    res.status(500).json({ message: 'Error fetching admin metrics' });
  }
});

// Upload image route
router.post(
  '/upload-image',
  auth,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Return the URL path that will be consistent with the frontend URL construction
      // Don't include /api prefix since that's added by the axios instance
      const url = `/uploads/avatars/${path.basename(req.file.path)}`;
      res.json({ url });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image' });
    }
  }
);

// Delete user (admin only)
router.delete('/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await userRepository.remove(user);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Toggle user admin status
router.patch('/admin/users/:id/toggle-admin', adminAuth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent toggling your own admin status
    if (user.id === req.user!.id) {
      return res.status(400).json({ message: 'Cannot modify your own admin status' });
    }

    user.isAdmin = !user.isAdmin;
    await userRepository.save(user);

    res.json({ message: 'Admin status updated successfully', isAdmin: user.isAdmin });
  } catch (err) {
    console.error('Error updating admin status:', err);
    res.status(500).json({ message: 'Error updating admin status' });
  }
});

// Get user's prompts
router.get('/:username/prompts', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { username: req.params.username },
      relations: ['prompts', 'prompts.author'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only return public prompts unless the user is requesting their own prompts
    const prompts = user.prompts.filter(
      prompt => prompt.isPublic || (req.user && req.user.id === user.id)
    );

    res.json(prompts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user prompts' });
  }
});

export default router;
