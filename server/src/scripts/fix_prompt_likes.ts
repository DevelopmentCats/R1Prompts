import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import { AppDataSource } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function fixPromptLikes() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    // Load the SQL script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'fix_prompt_likes.sql'),
      'utf8'
    );

    // Split the script into separate statements
    const statements = sqlScript
      .split(';')
      .filter(stmt => stmt.trim().length > 0);

    // First, run the query to find discrepancies
    console.log('Checking for discrepancies in likes counts...');
    const discrepanciesQuery = statements[0];
    const discrepancies = await AppDataSource.query(discrepanciesQuery);

    if (discrepancies.length === 0) {
      console.log('No discrepancies found in likes counts.');
    } else {
      console.log(`Found ${discrepancies.length} prompts with incorrect likes counts:`);
      discrepancies.forEach(d => {
        console.log(`- Prompt "${d.title}" (${d.id}): current=${d.current_likes}, actual=${d.actual_votes}, diff=${d.difference}`);
      });
    }

    // Update all prompts with correct vote counts
    console.log('\nUpdating all prompts with correct vote counts...');
    const updateQuery = statements[1];
    const updateResult = await AppDataSource.query(updateQuery);
    console.log('Update completed.');

    // Create the trigger function
    console.log('\nCreating or replacing trigger function...');
    const triggerFunctionQuery = statements[2];
    await AppDataSource.query(triggerFunctionQuery);
    console.log('Trigger function created.');

    // Create the trigger if it doesn't exist
    console.log('\nEnsuring trigger exists...');
    const createTriggerQuery = statements[3];
    await AppDataSource.query(createTriggerQuery);
    console.log('Trigger setup completed.');

    // Verify the fix
    console.log('\nVerifying the fix...');
    const verifyQuery = statements[0];
    const verifyResult = await AppDataSource.query(verifyQuery);
    
    if (verifyResult.length === 0) {
      console.log('✅ All prompts now have correct likes counts!');
    } else {
      console.log(`⚠️ There are still ${verifyResult.length} prompts with incorrect likes counts. Manual intervention may be needed.`);
    }

    console.log('\nScript execution completed successfully.');
  } catch (error) {
    console.error('Error running the script:', error);
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the function
fixPromptLikes().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 