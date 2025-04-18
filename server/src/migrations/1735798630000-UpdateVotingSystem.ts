import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateVotingSystem1735798630000 implements MigrationInterface {
    name = 'UpdateVotingSystem1735798630000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add totalVotes column to prompts table
        await queryRunner.query(`
            ALTER TABLE prompts
            ADD COLUMN IF NOT EXISTS "totalVotes" integer NOT NULL DEFAULT 0
        `);

        // Copy data from likes to totalVotes
        await queryRunner.query(`
            UPDATE prompts
            SET "totalVotes" = likes
        `);

        // Drop the likes column
        await queryRunner.query(`
            ALTER TABLE prompts
            DROP COLUMN IF EXISTS likes
        `);

        // Update prompt trigger to use totalVotes instead of likes
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_prompt_votes()
            RETURNS TRIGGER AS $$
            BEGIN
              IF (TG_OP = 'INSERT') THEN
                UPDATE prompts SET "totalVotes" = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = NEW."promptId")
                WHERE id = NEW."promptId";
              ELSIF (TG_OP = 'DELETE') THEN
                UPDATE prompts SET "totalVotes" = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = OLD."promptId")
                WHERE id = OLD."promptId";
              END IF;
              RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Drop old triggers if they exist
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS prompt_votes_trigger ON prompt_votes;
            DROP TRIGGER IF EXISTS update_total_votes ON prompt_votes;
        `);

        // Create new trigger
        await queryRunner.query(`
            CREATE TRIGGER prompt_votes_trigger
            AFTER INSERT OR DELETE ON prompt_votes
            FOR EACH ROW EXECUTE FUNCTION update_prompt_votes();
        `);

        // Update indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_prompts_ispublic_likes;
            CREATE INDEX IF NOT EXISTS "IDX_prompts_ispublic_totalvotes" ON prompts ("isPublic", "totalVotes" DESC);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add likes column back to prompts table
        await queryRunner.query(`
            ALTER TABLE prompts
            ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0
        `);

        // Copy data from totalVotes to likes
        await queryRunner.query(`
            UPDATE prompts
            SET likes = "totalVotes"
        `);

        // Drop the totalVotes column
        await queryRunner.query(`
            ALTER TABLE prompts
            DROP COLUMN IF EXISTS "totalVotes"
        `);

        // Restore original trigger function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_prompt_likes()
            RETURNS TRIGGER AS $$
            BEGIN
              IF (TG_OP = 'INSERT') THEN
                UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = NEW."promptId")
                WHERE id = NEW."promptId";
              ELSIF (TG_OP = 'DELETE') THEN
                UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = OLD."promptId")
                WHERE id = OLD."promptId";
              END IF;
              RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Drop new trigger
        await queryRunner.query(`DROP TRIGGER IF EXISTS prompt_votes_trigger ON prompt_votes;`);

        // Create original trigger
        await queryRunner.query(`
            CREATE TRIGGER prompt_votes_trigger
            AFTER INSERT OR DELETE ON prompt_votes
            FOR EACH ROW EXECUTE FUNCTION update_prompt_likes();
        `);

        // Update indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_prompts_ispublic_totalvotes";
            CREATE INDEX IF NOT EXISTS idx_prompts_ispublic_likes ON prompts ("isPublic", likes DESC);
        `);
    }
} 