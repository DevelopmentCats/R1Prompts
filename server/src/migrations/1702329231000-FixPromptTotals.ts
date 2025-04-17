import { MigrationInterface, QueryRunner } from "typeorm";

export class FixPromptTotals1702329231000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update totalCopies count for ALL prompts by adding both regular and anonymous copies
        await queryRunner.query(`
            UPDATE prompts p
            SET "totalCopies" = COALESCE((
                SELECT COUNT(*) FROM prompt_copies pc WHERE pc."promptId" = p.id
            ), 0) + COALESCE((
                SELECT COUNT(*) FROM anonymous_prompt_copy apc WHERE apc."promptId" = p.id
            ), 0);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need for down migration as this is just fixing counts
    }
}
