import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePromptTotals1702305964000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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

        // Then ensure the totalCopies column exists
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

        // Create a function to calculate total copies
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION calculate_total_copies(prompt_id uuid)
            RETURNS integer AS $$
            DECLARE
                total integer;
            BEGIN
                SELECT 
                    COALESCE(
                        (SELECT COUNT(*) FROM prompt_copies WHERE "promptId" = prompt_id), 0
                    ) +
                    COALESCE(
                        (SELECT COUNT(*) FROM anonymous_prompt_copy WHERE "promptId" = prompt_id), 0
                    )
                INTO total;
                
                RETURN total;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Update all prompts with correct total copies
        await queryRunner.query(`
            UPDATE prompts p
            SET "totalCopies" = calculate_total_copies(p.id);
        `);

        // Set default value for totalCopies and ensure it's not null
        await queryRunner.query(`
            ALTER TABLE prompts 
            ALTER COLUMN "totalCopies" SET DEFAULT 0,
            ALTER COLUMN "totalCopies" SET NOT NULL;
        `);

        // Create trigger function to update totalCopies
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_prompt_total_copies()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
                    UPDATE prompts 
                    SET "totalCopies" = calculate_total_copies(
                        CASE 
                            WHEN TG_OP = 'INSERT' THEN NEW."promptId"
                            ELSE OLD."promptId"
                        END
                    )
                    WHERE id = CASE 
                        WHEN TG_OP = 'INSERT' THEN NEW."promptId"
                        ELSE OLD."promptId"
                    END;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS update_total_copies_prompt_copies ON prompt_copies;
            CREATE TRIGGER update_total_copies_prompt_copies
            AFTER INSERT OR DELETE ON prompt_copies
            FOR EACH ROW
            EXECUTE FUNCTION update_prompt_total_copies();

            DROP TRIGGER IF EXISTS update_total_copies_anon ON anonymous_prompt_copy;
            CREATE TRIGGER update_total_copies_anon
            AFTER INSERT OR DELETE ON anonymous_prompt_copy
            FOR EACH ROW
            EXECUTE FUNCTION update_prompt_total_copies();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers first
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_total_copies_prompt_copies ON prompt_copies;
            DROP TRIGGER IF EXISTS update_total_copies_anon ON anonymous_prompt_copy;
            DROP FUNCTION IF EXISTS update_prompt_total_copies;
            DROP FUNCTION IF EXISTS calculate_total_copies;
        `);

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
