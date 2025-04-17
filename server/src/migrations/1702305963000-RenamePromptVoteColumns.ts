import { MigrationInterface, QueryRunner } from "typeorm";

export class RenamePromptVoteColumns1702305963000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, create a temporary table with the new schema
        await queryRunner.query(`
            CREATE TABLE "prompt_votes_new" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "promptId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "value" integer NOT NULL DEFAULT 1
            );
        `);

        // Copy data from old table to new table, with better error handling
        await queryRunner.query(`
            INSERT INTO "prompt_votes_new" ("id", "promptId", "userId", "createdAt", "updatedAt", "value")
            SELECT 
                COALESCE(id, uuid_generate_v4()),
                COALESCE(prompt_id::uuid, uuid_generate_v4()),
                COALESCE(user_id::uuid, uuid_generate_v4()),
                COALESCE(created_at, now()),
                COALESCE(updated_at, now()),
                COALESCE(value, 1)
            FROM prompt_votes;
        `);

        // Log any rows with NULL values for investigation
        await queryRunner.query(`
            SELECT prompt_id, user_id, created_at, updated_at, value 
            FROM prompt_votes 
            WHERE prompt_id IS NULL OR user_id IS NULL;
        `);

        // Update likes to match totalVotes from prompts table
        await queryRunner.query(`
            UPDATE prompts
            SET likes = "totalVotes"
            WHERE "totalVotes" IS NOT NULL;
        `);

        // Drop the old table
        await queryRunner.query(`DROP TABLE "prompt_votes";`);

        // Rename the new table to the original name
        await queryRunner.query(`ALTER TABLE "prompt_votes_new" RENAME TO "prompt_votes";`);

        // Add primary key
        await queryRunner.query(`
            ALTER TABLE "prompt_votes" 
            ADD CONSTRAINT "PK_prompt_votes" PRIMARY KEY ("id");
        `);

        // Add foreign key constraints WITH NO CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "prompt_votes"
            ADD CONSTRAINT "FK_prompt_votes_prompt"
            FOREIGN KEY ("promptId")
            REFERENCES "prompts" ("id");
        `);

        await queryRunner.query(`
            ALTER TABLE "prompt_votes"
            ADD CONSTRAINT "FK_prompt_votes_user"
            FOREIGN KEY ("userId")
            REFERENCES "users" ("id");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "prompt_votes"
            DROP CONSTRAINT IF EXISTS "FK_prompt_votes_prompt",
            DROP CONSTRAINT IF EXISTS "FK_prompt_votes_user";
        `);

        // Create a temporary table with the old schema
        await queryRunner.query(`
            CREATE TABLE "prompt_votes_old" (
                "id" uuid,
                "prompt_id" uuid,
                "user_id" uuid,
                "created_at" TIMESTAMP,
                "updated_at" TIMESTAMP
            );
        `);

        // Copy data back
        await queryRunner.query(`
            INSERT INTO "prompt_votes_old" ("id", "prompt_id", "user_id", "created_at", "updated_at")
            SELECT id, "promptId", "userId", "createdAt", "updatedAt"
            FROM prompt_votes;
        `);

        // Drop the new table
        await queryRunner.query(`DROP TABLE "prompt_votes";`);

        // Rename old table back
        await queryRunner.query(`ALTER TABLE "prompt_votes_old" RENAME TO "prompt_votes";`);
    }
}
