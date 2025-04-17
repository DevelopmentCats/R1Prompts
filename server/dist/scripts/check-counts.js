"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Prompt_1 = require("../entities/Prompt");
const PromptVote_1 = require("../entities/PromptVote");
const PromptCopy_1 = require("../entities/PromptCopy");
const AnonymousPromptCopy_1 = require("../entities/AnonymousPromptCopy");
async function main() {
    try {
        await database_1.AppDataSource.initialize();
        console.log("\n=== ANALYZING ALL PROMPTS ===");
        // Get all prompts
        const prompts = await database_1.AppDataSource
            .getRepository(Prompt_1.Prompt)
            .createQueryBuilder("prompt")
            .getMany();
        console.log(`Found ${prompts.length} prompts to analyze\n`);
        for (const prompt of prompts) {
            console.log(`\n--- Analyzing Prompt: ${prompt.title} (${prompt.id}) ---`);
            // Get actual counts
            const voteCount = await database_1.AppDataSource
                .getRepository(PromptVote_1.PromptVote)
                .createQueryBuilder("vote")
                .where("vote.promptId = :promptId", { promptId: prompt.id })
                .getCount();
            const regularCopyCount = await database_1.AppDataSource
                .getRepository(PromptCopy_1.PromptCopy)
                .createQueryBuilder("copy")
                .where("copy.promptId = :promptId", { promptId: prompt.id })
                .getCount();
            const anonCopyCount = await database_1.AppDataSource
                .getRepository(AnonymousPromptCopy_1.AnonymousPromptCopy)
                .createQueryBuilder("copy")
                .where("copy.promptId = :promptId", { promptId: prompt.id })
                .getCount();
            const totalCopies = regularCopyCount + anonCopyCount;
            // Calculate discrepancies
            const likeDiff = prompt.likes - voteCount;
            const copyDiff = prompt.totalCopies - totalCopies;
            console.log(`Stored values:
  Total Likes: ${prompt.likes}
  Total Copies: ${prompt.totalCopies}
            
Actual counts:
  Likes: ${voteCount}
  Regular Copies: ${regularCopyCount}
  Anonymous Copies: ${anonCopyCount}
  Total Copies: ${totalCopies}
            
Differences:
  Like difference: ${likeDiff}
  Copy difference: ${copyDiff}`);
            if (likeDiff !== 0) {
                console.log(`
Prompt ${prompt.id} has incorrect vote count:
  Actual Votes: ${voteCount}
  Total Likes: ${prompt.likes}`);
            }
        }
    }
    catch (error) {
        console.error("Error:", error);
    }
    finally {
        await database_1.AppDataSource.destroy();
    }
}
main().catch(console.error);
