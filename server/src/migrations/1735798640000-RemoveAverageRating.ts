import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAverageRating1735798640000 implements MigrationInterface {
    name = 'RemoveAverageRating1735798640000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove averageRating column which is no longer needed
        await queryRunner.query(`
            ALTER TABLE prompts
            DROP COLUMN IF EXISTS "averageRating"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back averageRating column if needed for rollback
        await queryRunner.query(`
            ALTER TABLE prompts 
            ADD COLUMN IF NOT EXISTS "averageRating" numeric NOT NULL DEFAULT 0
        `);
    }
} 