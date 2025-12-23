-- 🎭 MULTI-ACCOUNT AUTHENTIC SYSTEM - DATABASE EXTENSIONS
-- Extends existing schema for authentic multi-account management

-- ============================================
-- ТАБЛИЦА: authentic_accounts
-- Stores real user accounts (Telegram & Instagram)
-- ============================================

CREATE TABLE IF NOT EXISTS authentic_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Account info
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'instagram', 'facebook')),
  account_name TEXT NOT NULL UNIQUE, -- 'eva', 'maria', etc.
  username TEXT, -- @username or phone
  display_name TEXT, -- Public display name
  
  -- Personality & behavior
  personality JSONB NOT NULL DEFAULT '{}', -- {age, city, interests, response_style, active_hours}
  
  -- Session & auth (encrypted)
  session_data TEXT, -- Encrypted session string
  api_credentials JSONB DEFAULT '{}', -- API keys if needed
  
  -- Activity tracking
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  daily_message_limit INT DEFAULT 50,
  messages_sent_today INT DEFAULT 0,
  last_activity TIMESTAMP,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Stats
  total_conversations INT DEFAULT 0,
  total_messages_sent INT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_authentic_accounts_platform ON authentic_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_authentic_accounts_active ON authentic_accounts(is_active, is_online);

-- ============================================
-- ТАБЛИЦА: message_queue
-- Manages outgoing messages with scheduling
-- ============================================

CREATE TABLE IF NOT EXISTS message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Routing
  account_id UUID REFERENCES authentic_accounts(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL,
  target_username TEXT,
  platform TEXT NOT NULL,
  
  -- Message data
  message_text TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}', -- attachments, formatting, etc.
  
  -- Priority & scheduling
  priority INT DEFAULT 0 CHECK (priority >= 0 AND priority <= 2), -- 0=normal, 1=high, 2=urgent
  scheduled_for TIMESTAMP DEFAULT NOW(),
  
  -- Human behavior simulation
  typing_duration_ms INT DEFAULT 0, -- How long to show typing
  delay_before_send_ms INT DEFAULT 0, -- Additional delay
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
  ),
  sent_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status, priority DESC, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_message_queue_account ON message_queue(account_id, status);

