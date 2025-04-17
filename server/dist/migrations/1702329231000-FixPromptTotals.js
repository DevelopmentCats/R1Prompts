"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixPromptTotals1702329231000 = void 0;
class FixPromptTotals1702329231000 {
    async up(queryRunner) {
        // Update total copies - combine regular and anonymous copies
        await queryRunner.query(`
            UPDATE prompts p
            SET "totalCopies" = (
                SELECT COALESCE(regular_copies, 0) + COALESCE(anon_copies, 0)
                FROM (
                    SELECT 
                        (SELECT COUNT(*) FROM prompt_copies pc WHERE pc."promptId" = p.id) as regular_copies,
                        (SELECT COUNT(*) FROM anonymous_prompt_copy apc WHERE apc."promptId" = p.id) as anon_copies
                ) counts
            );
        `);
    }
    async down(queryRunner) {
        // No need for down migration as this is just fixing counts
    }
}
exports.FixPromptTotals1702329231000 = FixPromptTotals1702329231000;
