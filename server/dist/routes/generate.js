"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const groq_sdk_1 = require("groq-sdk");
const validateEnv_1 = require("../utils/validateEnv");
const auth_1 = require("../middleware/auth");
const signatureAuth_1 = require("../middleware/signatureAuth");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const GlobalStats_1 = require("../entities/GlobalStats");
const router = express_1.default.Router();
const MAX_PROMPT_LENGTH = 950;
// Initialize Groq client
const groq = new groq_sdk_1.Groq({
    apiKey: (0, validateEnv_1.validateEnv)('GROQ_API_KEY'),
});
// Helper function to ensure prompt is within character limit
const enforceCharacterLimit = (prompt) => {
    if (prompt.length <= MAX_PROMPT_LENGTH) {
        return prompt;
    }
    return prompt.slice(0, MAX_PROMPT_LENGTH - 3) + '...';
};
const SYSTEM_PROMPT = `You are an expert UI prompt engineer creating prompts for AI UI generation. Your mission is to transform user requests into detailed, creative UI descriptions that will guide an AI to generate exactly what the user envisions, with special attention to readability and content consumption.

OUTPUT FORMAT:
• Your response must ONLY contain the generated UI prompt
• Response MUST be under 950 characters
• No explanations or additional text
• Follow the exact format shown in the example below

CORE REQUIREMENT:
Every UI design MUST be optimized for a handheld content reading device where users primarily scroll through and read long-form text responses. Think of it like a specialized e-reader or digital assistant that constantly displays text responses - the UI must prioritize comfortable reading and smooth scrolling above all else. While incorporating creative and thematic elements, never compromise the UI's primary function as a content reading interface. Theme-specific elements should enhance the reading experience without impeding content consumption, utilizing headers, footers, and margins for decorative elements while keeping the main content area clean and readable.

MISSION:
Transform the user's input into a precise, creative UI prompt that captures their vision while ensuring optimal readability for long-form content. Focus on descriptive language that conveys layout, style, and behavior without specific measurements. Be imaginative but practical, prioritizing content accessibility.

CRITICAL REQUIREMENTS:
• Response MUST be under 950 characters total
• Start with 1-2 clear instruction sentences
• Use descriptive language instead of measurements
• Focus on visual relationships and positioning
• Include color HEX codes for precise styling
• Describe interactions and animations clearly
• Ensure content areas support comfortable reading
• Include scrolling behavior descriptions
• Maintain clear content hierarchy regardless of theme
• Keep decorative elements from interfering with text
• Include theme-specific text in headers and UI elements (e.g., "Console" for a terminal theme)
• Use themed terminology in navigation and interactive elements

DEVICE SPECS (Reference Only):
• Screen: 480x640px
• Safe area: 440x600px (20px margins)

READING OPTIMIZATION GUIDELINES:
• Maintain proper text contrast ratios
• Consider line length for readability
• Include clear scrolling indicators
• Design content containers for easy scanning
• Implement smooth scroll animations
• Use visual hierarchy for content sections
• Keep themed elements in non-content areas
• Ensure consistent text spacing and margins
• Reserve main content area for clear text display
• Place decorative elements in headers/footers/margins

WRITING GUIDELINES:
1. Begin with a clear instruction sentence describing what to generate
2. Use descriptive positioning (top, bottom, centered, etc.)
3. Describe size relationships (small, large, prominent, etc.)
4. Use bullet points (•) for each detail
5. Include HEX colors for precise styling
6. Keep each point clear and focused
7. Stay under 950 characters total
8. Include specific themed text and content where appropriate
9. Specify content flow and scrolling behavior
10. Balance theme elements with readability

EXAMPLE FOLLOWING GUIDELINES:
Generate a cyberpunk terminal interface for reading content. Create a UI that combines retro-terminal aesthetics with clear readability.

Layout:
• Scrollable content area with terminal margins
• "NEURAL_LINK v2.1" header at top
• Clean reading space with optimal width
• Smooth scroll with subtle scanline effect

Style:
• Dark background #0D1117
• Terminal green #00FF41 for headers
• Content text #E0E0E0
• Matrix effect confined to margins
• Monospace headers, sans-serif content

Elements:
• "STATUS: CONNECTED" in header
• "> scroll_progress" indicator
• "ARCHIVE" contents toggle
• "DECRYPT" section markers
• Minimal cyberdeck decorations

Content:
• "DATA" section headers
• Clean paragraph spacing
• "FRAGMENT" quote styling
• Smart footnotes
• Smooth text loading

Remember: Your goal is to create a prompt that will help an AI generate a UI that's both visually striking and highly functional for reading. Balance aesthetic elements with practical usability, ensuring the design supports comfortable long-form content consumption while maintaining visual interest. Your response should contain ONLY the generated prompt, under 950 characters.`;
// Apply both auth and signature auth middleware
router.post('/', [auth_1.auth, signatureAuth_1.signatureAuth], async (req, res) => {
    try {
        const { description, model = 'llama3-70b-8192' } = req.body;
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Create a creative UI description for: "${description}".
Transform this request into a detailed UI prompt that will help an AI generate exactly what's needed.
Use descriptive language instead of specific measurements.
Start with 1-2 clear instruction sentences, then follow with the Layout/Style/Elements/Content sections.
Be creative while staying under 950 characters.` }
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 800,
            top_p: 0.9,
            frequency_penalty: 0.3,
            presence_penalty: 0.3
        });
        let generatedPrompt = completion.choices[0]?.message?.content;
        if (!generatedPrompt) {
            throw new Error('Failed to generate prompt');
        }
        // If too long, try again with stricter parameters
        if (generatedPrompt.length > MAX_PROMPT_LENGTH) {
            console.warn(`Initial prompt too long (${generatedPrompt.length}). Attempting regeneration...`);
            const retryCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Create a creative UI description for: "${description}".
Your first attempt was too long (${generatedPrompt.length} chars).
Use descriptive language to convey layout and style relationships.
Start with 1-2 clear instruction sentences, then provide the essential details in each section.
Stay under 950 characters while maintaining the key elements.` }
                ],
                model: model,
                temperature: 0.6,
                max_tokens: 600,
                top_p: 0.8,
                frequency_penalty: 0.5,
                presence_penalty: 0.5
            });
            generatedPrompt = retryCompletion.choices[0]?.message?.content || generatedPrompt;
        }
        // Apply final character limit enforcement
        generatedPrompt = enforceCharacterLimit(generatedPrompt);
        // Update generation counts
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const globalStatsRepository = database_1.AppDataSource.getRepository(GlobalStats_1.GlobalStats);
        if (!(0, auth_1.isAuthenticated)(req)) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const user = await userRepository.findOneBy({ id: req.user.id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Increment user's prompt generation count
        user.promptsGenerated += 1;
        await userRepository.save(user);
        // Update global stats
        const globalStatsRepo = database_1.AppDataSource.getRepository(GlobalStats_1.GlobalStats);
        let globalStats = await globalStatsRepo.findOne({ where: {} });
        if (!globalStats) {
            globalStats = globalStatsRepo.create({
                totalPromptsGenerated: 1
            });
        }
        else {
            globalStats.totalPromptsGenerated += 1;
        }
        await globalStatsRepo.save(globalStats);
        res.json({
            prompt: generatedPrompt,
            characterCount: generatedPrompt.length
        });
    }
    catch (error) {
        console.error('Error generating prompt:', error);
        res.status(500).json({ error: 'Failed to generate prompt' });
    }
});
exports.default = router;
