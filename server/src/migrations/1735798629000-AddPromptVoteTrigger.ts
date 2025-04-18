import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromptVoteTrigger1735798629000 implements MigrationInterface {
    name = 'AddPromptVoteTrigger1735798629000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, fix any existing inconsistencies
        await queryRunner.query(`
            UPDATE prompts p
            SET likes = (SELECT COUNT(*) FROM prompt_votes pv WHERE pv.\"promptId\" = p.id)
        `);

        // Create the trigger function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_prompt_likes()
            RETURNS TRIGGER AS $$
            BEGIN
              IF (TG_OP = 'INSERT') THEN
                UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE \"promptId\" = NEW.\"promptId\")
                WHERE id = NEW.\"promptId\";
              ELSIF (TG_OP = 'DELETE') THEN
                UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE \"promptId\" = OLD.\"promptId\")
                WHERE id = OLD.\"promptId\";
              END IF;
              RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create the trigger
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS prompt_votes_trigger ON prompt_votes;
            CREATE TRIGGER prompt_votes_trigger
            AFTER INSERT OR DELETE ON prompt_votes
            FOR EACH ROW EXECUTE FUNCTION update_prompt_likes();
        `);

        // Add index on likes for better performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_prompts_ispublic_likes ON prompts (\"isPublic\", likes DESC);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the trigger
        await queryRunner.query(`DROP TRIGGER IF EXISTS prompt_votes_trigger ON prompt_votes;`);
        
        // Remove the function
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_prompt_likes;`);
        
        // Remove the index
        await queryRunner.query(`DROP INDEX IF EXISTS idx_prompts_ispublic_likes;`);
    }
} 