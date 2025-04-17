import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromptVoteUnique1735223655158 implements MigrationInterface {
    name = 'AddPromptVoteUnique1735223655158'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_220213d926c47141bfb4083cef" ON "prompt_votes" ("promptId", "userId") `);
        await queryRunner.query(`ALTER TABLE "prompt_votes" ADD CONSTRAINT "UQ_220213d926c47141bfb4083cef4" UNIQUE ("promptId", "userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompt_votes" DROP CONSTRAINT "UQ_220213d926c47141bfb4083cef4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_220213d926c47141bfb4083cef"`);
    }

}
