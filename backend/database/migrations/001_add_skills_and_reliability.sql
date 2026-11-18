BEGIN;

-- Student skill selections
CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    CONSTRAINT user_skills_pkey
        PRIMARY KEY (user_id, skill_name),
    CONSTRAINT fk_user_skills_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Reliability event history
CREATE TABLE IF NOT EXISTS helper_events (
    id BIGSERIAL PRIMARY KEY,
    helper_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    offer_id UUID,
    event_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT helper_events_event_type_check
        CHECK (event_type IN (
            'OFFER_SENT',
            'ACCEPTED',
            'PASSED',
            'TIMED_OUT',
            'COMPLETED',
            'REDISPATCHED',
            'CANCELLED',
            'DEACTIVATED'
        ))
);

CREATE INDEX IF NOT EXISTS idx_helper_events_created
    ON helper_events(created_at);

CREATE INDEX IF NOT EXISTS idx_helper_events_helper
    ON helper_events(helper_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_helper_events_offer_type
    ON helper_events(offer_id, event_type)
    WHERE offer_id IS NOT NULL;

COMMIT;
