"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemovePromptVoteValue1702305965000 = void 0;
class RemovePromptVoteValue1702305965000 {
    name = 'RemovePromptVoteValue1702305965000';
    async up(queryRunner) {
        // First check if the value column exists
        const hasValueColumn = await queryRunner.hasColumn('prompt_votes', 'value');
        if (hasValueColumn) {
            // Drop the value column since we don't need it anymore
            await queryRunner.query(`
                ALTER TABLE prompt_votes DROP COLUMN value;
            `);
        }
    }
    async down(queryRunner) {
        // Add back the value column with default value 1
        await queryRunner.query(`
            ALTER TABLE prompt_votes ADD COLUMN value integer NOT NULL DEFAULT 1;
        `);
    }
}
exports.RemovePromptVoteValue1702305965000 = RemovePromptVoteValue1702305965000;
