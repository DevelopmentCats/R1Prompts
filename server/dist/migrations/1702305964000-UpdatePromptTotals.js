"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePromptTotals1702305964000 = void 0;
class UpdatePromptTotals1702305964000 {
    async up(queryRunner) {
        // First, create the anonymous_prompt_copy table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "anonymous_prompt_copy" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "promptId" uuid NOT NULL,
                "ipHash" character varying NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_anonymous_prompt_copy" PRIMARY KEY ("id"),
                CONSTRAINT "FK_anonymous_prompt_copy_prompt" FOREIGN KEY ("promptId") REFERENCES prompts(id) ON DELETE CASCADE
            );
        `);
        // Then ensure the totalCopies column exists and preserve existing values
        await queryRunner.query(`
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE prompts 
                    ADD COLUMN IF NOT EXISTS "totalCopies" integer;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
            END $$;
        `);
        // Update totalCopies count
        await queryRunner.query(`
            UPDATE prompts p
            SET "totalCopies" = COALESCE(
                p."totalCopies",
                (SELECT COUNT(*) FROM anonymous_prompt_copy apc WHERE apc."promptId" = p.id)
            );
        `);
        // Set default value for totalCopies
        await queryRunner.query(`
            ALTER TABLE prompts 
            ALTER COLUMN "totalCopies" SET DEFAULT 0;
        `);
    }
    async down(queryRunner) {
        // Remove the column if needed
        await queryRunner.query(`
            ALTER TABLE prompts 
            DROP COLUMN IF EXISTS "totalCopies";
        `);
        // Drop the anonymous_prompt_copy table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "anonymous_prompt_copy";
        `);
    }
}
exports.UpdatePromptTotals1702305964000 = UpdatePromptTotals1702305964000;
