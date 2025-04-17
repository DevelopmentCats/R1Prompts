import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoteTriggers1735748629000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First rename the columns in prompt_votes if they exist
        await queryRunner.query(`
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN prompt_id TO "promptId";
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN user_id TO "userId";
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN created_at TO "createdAt";
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN updated_at TO "updatedAt";
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;
            END $$;
        `);

        // Create function to calculate total votes (likes)
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION calculate_total_votes(prompt_id uuid)
            RETURNS integer AS $$
            DECLARE
                total integer;
            BEGIN
                SELECT COUNT(*)
                INTO total
                FROM prompt_votes
                WHERE "promptId" = prompt_id;
                
                RETURN total;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger function to update likes
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_prompt_total_votes()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
                    UPDATE prompts 
                    SET likes = calculate_total_votes(
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
        `);

        // Create trigger
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_total_votes ON prompt_votes;
            CREATE TRIGGER update_total_votes
            AFTER INSERT OR DELETE ON prompt_votes
            FOR EACH ROW
            EXECUTE FUNCTION update_prompt_total_votes();
        `);

        // Update all prompts with correct vote counts
        await queryRunner.query(`
            UPDATE prompts p
            SET likes = (
                SELECT COUNT(*)
                FROM prompt_votes pv
                WHERE pv."promptId" = p.id
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // First zero out all likes
        await queryRunner.query(`UPDATE prompts SET likes = 0;`);
        
        // Remove trigger
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_total_votes ON prompt_votes;`);
        
        // Remove functions
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_prompt_total_votes;`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_total_votes;`);

        // Revert column names if they were changed
        await queryRunner.query(`
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN "promptId" TO prompt_id;
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN "userId" TO user_id;
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN "createdAt" TO created_at;
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE prompt_votes 
                    RENAME COLUMN "updatedAt" TO updated_at;
                EXCEPTION
                    WHEN undefined_column THEN NULL;
                END;
            END $$;
        `);
    }
}
