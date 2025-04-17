-- Compare vote counts between prompt.likes and actual votes
SELECT 
    p.id as prompt_id,
    p.likes as stored_likes,
    COUNT(pv.prompt_id) as actual_votes,
    CASE 
        WHEN p.likes != COUNT(pv.prompt_id) THEN 'MISMATCH'
        ELSE 'OK'
    END as status
FROM prompt p
LEFT JOIN prompt_votes pv ON p.id = pv.prompt_id
GROUP BY p.id, p.likes
HAVING p.likes != COUNT(pv.prompt_id)
ORDER BY ABS(p.likes - COUNT(pv.prompt_id)) DESC;

-- Check for duplicate votes (shouldn't exist)
SELECT 
    prompt_id, 
    user_id,
    COUNT(*) as vote_count
FROM prompt_votes
GROUP BY prompt_id, user_id
HAVING COUNT(*) > 1;

-- Compare with backup data (run this against backup)
SELECT 
    prompt_id,
    COUNT(*) as vote_count
FROM prompt_votes
GROUP BY prompt_id
ORDER BY vote_count DESC;
