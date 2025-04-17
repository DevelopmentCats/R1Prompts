import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAnonymousCopy1702330171000 implements MigrationInterface {
    name = 'UpdateAnonymousCopy1702330171000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the TTL index and expiresAt column
        await queryRunner.query(`
            ALTER TABLE anonymous_prompt_copy 
            DROP COLUMN IF EXISTS "expiresAt"
        `);

        // Add unique constraint to prevent duplicate copies from same IP
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_anonymous_prompt_copy_unique" 
            ON anonymous_prompt_copy ("promptId", "ipHash")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove unique constraint
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_anonymous_prompt_copy_unique"
        `);

        // Add back expiresAt column with TTL index
        await queryRunner.query(`
            ALTER TABLE anonymous_prompt_copy 
            ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP 
            DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_anonymous_prompt_copy_expires" 
            ON anonymous_prompt_copy ("expiresAt")
        `);
    }
}