-- ============================================
-- ТАБЛИЦА: conversation_threads
-- Tracks all active conversations
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  account_id UUID REFERENCES authentic_accounts(id) ON DELETE CASCADE,
  user_platform_id TEXT NOT NULL,
  user_username TEXT,
  platform TEXT NOT NULL,
  
  -- Conversation state
  conversation_data JSONB DEFAULT '{}', -- Full conversation history
  stage TEXT DEFAULT 'initial' CHECK (
    stage IN ('initial', 'engaging', 'deepening', 'kyc_ready', 'kyc_sent', 'completed', 'inactive')
  ),
  
  -- User profile data extracted
  user_first_name TEXT,
  user_middle_name TEXT,
  user_last_name TEXT,
  user_interests TEXT[],
  user_data JSONB DEFAULT '{}',
  
  -- Engagement metrics
  message_count INT DEFAULT 0,
  last_user_message TEXT,
  last_bot_message TEXT,
  sentiment_score FLOAT DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  
  -- KYC tracking
  kyc_ready BOOLEAN DEFAULT FALSE,
  kyc_link_sent BOOLEAN DEFAULT FALSE,
  kyc_link_sent_at TIMESTAMP,
  kyc_completed BOOLEAN DEFAULT FALSE,
  kyc_completed_at TIMESTAMP,
  
  -- Activity
  last_message_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(account_id, user_platform_id, platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_threads_account ON conversation_threads(account_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_stage ON conversation_threads(stage, is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_kyc ON conversation_threads(kyc_ready, kyc_link_sent);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_active ON conversation_threads(is_active, last_message_at DESC);

-- ============================================
-- ТАБЛИЦА: message_logs
-- Detailed log of all messages (incoming & outgoing)
-- ============================================

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
  account_id UUID REFERENCES authentic_accounts(id),
  
  -- Message details
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  platform TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}',
  
  -- AI analysis (for outgoing)
  ai_model_used TEXT,
  generation_time_ms INT,
  response_strategy TEXT,
  
  -- Sentiment (for incoming)
  sentiment_label TEXT,
  sentiment_score FLOAT,
  extracted_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_thread ON message_logs(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_account ON message_logs(account_id, created_at DESC);

-- ============================================
-- ТАБЛИЦА: bardeen_webhooks
-- Logs incoming webhooks from Bardeen
-- ============================================

CREATE TABLE IF NOT EXISTS bardeen_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Webhook data
  webhook_type TEXT NOT NULL, -- 'instagram_dm', 'telegram_message', 'profile_enrichment'
  platform TEXT,
  payload JSONB NOT NULL,
  
  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMP,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bardeen_webhooks_status ON bardeen_webhooks(status, created_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_authentic_accounts_updated_at
    BEFORE UPDATE ON authentic_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_queue_updated_at
    BEFORE UPDATE ON message_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_threads_updated_at
    BEFORE UPDATE ON conversation_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Reset daily message count at midnight
CREATE OR REPLACE FUNCTION reset_daily_message_counts()
RETURNS void AS $$
BEGIN
  UPDATE authentic_accounts
  SET 
    messages_sent_today = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to get next message from queue
CREATE OR REPLACE FUNCTION get_next_queued_message(p_account_id UUID DEFAULT NULL)
RETURNS TABLE (
  message_id UUID,
  account_id UUID,
  target_user_id TEXT,
  message_text TEXT,
  priority INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mq.id,
    mq.account_id,
    mq.target_user_id,
    mq.message_text,
    mq.priority
  FROM message_queue mq
  WHERE mq.status = 'pending'
    AND mq.scheduled_for <= NOW()
    AND (p_account_id IS NULL OR mq.account_id = p_account_id)
  ORDER BY mq.priority DESC, mq.scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function to check account availability
CREATE OR REPLACE FUNCTION get_available_account(p_platform TEXT)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id
  FROM authentic_accounts
  WHERE platform = p_platform
    AND is_active = TRUE
    AND messages_sent_today < daily_message_limit
  ORDER BY messages_sent_today ASC, last_activity ASC NULLS FIRST
  LIMIT 1;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE authentic_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bardeen_webhooks ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access authentic_accounts" ON authentic_accounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access message_queue" ON message_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access conversation_threads" ON conversation_threads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access message_logs" ON message_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access bardeen_webhooks" ON bardeen_webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VIEWS FOR DASHBOARD
-- ============================================

-- Active conversations view
CREATE OR REPLACE VIEW active_conversations AS
SELECT 
  ct.id,
  ct.account_id,
  aa.account_name,
  aa.platform,
  ct.user_platform_id,
  ct.user_username,
  ct.user_first_name,
  ct.stage,
  ct.message_count,
  ct.last_user_message,
  ct.sentiment_score,
  ct.engagement_score,
  ct.kyc_ready,
  ct.kyc_link_sent,
  ct.last_message_at,
  EXTRACT(EPOCH FROM (NOW() - ct.last_message_at)) / 60 AS minutes_since_last_message
FROM conversation_threads ct
JOIN authentic_accounts aa ON ct.account_id = aa.id
WHERE ct.is_active = TRUE
ORDER BY ct.last_message_at DESC;

-- Account statistics view
CREATE OR REPLACE VIEW account_statistics AS
SELECT 
  aa.id,
  aa.account_name,
  aa.platform,
  aa.is_active,
  aa.is_online,
  aa.messages_sent_today,
  aa.daily_message_limit,
  aa.total_conversations,
  aa.total_messages_sent,
  aa.conversion_rate,
  COUNT(DISTINCT ct.id) AS active_conversations,
  COUNT(DISTINCT CASE WHEN ct.kyc_ready = TRUE THEN ct.id END) AS kyc_ready_count,
  COUNT(DISTINCT CASE WHEN ct.kyc_completed = TRUE THEN ct.id END) AS kyc_completed_count
FROM authentic_accounts aa
LEFT JOIN conversation_threads ct ON ct.account_id = aa.id AND ct.is_active = TRUE
GROUP BY aa.id;

-- Wallester eligible owners view (extends existing)
CREATE OR REPLACE VIEW wallester_eligible_owners_extended AS
SELECT 
  vo.*,
  COUNT(DISTINCT ct.id) AS active_conversations,
  MAX(ct.last_message_at) AS last_conversation_at
FROM verified_owners vo
LEFT JOIN conversation_threads ct ON 
  (ct.user_first_name = vo.first_name AND ct.user_middle_name = vo.middle_name)
WHERE vo.is_eligible_for_wallester = TRUE
GROUP BY vo.id
ORDER BY vo.total_revenue DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE authentic_accounts IS 'Real user accounts for Telegram & Instagram - no bots!';
COMMENT ON TABLE message_queue IS 'Scheduled message queue with human-like delays';
COMMENT ON TABLE conversation_threads IS 'Active conversation tracking with full context';
COMMENT ON TABLE message_logs IS 'Complete message history for all conversations';
COMMENT ON TABLE bardeen_webhooks IS 'Incoming webhooks from Bardeen automation';
