-- Multiplayer Democratic Voting System for Group Audiobook Experiences
-- Enables multiple users to vote democratically on story choices in real-time

-- Multiplayer Sessions Table
CREATE TABLE multiplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiobook_id UUID REFERENCES audiobooks(id),
  host_user_id UUID REFERENCES profiles(id),
  session_code VARCHAR(10) UNIQUE, -- Short code for easy joining (e.g., "ABCD12")
  max_players INTEGER DEFAULT 8,
  current_players INTEGER DEFAULT 1,
  session_status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, paused, completed
  current_audiobook_id UUID REFERENCES audiobooks(id),
  voting_enabled BOOLEAN DEFAULT true,
  vote_timeout_seconds INTEGER DEFAULT 60,
  majority_threshold DECIMAL(3,2) DEFAULT 0.5, -- 50% for majority
  allow_vote_changes BOOLEAN DEFAULT true,
  anonymous_voting BOOLEAN DEFAULT false,
  voice_chat_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Participants Table
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  character_sheet_id UUID REFERENCES character_sheets(id),
  participant_role VARCHAR(20) DEFAULT 'player', -- host, player, spectator
  vote_weight DECIMAL(3,2) DEFAULT 1.0, -- Base voting weight
  character_influence DECIMAL(3,2) DEFAULT 0.0, -- Additional weight from character
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_vote_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN DEFAULT true,
  connection_quality VARCHAR(20) DEFAULT 'good', -- excellent, good, poor, disconnected
  UNIQUE(session_id, user_id)
);

-- Choice Votes Table
CREATE TABLE choice_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  voting_round_id UUID, -- References voting_rounds when implemented
  audiobook_id UUID REFERENCES audiobooks(id),
  choice_id UUID REFERENCES audio_choices(id),
  participant_id UUID REFERENCES session_participants(id),
  vote_weight DECIMAL(3,2) DEFAULT 1.0, -- Final calculated weight
  character_bonus DECIMAL(3,2) DEFAULT 0.0, -- Bonus from character traits
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_vote BOOLEAN DEFAULT false, -- Track if this was a vote change
  UNIQUE(session_id, participant_id, voting_round_id)
);

-- Voting Rounds Table
CREATE TABLE voting_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES audiobooks(id),
  round_number INTEGER, -- Sequential round number in session
  round_status VARCHAR(20) DEFAULT 'active', -- active, completed, timed_out, cancelled
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  time_limit_seconds INTEGER,
  winning_choice_id UUID REFERENCES audio_choices(id),
  total_votes INTEGER DEFAULT 0,
  total_vote_weight DECIMAL(5,2) DEFAULT 0.0,
  majority_achieved BOOLEAN DEFAULT false,
  tie_broken_by VARCHAR(50), -- 'host', 'random', 'highest_level', null
  consensus_level DECIMAL(3,2), -- 0-1, how unanimous the vote was
  UNIQUE(session_id, round_number)
);

-- Session Messages/Chat
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id),
  message_type VARCHAR(20) DEFAULT 'chat', -- chat, system, vote, reaction
  message_text TEXT,
  emoji VARCHAR(10), -- For reaction messages
  is_private BOOLEAN DEFAULT false,
  recipient_id UUID REFERENCES session_participants(id), -- For private messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Analytics
CREATE TABLE session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id),
  total_votes_cast INTEGER DEFAULT 0,
  votes_changed INTEGER DEFAULT 0,
  average_response_time_seconds DECIMAL(5,2),
  participation_rate DECIMAL(3,2), -- 0-1
  influence_score DECIMAL(3,2), -- How much their votes swayed outcomes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_multiplayer_sessions_code ON multiplayer_sessions(session_code);
CREATE INDEX idx_multiplayer_sessions_host ON multiplayer_sessions(host_user_id);
CREATE INDEX idx_multiplayer_sessions_status ON multiplayer_sessions(session_status);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_choice_votes_session ON choice_votes(session_id);
CREATE INDEX idx_choice_votes_round ON choice_votes(voting_round_id);
CREATE INDEX idx_voting_rounds_session ON voting_rounds(session_id);
CREATE INDEX idx_session_messages_session ON session_messages(session_id);

-- Row Level Security
ALTER TABLE multiplayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE choice_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for multiplayer_sessions
CREATE POLICY "Users can view sessions they participate in" ON multiplayer_sessions
  FOR SELECT USING (
    auth.uid() = host_user_id OR
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Users can create their own sessions" ON multiplayer_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions" ON multiplayer_sessions
  FOR UPDATE USING (auth.uid() = host_user_id);

-- Policies for session_participants
CREATE POLICY "Users can manage their own participation" ON session_participants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Session hosts can view all participants" ON session_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multiplayer_sessions ms WHERE ms.id = session_id AND ms.host_user_id = auth.uid())
  );

