-- Script to synchronize prompt.likes with the actual count of votes in prompt_votes table
-- This fixes inconsistencies between the likes count and actual votes

-- First, check if there are any discrepancies
SELECT 
    p.id,
    p.title,
    p.likes AS current_likes,
    COUNT(pv.id) AS actual_votes,
    p.likes - COUNT(pv.id) AS difference
FROM 
    prompts p
LEFT JOIN 
    prompt_votes pv ON p.id = pv."promptId"
GROUP BY 
    p.id, p.title, p.likes
HAVING 
    p.likes != COUNT(pv.id)
ORDER BY 
    ABS(p.likes - COUNT(pv.id)) DESC;

-- Then update all prompts with the correct vote count
UPDATE 
    prompts p
SET 
    likes = (SELECT COUNT(*) FROM prompt_votes pv WHERE pv."promptId" = p.id);

-- Create a trigger to keep counts in sync in the future
CREATE OR REPLACE FUNCTION update_prompt_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = NEW."promptId")
    WHERE id = NEW."promptId";
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE prompts SET likes = (SELECT COUNT(*) FROM prompt_votes WHERE "promptId" = OLD."promptId")
    WHERE id = OLD."promptId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Check if trigger already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prompt_votes_trigger') THEN
    CREATE TRIGGER prompt_votes_trigger
    AFTER INSERT OR DELETE ON prompt_votes
    FOR EACH ROW EXECUTE FUNCTION update_prompt_likes();
  END IF;
END
$$; 