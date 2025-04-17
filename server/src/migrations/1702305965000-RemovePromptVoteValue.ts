import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePromptVoteValue1702305965000 implements MigrationInterface {
    name = 'RemovePromptVoteValue1702305965000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First check if the value column exists
        const hasValueColumn = await queryRunner.hasColumn('prompt_votes', 'value');
        
        if (hasValueColumn) {
            // Drop the value column since we don't need it anymore
            await queryRunner.query(`
                ALTER TABLE prompt_votes DROP COLUMN value;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the value column with default value 1
        await queryRunner.query(`
            ALTER TABLE prompt_votes ADD COLUMN value integer NOT NULL DEFAULT 1;
        `);
    }
}
