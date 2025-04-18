import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Prompt } from '../entities/Prompt';
import { PromptVote } from '../entities/PromptVote';
import { auth } from '../middleware/auth';

const router = Router();

// Check if user has voted for a prompt
router.get('/:promptId/vote', auth, async (req, res) => {
    const { promptId } = req.params;
    const userId = req.user!.id;

    try {
        const voteRepository = AppDataSource.getRepository(PromptVote);
        
        // Check if vote exists
        const vote = await voteRepository.findOne({
            where: { promptId, userId }
        });

        return res.json({ voted: !!vote });
    } catch (error) {
        console.error('Error checking vote status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Vote for a prompt
router.post('/:promptId/vote', auth, async (req, res) => {
    const { promptId } = req.params;
    const userId = req.user!.id; // We can use ! here because auth middleware ensures user exists

    try {
        const promptRepository = AppDataSource.getRepository(Prompt);
        const voteRepository = AppDataSource.getRepository(PromptVote);

        // Check if prompt exists
        const prompt = await promptRepository.findOne({ 
            where: { id: promptId }
        });
        
        if (!prompt) {
            return res.status(404).json({ message: 'Prompt not found' });
        }

        // Check if user has already voted
        const existingVote = await voteRepository.findOne({
            where: { promptId, userId }
        });

        if (existingVote) {
            // Remove vote if it exists
            await voteRepository.remove(existingVote);
            
            // Get accurate vote count
            const voteCount = await voteRepository.count({
                where: { promptId }
            });
            
            // Update prompt with accurate count
            await promptRepository.update(promptId, { totalVotes: voteCount });
            
            return res.json({ voted: false, totalVotes: voteCount });
        } else {
            // Add new vote
            const vote = voteRepository.create({
                promptId,
                userId
            });
            await voteRepository.save(vote);
            
            // Get accurate vote count
            const voteCount = await voteRepository.count({
                where: { promptId }
            });
            
            // Update prompt with accurate count
            await promptRepository.update(promptId, { totalVotes: voteCount });
            
            return res.json({ voted: true, totalVotes: voteCount });
        }
    } catch (error) {
        console.error('Error in vote endpoint:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
