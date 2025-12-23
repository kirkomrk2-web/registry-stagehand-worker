-- 🤖 EVA AI SYSTEM - DATABASE SCHEMA
-- Система за интелигентно ангажиране и KYC верификация

-- ============================================
-- ТАБЛИЦА: eva_users
-- Съхранява потребители от всички канали
-- ============================================

CREATE TABLE IF NOT EXISTS eva_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Канал информация
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'telegram', 'facebook')),
  platform_user_id TEXT NOT NULL,
  username TEXT,
  
  -- Лични данни
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  names_collected_at TIMESTAMP,
  
  -- Профил данни
  profile_data JSONB DEFAULT '{}', -- interests, behavior, sentiment history
  sentiment_score FLOAT DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  
  -- KYC статус
  kyc_link_sent BOOLEAN DEFAULT FALSE,
  kyc_link_sent_at TIMESTAMP,
  kyc_link_url TEXT,
  kyc_completed BOOLEAN DEFAULT FALSE,
  kyc_completed_at TIMESTAMP,
  
  -- Interaction tracking
  total_messages INT DEFAULT 0,
  last_message_text TEXT,
  conversation_stage TEXT DEFAULT 'initial' CHECK (
    conversation_stage IN ('initial', 'engaging', 'deepening', 'kyc_ready', 'kyc_sent', 'completed')
  ),
  
  -- Timestamps
  first_contact_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint per platform
  UNIQUE(platform, platform_user_id)
);

-- Индекси за бърза заявка
CREATE INDEX IF NOT EXISTS idx_eva_users_platform ON eva_users(platform);
CREATE INDEX IF NOT EXISTS idx_eva_users_platform_user_id ON eva_users(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_eva_users_kyc_status ON eva_users(kyc_completed, kyc_link_sent);
CREATE INDEX IF NOT EXISTS idx_eva_users_last_interaction ON eva_users(last_interaction_at DESC);

-- ============================================
-- ТАБЛИЦА: eva_conversations
-- Съхранява цялата история на разговорите
-- ============================================

CREATE TABLE IF NOT EXISTS eva_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES eva_users(id) ON DELETE CASCADE,
  
  -- Съобщение данни
  message_direction TEXT NOT NULL CHECK (message_direction IN ('incoming', 'outgoing')),
  message_text TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}', -- platform-specific data
  
  -- AI анализ
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'very_positive', 'very_negative')),
  sentiment_score FLOAT,
  detected_interests TEXT[], -- array of interests found
  extracted_data JSONB DEFAULT '{}', -- names, dates, locations, etc.
  
  -- Eva response info (за outgoing messages)
  response_strategy TEXT, -- 'engaging', 'boundary_setting', 'name_extraction', 'kyc_pitch', etc.
  ai_model_used TEXT, -- 'gpt-4', 'claude-3', etc.
  generation_time_ms INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_eva_conversations_user_id ON eva_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_eva_conversations_created_at ON eva_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eva_conversations_sentiment ON eva_conversations(sentiment);

-- ============================================
-- ТАБЛИЦА: eva_analytics
-- Метрики и аналитика по потребител
-- ============================================

CREATE TABLE IF NOT EXISTS eva_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES eva_users(id) ON DELETE CASCADE,
  
  -- Метрики за разговора
  total_messages INT DEFAULT 0,
  eva_messages INT DEFAULT 0,
  user_messages INT DEFAULT 0,
  avg_response_time_seconds INT,
  conversation_duration_minutes INT,
  
  -- Engagement метрики
  engagement_score FLOAT DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  avg_message_length INT,
  questions_asked INT DEFAULT 0,
  emojis_used INT DEFAULT 0,
  
  -- Milestone събития
  names_collected BOOLEAN DEFAULT FALSE,
  names_collected_at TIMESTAMP,
  kyc_link_clicked BOOLEAN DEFAULT FALSE,
  kyc_link_clicked_at TIMESTAMP,
  kyc_completed BOOLEAN DEFAULT FALSE,
  kyc_completed_at TIMESTAMP,
  
  -- Behavior tracking
  boundary_violations INT DEFAULT 0,
  positive_interactions INT DEFAULT 0,
  negative_interactions INT DEFAULT 0,
  
  -- Conversion funnel
  stage_initial_duration_min INT,
  stage_engaging_duration_min INT,
  stage_deepening_duration_min INT,
  stage_kyc_duration_min INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_eva_analytics_engagement ON eva_analytics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_eva_analytics_conversion ON eva_analytics(kyc_completed);

-- ============================================
-- ТАБЛИЦА: eva_boundary_events
-- Проследяване на неуместни опити
-- ============================================

CREATE TABLE IF NOT EXISTS eva_boundary_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES eva_users(id) ON DELETE CASCADE,
  
  -- Event данни
  event_type TEXT NOT NULL CHECK (
    event_type IN ('sexual_content', 'aggression', 'threat', 'harassment', 'spam', 'other')
  ),
  message_text TEXT NOT NULL,
  eva_response TEXT,
  action_taken TEXT CHECK (
    action_taken IN ('warning', 'ignored', 'blocked', 'reported')
  ),
  
  -- Context
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_detected BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_eva_boundary_user ON eva_boundary_events(user_id);
CREATE INDEX IF NOT EXISTS idx_eva_boundary_type ON eva_boundary_events(event_type);
CREATE INDEX IF NOT EXISTS idx_eva_boundary_severity ON eva_boundary_events(severity);

-- ============================================
-- ТАБЛИЦА: eva_system_logs
-- System-level логове и грешки
-- ============================================

