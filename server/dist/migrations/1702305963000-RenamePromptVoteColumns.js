"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenamePromptVoteColumns1702305963000 = void 0;
class RenamePromptVoteColumns1702305963000 {
    async up(queryRunner) {
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
        // Copy data from old table to new table, excluding any rows with null values
        await queryRunner.query(`
            INSERT INTO "prompt_votes_new" ("id", "promptId", "userId", "createdAt", "updatedAt", "value")
            SELECT 
                COALESCE(id, uuid_generate_v4()),
                prompt_id::uuid,
                user_id::uuid,
                COALESCE(created_at, now()),
                COALESCE(created_at, now()),
                COALESCE(value, 1)
            FROM prompt_votes
            WHERE prompt_id IS NOT NULL 
            AND user_id IS NOT NULL 
            AND prompt_id IN (SELECT id FROM prompts)
            AND user_id IN (SELECT id FROM users);
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
        // Update the likes count WITHOUT deleting anything
        await queryRunner.query(`
            UPDATE prompts p
            SET likes = p."totalVotes"
            WHERE p."totalVotes" IS NOT NULL;
        `);
    }
    async down(queryRunner) {
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
exports.RenamePromptVoteColumns1702305963000 = RenamePromptVoteColumns1702305963000;
