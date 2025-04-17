"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveTotalVotes1702413600000 = void 0;
class RemoveTotalVotes1702413600000 {
    async up(queryRunner) {
        // Ensure likes column exists with proper default
        await queryRunner.query(`
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE prompts 
                    ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
            END $$;
        `);
        // Update likes to reflect actual vote counts
        await queryRunner.query(`
            UPDATE prompts p
            SET likes = (
                SELECT COUNT(DISTINCT "userId")
                FROM prompt_votes pv
                WHERE pv."promptId" = p.id
            );
        `);
        // Drop totalVotes column if it exists
        await queryRunner.query(`
            ALTER TABLE prompts 
            DROP COLUMN IF EXISTS "totalVotes";
        `);
    }
    async down(queryRunner) {
        // Add totalVotes column back
        await queryRunner.query(`
            ALTER TABLE prompts 
            ADD COLUMN IF NOT EXISTS "totalVotes" integer DEFAULT 0;
        `);
    }
}
exports.RemoveTotalVotes1702413600000 = RemoveTotalVotes1702413600000;
