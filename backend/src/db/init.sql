-- ============================================================
-- ProTrack Auto - Full Schema (Idempotent - safe to run multiple times)
-- All statements use IF NOT EXISTS so no data is ever destroyed
-- ============================================================

-- Create ENUM types (IF NOT EXISTS supported in PostgreSQL 9.5+)
CREATE TYPE IF NOT EXISTS user_role    AS ENUM ('STUDENT', 'GUIDE', 'COORDINATOR', 'COMMITTEE');
CREATE TYPE IF NOT EXISTS group_status AS ENUM ('FORMING', 'WAITING_ALLOCATION', 'ACTIVE');
CREATE TYPE IF NOT EXISTS log_status   AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION');
CREATE TYPE IF NOT EXISTS review_phase AS ENUM ('REVIEW_1', 'REVIEW_2', 'REVIEW_3', 'FINAL');
CREATE TYPE IF NOT EXISTS task_status  AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- Core user table
CREATE TABLE IF NOT EXISTS users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    student_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    prn_no     VARCHAR(50) UNIQUE NOT NULL,
    roll_no    VARCHAR(50) NOT NULL,
    batch_year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_whitelist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prn_no     VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty_whitelist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    full_name   VARCHAR(255) NOT NULL,
    role        user_role NOT NULL,
    is_claimed  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty_profiles (
    faculty_id       UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    expertise_tags   TEXT[] NOT NULL DEFAULT '{}',
    max_workload     INT DEFAULT 4,
    current_workload INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_groups (
    group_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name        VARCHAR(255) UNIQUE NOT NULL,
    guide_id          UUID REFERENCES faculty_profiles(faculty_id) ON DELETE SET NULL,
    preferred_guide_id UUID REFERENCES faculty_profiles(faculty_id) ON DELETE SET NULL,
    status            group_status DEFAULT 'FORMING',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id   UUID REFERENCES project_groups(group_id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_profiles(student_id) ON DELETE CASCADE,
    is_leader  BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, student_id)
);

CREATE TABLE IF NOT EXISTS project_proposals (
    proposal_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id         UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    abstract         TEXT,
    objectives       TEXT,
    domain_tags      TEXT[] NOT NULL DEFAULT '{}',
    technology_stack TEXT[] DEFAULT '{}',
    priority         INT DEFAULT 1 CHECK (priority IN (1, 2, 3)),
    status           VARCHAR(20) DEFAULT 'PENDING',
    approval_stage   VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason TEXT,
    is_approved      BOOLEAN DEFAULT FALSE,
    plagiarism_score INT DEFAULT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, priority)
);

CREATE TABLE IF NOT EXISTS logbooks (
    log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    week_number  INT NOT NULL,
    work_summary TEXT NOT NULL,
    evidence_url VARCHAR(500),
    guide_status log_status DEFAULT 'PENDING',
    guide_remarks TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
    eval_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    phase        review_phase NOT NULL,
    rubric_scores JSONB NOT NULL,
    total_marks  NUMERIC(5, 2) NOT NULL,
    evaluator_id UUID REFERENCES users(user_id),
    is_locked    BOOLEAN DEFAULT FALSE,
    locked_by    UUID REFERENCES users(user_id),
    locked_at    TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, phase)
);

CREATE TABLE IF NOT EXISTS presentation_schedules (
    schedule_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id          UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    phase             review_phase NOT NULL,
    presentation_time TIMESTAMP NOT NULL,
    venue             VARCHAR(255) NOT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, phase)
);