CREATE TABLE IF NOT EXISTS eva_system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Log данни
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  component TEXT NOT NULL, -- 'router', 'eva_engine', 'analyzer', etc.
  message TEXT NOT NULL,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Context
  user_id UUID REFERENCES eva_users(id) ON DELETE SET NULL,
  platform TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_eva_logs_level ON eva_system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_eva_logs_component ON eva_system_logs(component);
CREATE INDEX IF NOT EXISTS idx_eva_logs_created ON eva_system_logs(created_at DESC);

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE eva_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eva_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE eva_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE eva_boundary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eva_system_logs ENABLE ROW LEVEL SECURITY;

-- Service role има пълен достъп
CREATE POLICY "Service role full access to eva_users" ON eva_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to eva_conversations" ON eva_conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to eva_analytics" ON eva_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to eva_boundary_events" ON eva_boundary_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to eva_system_logs" ON eva_system_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ФУНКЦИИ И TRIGGERS
-- ============================================

-- Функция за update на updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers за updated_at
CREATE TRIGGER update_eva_users_updated_at
    BEFORE UPDATE ON eva_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eva_analytics_updated_at
    BEFORE UPDATE ON eva_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция за автоматично създаване на analytics record при нов user
CREATE OR REPLACE FUNCTION create_eva_analytics_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO eva_analytics (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger за автоматично създаване на analytics
CREATE TRIGGER trigger_create_eva_analytics
    AFTER INSERT ON eva_users
    FOR EACH ROW
    EXECUTE FUNCTION create_eva_analytics_for_new_user();

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Функция за получаване на пълен user profile
CREATE OR REPLACE FUNCTION get_eva_user_profile(user_platform TEXT, user_platform_id TEXT)
RETURNS TABLE (
  user_data JSONB,
  recent_conversations JSONB,
  analytics_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(u.*) as user_data,
    (
      SELECT jsonb_agg(to_jsonb(c.*))
      FROM (
        SELECT * FROM eva_conversations
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 20
      ) c
    ) as recent_conversations,
    to_jsonb(a.*) as analytics_data
  FROM eva_users u
  LEFT JOIN eva_analytics a ON a.user_id = u.id
  WHERE u.platform = user_platform
    AND u.platform_user_id = user_platform_id;
END;
$$ LANGUAGE plpgsql;

-- Функция за update на conversation stage
CREATE OR REPLACE FUNCTION update_eva_conversation_stage(
  user_uuid UUID,
  new_stage TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE eva_users
  SET 
    conversation_stage = new_stage,
    last_interaction_at = NOW(),
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Функция за sentiment tracking
CREATE OR REPLACE FUNCTION track_eva_sentiment(
  user_uuid UUID,
  new_sentiment_score FLOAT
)
RETURNS VOID AS $$
BEGIN
  UPDATE eva_users
  SET 
    sentiment_score = (sentiment_score * 0.7 + new_sentiment_score * 0.3), -- weighted average
    last_interaction_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View за dashboard metrics
CREATE OR REPLACE VIEW eva_dashboard_metrics AS
SELECT
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.first_name IS NOT NULL 
    AND u.middle_name IS NOT NULL 
    AND u.last_name IS NOT NULL THEN u.id END) as users_with_full_names,
  COUNT(DISTINCT CASE WHEN u.kyc_link_sent THEN u.id END) as users_kyc_sent,
  COUNT(DISTINCT CASE WHEN u.kyc_completed THEN u.id END) as users_kyc_completed,
  AVG(a.engagement_score) as avg_engagement_score,
  AVG(a.conversation_duration_minutes) as avg_conversation_duration,
  SUM(a.boundary_violations) as total_boundary_violations,
  COUNT(DISTINCT CASE WHEN u.last_interaction_at > NOW() - INTERVAL '24 hours' 
    THEN u.id END) as active_users_24h
FROM eva_users u
LEFT JOIN eva_analytics a ON a.user_id = u.id;

-- View за conversion funnel
CREATE OR REPLACE VIEW eva_conversion_funnel AS
SELECT
  u.conversation_stage,
  COUNT(*) as user_count,
  AVG(a.engagement_score) as avg_engagement,
  AVG(EXTRACT(EPOCH FROM (NOW() - u.first_contact_at))/60) as avg_time_in_funnel_minutes
FROM eva_users u
LEFT JOIN eva_analytics a ON a.user_id = u.id
GROUP BY u.conversation_stage
ORDER BY 
  CASE u.conversation_stage
    WHEN 'initial' THEN 1
    WHEN 'engaging' THEN 2
    WHEN 'deepening' THEN 3
    WHEN 'kyc_ready' THEN 4
    WHEN 'kyc_sent' THEN 5
    WHEN 'completed' THEN 6
  END;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE eva_users IS 'Потребители от всички канали (Instagram, Telegram, Facebook)';
COMMENT ON TABLE eva_conversations IS 'Пълна история на всички разговори';
COMMENT ON TABLE eva_analytics IS 'Метрики и аналитика по потребител';
COMMENT ON TABLE eva_boundary_events IS 'Неуместни опити и нарушения на границите';
COMMENT ON TABLE eva_system_logs IS 'System-level логове за debugging';

COMMENT ON COLUMN eva_users.sentiment_score IS 'Weighted average sentiment: -1 (много негативен) до 1 (много позитивен)';
COMMENT ON COLUMN eva_users.conversation_stage IS 'Текущ етап в conversation funnel';
COMMENT ON COLUMN eva_analytics.engagement_score IS 'Общ engagement score: 0-100';
