"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const Prompt_1 = require("../entities/Prompt");
const PromptVote_1 = require("../entities/PromptVote");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Check if user has voted for a prompt
router.get('/:promptId/vote', auth_1.auth, async (req, res) => {
    const { promptId } = req.params;
    const userId = req.user.id;
    try {
        const voteRepository = database_1.AppDataSource.getRepository(PromptVote_1.PromptVote);
        // Check if vote exists
        const vote = await voteRepository.findOne({
            where: { promptId, userId }
        });
        return res.json({ voted: !!vote });
    }
    catch (error) {
        console.error('Error checking vote status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// Vote for a prompt
router.post('/:promptId/vote', auth_1.auth, async (req, res) => {
    const { promptId } = req.params;
    const userId = req.user.id; // We can use ! here because auth middleware ensures user exists
    try {
        const promptRepository = database_1.AppDataSource.getRepository(Prompt_1.Prompt);
        const voteRepository = database_1.AppDataSource.getRepository(PromptVote_1.PromptVote);
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
            await promptRepository.update(promptId, { likes: voteCount });
            return res.json({ voted: false, likes: voteCount });
        }
        else {
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
            await promptRepository.update(promptId, { likes: voteCount });
            return res.json({ voted: true, likes: voteCount });
        }
    }
    catch (error) {
        console.error('Error in vote endpoint:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
