CREATE OR REPLACE TEMP TABLE normalized_sessions AS
SELECT
    CAST(session_key AS VARCHAR) AS session_key,
    any_value(merchant_key) AS merchant_key,
    CAST(any_value(category_id) AS VARCHAR) AS category_id,
    any_value(category_title) AS category_title,
    CAST(max(amount) AS BIGINT) AS amount_rial,
    min(created_at)::TIMESTAMP AS created_at,
    bool_or(try_status = 'Verified') AS is_verified,
    min(payer_card_key) FILTER (
        WHERE try_status = 'Verified' AND payer_card_key IS NOT NULL
    ) AS payer_card_key,
    min(psp_code) FILTER (
        WHERE try_status = 'Verified' AND psp_code IS NOT NULL
    ) AS psp_code
FROM raw_attempts
GROUP BY session_key;

CREATE OR REPLACE TEMP TABLE verified_card_sessions AS
SELECT
    session_key,
    merchant_key,
    category_id,
    category_title,
    amount_rial,
    created_at,
    payer_card_key,
    psp_code
FROM normalized_sessions
WHERE is_verified AND payer_card_key IS NOT NULL;

CREATE OR REPLACE TEMP TABLE card_first_seen AS
SELECT
    merchant_key,
    payer_card_key,
    min(created_at) AS first_seen_at
FROM verified_card_sessions
GROUP BY merchant_key, payer_card_key;
