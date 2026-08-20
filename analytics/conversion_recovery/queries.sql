CREATE OR REPLACE TEMP VIEW conversion_recovery_sessions AS
WITH stage_flags AS (
    SELECT
        session_key,
        bool_or(try_status IN ('InBank', 'Paid', 'Verified')) AS entered_bank
    FROM raw_attempts
    GROUP BY session_key
)
SELECT
    sessions.*,
    stage_flags.entered_bank,
    sessions.attempt_count > 0
        AND sessions.first_try_status != 'Verified' AS first_try_non_verified
FROM normalized_sessions AS sessions
INNER JOIN stage_flags USING (session_key);
