import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTotalVotes1702413600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop totalVotes column if it exists - we don't need to update likes anymore
        // since it was already set correctly in the previous migration
        await queryRunner.query(`
            ALTER TABLE prompts 
            DROP COLUMN IF EXISTS "totalVotes";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add totalVotes column back and restore its value from likes
        await queryRunner.query(`
            ALTER TABLE prompts 
            ADD COLUMN IF NOT EXISTS "totalVotes" integer DEFAULT 0;

            UPDATE prompts
            SET "totalVotes" = likes;
        `);
    }
}
