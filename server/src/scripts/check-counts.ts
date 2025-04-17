import { AppDataSource } from "../config/database";
import { Prompt } from "../entities/Prompt";
import { PromptVote } from "../entities/PromptVote";
import { PromptCopy } from "../entities/PromptCopy";
import { AnonymousPromptCopy } from "../entities/AnonymousPromptCopy";

async function main() {
  try {
    await AppDataSource.initialize();
    
    console.log("\n=== ANALYZING ALL PROMPTS ===");
    
    // Get all prompts
    const prompts = await AppDataSource
      .getRepository(Prompt)
      .createQueryBuilder("prompt")
      .getMany();
        
    console.log(`Found ${prompts.length} prompts to analyze\n`);
    
    for (const prompt of prompts) {
      console.log(`\n--- Analyzing Prompt: ${prompt.title} (${prompt.id}) ---`);
        
      // Get actual counts
      const voteCount = await AppDataSource
        .getRepository(PromptVote)
        .createQueryBuilder("vote")
        .where("vote.promptId = :promptId", { promptId: prompt.id })
        .getCount();
            
      const regularCopyCount = await AppDataSource
        .getRepository(PromptCopy)
        .createQueryBuilder("copy")
        .where("copy.promptId = :promptId", { promptId: prompt.id })
        .getCount();
            
      const anonCopyCount = await AppDataSource
        .getRepository(AnonymousPromptCopy)
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
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch(console.error);