CREATE TABLE IF NOT EXISTS group_tasks (
    task_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    status      task_status DEFAULT 'TODO',
    assigned_to UUID REFERENCES student_profiles(student_id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS peer_evaluations (
    eval_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES student_profiles(student_id) ON DELETE CASCADE,
    evaluatee_id UUID NOT NULL REFERENCES student_profiles(student_id) ON DELETE CASCADE,
    score        INT NOT NULL CHECK (score >= 1 AND score <= 5),
    comments     TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evaluator_id, evaluatee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_prn          ON student_profiles(prn_no);
CREATE INDEX IF NOT EXISTS idx_students_roll         ON student_profiles(roll_no);
CREATE INDEX IF NOT EXISTS idx_groups_guide          ON project_groups(guide_id);
CREATE INDEX IF NOT EXISTS idx_members_student       ON group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_members_group         ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_proposals_group       ON project_proposals(group_id);
CREATE INDEX IF NOT EXISTS idx_logbooks_group        ON logbooks(group_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_group     ON evaluations(group_id);
CREATE INDEX IF NOT EXISTS idx_schedules_group       ON presentation_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_group           ON group_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_peereval_group        ON peer_evaluations(group_id);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE INDEX IF NOT EXISTS idx_faculty_whitelist_email ON faculty_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_faculty_whitelist_role  ON faculty_whitelist(role);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id          UUID REFERENCES project_groups(group_id) ON DELETE CASCADE,
    sender_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content           TEXT NOT NULL,
    is_announcement   BOOLEAN DEFAULT FALSE,
    is_committee_only BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_group        ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_announcement ON chat_messages(is_announcement);

CREATE TABLE IF NOT EXISTS group_resources (
    resource_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID REFERENCES project_groups(group_id) ON DELETE CASCADE,
    title         VARCHAR(100) NOT NULL,
    url           VARCHAR(500),
    uploaded_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resource_type VARCHAR(20) DEFAULT 'LINK',
    description   TEXT,
    category      VARCHAR(50) DEFAULT 'General',
    file_path     VARCHAR(255),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resources_group ON group_resources(group_id);

CREATE TABLE IF NOT EXISTS student_notes (
    note_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(student_id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id);

CREATE TABLE IF NOT EXISTS rubric_templates (
    template_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) UNIQUE NOT NULL,
    schema       JSONB NOT NULL,
    target_phase review_phase NOT NULL DEFAULT 'FINAL',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_milestones (
    milestone_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_year     INT NOT NULL,
    milestone_key  VARCHAR(50) NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,
    due_date       TIMESTAMP NOT NULL,
    is_completed   BOOLEAN DEFAULT FALSE,
    created_by     UUID REFERENCES users(user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_year, milestone_key)
);
CREATE INDEX IF NOT EXISTS idx_batch_milestones_batch ON batch_milestones(batch_year);
CREATE INDEX IF NOT EXISTS idx_batch_milestones_key   ON batch_milestones(milestone_key);
CREATE INDEX IF NOT EXISTS idx_batch_milestones_date  ON batch_milestones(due_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_group_priority ON project_proposals(group_id, priority);

CREATE TABLE IF NOT EXISTS topic_approvals (
    approval_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id      UUID NOT NULL REFERENCES project_proposals(proposal_id) ON DELETE CASCADE,
    stage            VARCHAR(30) NOT NULL,
    decision         VARCHAR(20) NOT NULL,
    decided_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
    comments         TEXT,
    rejection_reason TEXT,
    plagiarism_score INT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_topic_approvals_proposal ON topic_approvals(proposal_id);
CREATE INDEX IF NOT EXISTS idx_topic_approvals_stage    ON topic_approvals(stage);
CREATE INDEX IF NOT EXISTS idx_topic_approvals_by       ON topic_approvals(decided_by);
CREATE INDEX IF NOT EXISTS idx_proposals_group_stage    ON project_proposals(group_id, approval_stage);

-- preferred_guide_id already exists in project_groups CREATE TABLE above
-- ALTER TABLE kept for safety with IF NOT EXISTS
ALTER TABLE project_groups
    ADD COLUMN IF NOT EXISTS preferred_guide_id UUID REFERENCES faculty_profiles(faculty_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS guide_ratings (
    rating_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id      UUID NOT NULL REFERENCES faculty_profiles(faculty_id) ON DELETE CASCADE,
    rated_by      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating        NUMERIC(3,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments      TEXT,
    academic_year VARCHAR(10) NOT NULL DEFAULT '2024',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guide_id, rated_by, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_guide_ratings_guide ON guide_ratings(guide_id);

CREATE TABLE IF NOT EXISTS allocation_audit (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    guide_id        UUID REFERENCES faculty_profiles(faculty_id) ON DELETE SET NULL,
    action          VARCHAR(30) NOT NULL,
    performed_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
    score_breakdown JSONB,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_allocation_audit_group  ON allocation_audit(group_id);
CREATE INDEX IF NOT EXISTS idx_allocation_audit_guide  ON allocation_audit(guide_id);
CREATE INDEX IF NOT EXISTS idx_allocation_audit_action ON allocation_audit(action);

CREATE TABLE IF NOT EXISTS global_settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
    milestone_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_year    INT NOT NULL,
    code          VARCHAR(10) NOT NULL,
    label         VARCHAR(100) NOT NULL,
    description   TEXT,
    deadline      DATE NOT NULL,
    reminder_days INT NOT NULL DEFAULT 7,
    sort_order    INT NOT NULL DEFAULT 1,
    created_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_year, code)
);
CREATE INDEX IF NOT EXISTS idx_milestones_batch    ON milestones(batch_year);
CREATE INDEX IF NOT EXISTS idx_milestones_deadline ON milestones(deadline);

CREATE TABLE IF NOT EXISTS group_milestone_status (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(milestone_id) ON DELETE CASCADE,
    group_id     UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    approved_at  TIMESTAMP,
    approved_by  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    notes        TEXT,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (milestone_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_gms_milestone ON group_milestone_status(milestone_id);
CREATE INDEX IF NOT EXISTS idx_gms_group     ON group_milestone_status(group_id);
CREATE INDEX IF NOT EXISTS idx_gms_status    ON group_milestone_status(status);

CREATE TABLE IF NOT EXISTS milestone_reminder_log (
    log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id  UUID NOT NULL REFERENCES milestones(milestone_id) ON DELETE CASCADE,
    group_id      UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    reminder_type VARCHAR(30) NOT NULL DEFAULT 'DEADLINE_APPROACHING',
    sent_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (milestone_id, group_id, reminder_type)
);

INSERT INTO global_settings (key, value) VALUES
    ('current_batch_year', '2024'),
    ('milestone_reminder_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS group_meetings (
    meeting_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    notes        TEXT,
    attendance   JSONB DEFAULT '[]'::jsonb,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_group_meetings_group ON group_meetings(group_id);

CREATE TABLE IF NOT EXISTS group_signoffs (
    signoff_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID NOT NULL REFERENCES project_groups(group_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    status        VARCHAR(20) DEFAULT 'PENDING',
    comments      TEXT,
    signed_by     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    signed_at     TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, document_type)
);
CREATE INDEX IF NOT EXISTS idx_group_signoffs_group ON group_signoffs(group_id);

CREATE TABLE IF NOT EXISTS notification_reads (
    user_id    UUID REFERENCES users(user_id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    read_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);