-- Policies for choice_votes
CREATE POLICY "Participants can manage their own votes" ON choice_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.id = participant_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Session participants can view all votes" ON choice_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session_id AND sp.user_id = auth.uid())
  );

-- Policies for voting_rounds
CREATE POLICY "Session participants can view voting rounds" ON voting_rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session_id AND sp.user_id = auth.uid())
  );

-- Policies for session_messages
CREATE POLICY "Session participants can view messages" ON session_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Participants can send messages" ON session_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session_id AND sp.id = participant_id AND sp.user_id = auth.uid())
  );

-- Functions for session management

-- Generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code VARCHAR(10);
  v_exists BOOLEAN := true;
BEGIN
  WHILE v_exists LOOP
    -- Generate 6-character alphanumeric code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM multiplayer_sessions WHERE session_code = v_code) INTO v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Create new multiplayer session
CREATE OR REPLACE FUNCTION create_multiplayer_session(
  p_host_user_id UUID,
  p_audiobook_id UUID,
  p_max_players INTEGER DEFAULT 8,
  p_vote_timeout_seconds INTEGER DEFAULT 60,
  p_majority_threshold DECIMAL(3,2) DEFAULT 0.5
)
RETURNS TABLE (
  session_id UUID,
  session_code VARCHAR(10)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_session_code VARCHAR(10);
BEGIN
  v_session_code := generate_session_code();

  INSERT INTO multiplayer_sessions (
    host_user_id,
    audiobook_id,
    current_audiobook_id,
    session_code,
    max_players,
    vote_timeout_seconds,
    majority_threshold
  ) VALUES (
    p_host_user_id,
    p_audiobook_id,
    p_audiobook_id,
    v_session_code,
    p_max_players,
    p_vote_timeout_seconds,
    p_majority_threshold
  )
  RETURNING id INTO v_session_id;

  -- Add host as first participant
  INSERT INTO session_participants (
    session_id,
    user_id,
    participant_role
  ) VALUES (
    v_session_id,
    p_host_user_id,
    'host'
  );

  RETURN QUERY SELECT v_session_id, v_session_code;
END;
$$;

-- Join multiplayer session
CREATE OR REPLACE FUNCTION join_multiplayer_session(
  p_session_code VARCHAR(10),
  p_user_id UUID,
  p_character_sheet_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_participant_id UUID;
  v_current_players INTEGER;
  v_max_players INTEGER;
BEGIN
  -- Find session
  SELECT id, current_players, max_players INTO v_session_id, v_current_players, v_max_players
  FROM multiplayer_sessions
  WHERE session_code = p_session_code AND session_status = 'waiting';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not accepting new players';
  END IF;

  IF v_current_players >= v_max_players THEN
    RAISE EXCEPTION 'Session is full';
  END IF;

  -- Check if user is already in session
  IF EXISTS (SELECT 1 FROM session_participants WHERE session_id = v_session_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'User is already in this session';
  END IF;

  -- Add participant
  INSERT INTO session_participants (
    session_id,
    user_id,
    character_sheet_id,
    participant_role
  ) VALUES (
    v_session_id,
    p_user_id,
    p_character_sheet_id,
    'player'
  )
  RETURNING id INTO v_participant_id;

  -- Update player count
  UPDATE multiplayer_sessions
  SET current_players = current_players + 1
  WHERE id = v_session_id;

  RETURN v_participant_id;
END;
$$;

-- Calculate vote weight for participant
CREATE OR REPLACE FUNCTION calculate_vote_weight(
  p_participant_id UUID,
  p_choice_id UUID
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_weight DECIMAL(3,2) := 1.0;
  v_character_bonus DECIMAL(3,2) := 0.0;
  v_choice_type VARCHAR(50);
  v_character_specialization VARCHAR(100);
  v_character_level INTEGER;
BEGIN
  -- Get participant and character info
  SELECT
    sp.vote_weight,
    cs.specialization,
    cs.level
  INTO v_base_weight, v_character_specialization, v_character_level
  FROM session_participants sp
  LEFT JOIN character_sheets cs ON sp.character_sheet_id = cs.id
  WHERE sp.id = p_participant_id;

  -- Get choice type
  SELECT choice_type INTO v_choice_type
  FROM audio_choices
  WHERE id = p_choice_id;

  -- Calculate character bonuses
  IF v_character_specialization IS NOT NULL THEN
    CASE
      WHEN v_choice_type = 'combat' AND v_character_specialization = 'combat' THEN
        v_character_bonus := v_character_bonus + 0.3;
      WHEN v_choice_type = 'social' AND v_character_specialization = 'social' THEN
        v_character_bonus := v_character_bonus + 0.3;
      WHEN v_choice_type = 'magic' AND v_character_specialization = 'magic' THEN
        v_character_bonus := v_character_bonus + 0.3;
      WHEN v_choice_type = 'stealth' AND v_character_specialization = 'stealth' THEN
        v_character_bonus := v_character_bonus + 0.3;
      WHEN v_choice_type = 'technical' AND v_character_specialization = 'technical' THEN
        v_character_bonus := v_character_bonus + 0.3;
      WHEN v_choice_type = 'survival' AND v_character_specialization = 'survival' THEN
        v_character_bonus := v_character_bonus + 0.3;
      ELSE
        -- General bonus for any matching specialization
        v_character_bonus := v_character_bonus + 0.1;
    END CASE;
  END IF;

  -- Level bonus (max +0.2 at level 20)
  v_character_bonus := v_character_bonus + LEAST(v_character_level * 0.01, 0.2);

  RETURN LEAST(v_base_weight + v_character_bonus, 3.0); -- Cap at 3.0
END;
$$;

-- Cast vote in voting round
CREATE OR REPLACE FUNCTION cast_vote(
  p_session_id UUID,
  p_participant_id UUID,
  p_choice_id UUID,
  p_voting_round_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_vote_weight DECIMAL(3,2);
  v_existing_vote_id UUID;
BEGIN
  -- Calculate vote weight
  v_vote_weight := calculate_vote_weight(p_participant_id, p_choice_id);

  -- Check if vote already exists for this round
  SELECT id INTO v_existing_vote_id
  FROM choice_votes
  WHERE session_id = p_session_id
    AND participant_id = p_participant_id
    AND (voting_round_id = p_voting_round_id OR (voting_round_id IS NULL AND p_voting_round_id IS NULL));

  IF v_existing_vote_id IS NOT NULL THEN
    -- Update existing vote
    UPDATE choice_votes
    SET
      choice_id = p_choice_id,
      vote_weight = v_vote_weight,
      changed_vote = true,
      voted_at = NOW()
    WHERE id = v_existing_vote_id;
  ELSE
    -- Insert new vote
    INSERT INTO choice_votes (
      session_id,
      voting_round_id,
      participant_id,
      choice_id,
      vote_weight,
      voted_at
    ) VALUES (
      p_session_id,
      p_voting_round_id,
      p_participant_id,
      p_choice_id,
      v_vote_weight,
      NOW()
    );
  END IF;

  -- Update participant's last vote time
  UPDATE session_participants
  SET last_vote_at = NOW()
  WHERE id = p_participant_id;

  RETURN true;
END;
$$;

-- Resolve voting round
CREATE OR REPLACE FUNCTION resolve_voting_round(
  p_voting_round_id UUID,
  p_force_resolution BOOLEAN DEFAULT false
)
RETURNS TABLE (
  winning_choice_id UUID,
  majority_achieved BOOLEAN,
  total_votes INTEGER,
  consensus_level DECIMAL(3,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_majority_threshold DECIMAL(3,2);
  v_total_vote_weight DECIMAL(5,2) := 0.0;
  v_winning_choice_id UUID;
  v_winning_weight DECIMAL(5,2) := 0.0;
  v_majority_achieved BOOLEAN := false;
  v_consensus_level DECIMAL(3,2) := 0.0;
  v_total_votes INTEGER := 0;
BEGIN
  -- Get session info
  SELECT ms.id, ms.majority_threshold
  INTO v_session_id, v_majority_threshold
  FROM voting_rounds vr
  JOIN multiplayer_sessions ms ON vr.session_id = ms.id
  WHERE vr.id = p_voting_round_id;

  -- Calculate total vote weight
  SELECT SUM(vote_weight) INTO v_total_vote_weight
  FROM choice_votes
  WHERE voting_round_id = p_voting_round_id;

  GET DIAGNOSTICS v_total_votes = ROW_COUNT;

  -- Find winning choice
  SELECT
    choice_id,
    SUM(vote_weight) as total_weight
  INTO v_winning_choice_id, v_winning_weight
  FROM choice_votes
  WHERE voting_round_id = p_voting_round_id
  GROUP BY choice_id
  ORDER BY total_weight DESC
  LIMIT 1;

  -- Calculate consensus level (winning choice percentage)
  IF v_total_vote_weight > 0 THEN
    v_consensus_level := v_winning_weight / v_total_vote_weight;
    v_majority_achieved := v_consensus_level >= v_majority_threshold;
  END IF;

  -- Update voting round
  UPDATE voting_rounds
  SET
    round_status = CASE WHEN v_majority_achieved OR p_force_resolution THEN 'completed' ELSE 'active' END,
    ended_at = CASE WHEN v_majority_achieved OR p_force_resolution THEN NOW() ELSE NULL END,
    winning_choice_id = v_winning_choice_id,
    total_votes = v_total_votes,
    total_vote_weight = v_total_vote_weight,
    majority_achieved = v_majority_achieved,
    consensus_level = v_consensus_level
  WHERE id = p_voting_round_id;

  RETURN QUERY SELECT v_winning_choice_id, v_majority_achieved, v_total_votes, v_consensus_level;
END;
$$;

-- Get session participants with vote status
CREATE OR REPLACE FUNCTION get_session_participants(p_session_id UUID)
RETURNS TABLE (
  participant_id UUID,
  user_id UUID,
  character_name VARCHAR(255),
  participant_role VARCHAR(20),
  vote_weight DECIMAL(3,2),
  has_voted BOOLEAN,
  last_vote_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN,
  connection_quality VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id as participant_id,
    sp.user_id,
    COALESCE(cs.name, 'No Character') as character_name,
    sp.participant_role,
    sp.vote_weight,
    CASE WHEN cv.id IS NOT NULL THEN true ELSE false END as has_voted,
    sp.last_vote_at,
    sp.is_connected,
    sp.connection_quality
  FROM session_participants sp
  LEFT JOIN character_sheets cs ON sp.character_sheet_id = cs.id
  LEFT JOIN choice_votes cv ON sp.id = cv.participant_id
    AND cv.voting_round_id = (
      SELECT id FROM voting_rounds
      WHERE session_id = p_session_id AND round_status = 'active'
      ORDER BY started_at DESC LIMIT 1
    )
  WHERE sp.session_id = p_session_id
  ORDER BY sp.joined_at;
END;
$$;

-- Get voting results for current round
CREATE OR REPLACE FUNCTION get_voting_results(p_session_id UUID)
RETURNS TABLE (
  choice_id UUID,
  choice_text VARCHAR(1000),
  total_votes INTEGER,
  total_weight DECIMAL(5,2),
  percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_round_id UUID;
  v_total_weight DECIMAL(5,2) := 0.0;
BEGIN
  -- Get active voting round
  SELECT id INTO v_round_id
  FROM voting_rounds
  WHERE session_id = p_session_id AND round_status = 'active'
  ORDER BY started_at DESC LIMIT 1;

  IF v_round_id IS NULL THEN
    RETURN;
  END IF;

  -- Get total weight for percentage calculation
  SELECT SUM(vote_weight) INTO v_total_weight
  FROM choice_votes
  WHERE voting_round_id = v_round_id;

  -- Return results
  RETURN QUERY
  SELECT
    ac.id as choice_id,
    ac.choice_text,
    COUNT(cv.id)::INTEGER as total_votes,
    COALESCE(SUM(cv.vote_weight), 0) as total_weight,
    CASE WHEN v_total_weight > 0 THEN (COALESCE(SUM(cv.vote_weight), 0) / v_total_weight) * 100 ELSE 0 END as percentage
  FROM audio_choices ac
  LEFT JOIN choice_votes cv ON ac.id = cv.choice_id AND cv.voting_round_id = v_round_id
  WHERE ac.audiobook_id = (
    SELECT current_audiobook_id FROM multiplayer_sessions WHERE id = p_session_id
  )
  GROUP BY ac.id, ac.choice_text
  ORDER BY total_weight DESC;
END;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_multiplayer_session_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_multiplayer_sessions_updated_at
  BEFORE UPDATE ON multiplayer_sessions
  FOR EACH ROW EXECUTE FUNCTION update_multiplayer_session_updated_at_column();

-- Sample data for testing
INSERT INTO multiplayer_sessions (
  host_user_id,
  audiobook_id,
  current_audiobook_id,
  session_code,
  max_players,
  session_status
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '50e0ebba-659e-42ce-ae73-eb3c034ebc60',
  '50e0ebba-659e-42ce-ae73-eb3c034ebc60',
  'DEMO123',
  4,
  'waiting'
);