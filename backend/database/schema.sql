-- now we will create our users table to make sure evertyhing is well

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    people_helped INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_courses (
    user_id INTEGER NOT NULL,
    course_code VARCHAR(20) NOT NULL,

    PRIMARY KEY (user_id, course_code),

    CONSTRAINT fk_user_courses_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);



-- ==========================================
-- HELPER EVENT LOGGING
-- Stores permanent interaction history
-- for future reliability scoring
-- ==========================================

CREATE TABLE IF NOT EXISTS helper_events (
    id BIGSERIAL PRIMARY KEY,

    helper_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    post_id TEXT NOT NULL,

    offer_id UUID,

    event_type VARCHAR(30) NOT NULL
        CHECK (event_type IN (
            'OFFER_SENT',
            'ACCEPTED',
            'PASSED',
            'TIMED_OUT',
            'COMPLETED',
            'REDISPATCHED',
            'CANCELLED',
            'DEACTIVATED'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of a helper's event history
CREATE INDEX IF NOT EXISTS idx_helper_events_helper
ON helper_events(helper_id);

-- Fast lookup of events by date
CREATE INDEX IF NOT EXISTS idx_helper_events_created
ON helper_events(created_at);

-- Prevent duplicate events for the same offer
CREATE UNIQUE INDEX IF NOT EXISTS idx_helper_events_offer_type
ON helper_events(offer_id, event_type)
WHERE offer_id IS NOT NULL;

-- ==========================================
-- USER SKILLS FOR SKILL-BASED MATCHING
-- ==========================================

CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER NOT NULL,
    skill_name VARCHAR(100) NOT NULL,

    PRIMARY KEY (user_id, skill_name),

    CONSTRAINT fk_user_skills_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

DELETE FROM users;


