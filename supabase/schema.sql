-- LawHub Database Schema
-- Run this in your Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('client', 'lawyer', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lawyer-specific profile details
CREATE TABLE IF NOT EXISTS lawyer_profiles (
  id UUID REFERENCES profiles ON DELETE CASCADE PRIMARY KEY,
  bci_number TEXT UNIQUE,
  bar_council TEXT,
  primary_court TEXT,
  experience_years INT DEFAULT 0,
  practice_areas TEXT[] DEFAULT '{}',
  bio TEXT,
  fee_min INT,
  fee_max INT,
  linkedin_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  bci_doc_url TEXT,
  aadhaar_doc_url TEXT,
  degree_doc_url TEXT,
  total_cases INT DEFAULT 0,
  wins INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0
);

-- Legal briefs posted by clients
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  structured_summary TEXT,
  category TEXT NOT NULL,
  court TEXT NOT NULL,
  city TEXT,
  state TEXT,
  budget_min INT NOT NULL DEFAULT 500000,
  budget_max INT NOT NULL DEFAULT 5000000,
  urgency TEXT DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent', 'emergency')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'engaged', 'closed', 'moderated')),
  bid_count INT DEFAULT 0,
  closes_at TIMESTAMPTZ,
  engaged_lawyer_id UUID REFERENCES lawyer_profiles,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents attached to briefs
CREATE TABLE IF NOT EXISTS brief_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs ON DELETE CASCADE,
  uploader_id UUID REFERENCES profiles,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lawyer bids on briefs
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs ON DELETE CASCADE,
  lawyer_id UUID REFERENCES lawyer_profiles ON DELETE CASCADE,
  proposed_fee INT NOT NULL,
  fee_structure TEXT NOT NULL CHECK (fee_structure IN ('flat', 'milestone', 'retainer', 'hourly')),
  milestone_count INT DEFAULT 1,
  strategy_text TEXT,
  cover_letter TEXT,
  relevant_experience TEXT,
  availability TEXT,
  estimated_timeline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brief_id, lawyer_id)
);

-- Cases created when a bid is accepted
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs,
  client_id UUID REFERENCES profiles,
  lawyer_id UUID REFERENCES lawyer_profiles,
  bid_id UUID REFERENCES bids,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disputed', 'cancelled')),
  total_fee INT NOT NULL,
  fee_structure TEXT NOT NULL,
  milestone_count INT DEFAULT 1,
  current_milestone INT DEFAULT 0,
  next_hearing_date DATE,
  next_hearing_court TEXT,
  outcome TEXT CHECK (outcome IN ('won', 'lost', 'settled', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Payment milestones
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases ON DELETE CASCADE,
  client_id UUID REFERENCES profiles,
  lawyer_id UUID REFERENCES lawyer_profiles,
  milestone_number INT NOT NULL DEFAULT 1,
  amount INT NOT NULL,
  platform_fee INT NOT NULL,
  net_amount INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_payout_id TEXT,
  paid_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case timeline events
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-platform messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles,
  sender_role TEXT CHECK (sender_role IN ('client', 'lawyer')),
  content TEXT NOT NULL,
  file_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client reviews of lawyers
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases UNIQUE,
  client_id UUID REFERENCES profiles,
  lawyer_id UUID REFERENCES lawyer_profiles,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  lawyer_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  feature TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Update bid count when a bid is inserted
CREATE OR REPLACE FUNCTION update_brief_bid_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE briefs SET bid_count = bid_count + 1 WHERE id = NEW.brief_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_bid_created
  AFTER INSERT ON bids
  FOR EACH ROW EXECUTE PROCEDURE update_brief_bid_count();

-- Set brief closing time based on urgency
CREATE OR REPLACE FUNCTION set_brief_closes_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closes_at IS NULL THEN
    CASE NEW.urgency
      WHEN 'emergency' THEN NEW.closes_at := NOW() + INTERVAL '6 hours';
      WHEN 'urgent' THEN NEW.closes_at := NOW() + INTERVAL '24 hours';
      ELSE NEW.closes_at := NOW() + INTERVAL '48 hours';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_brief_created
  BEFORE INSERT ON briefs
  FOR EACH ROW EXECUTE PROCEDURE set_brief_closes_at();

-- Update lawyer avg rating when review is added
CREATE OR REPLACE FUNCTION update_lawyer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lawyer_profiles
  SET
    avg_rating = (SELECT AVG(rating) FROM reviews WHERE lawyer_id = NEW.lawyer_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE lawyer_id = NEW.lawyer_id)
  WHERE id = NEW.lawyer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE PROCEDURE update_lawyer_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Profiles: own + public lawyer profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Lawyers are publicly visible" ON profiles FOR SELECT USING (role = 'lawyer');
CREATE POLICY "All authenticated can read basic profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- Lawyer profiles: own + verified visible to all auth
CREATE POLICY "Lawyers manage own profile" ON lawyer_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Verified lawyers visible to all auth" ON lawyer_profiles FOR SELECT TO authenticated USING (verification_status = 'verified');
CREATE POLICY "Admins can see all" ON lawyer_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Briefs: clients own, verified lawyers can read open briefs
CREATE POLICY "Clients manage own briefs" ON briefs FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "Verified lawyers can read open briefs" ON briefs FOR SELECT TO authenticated USING (
  status = 'open' AND
  EXISTS (SELECT 1 FROM lawyer_profiles WHERE id = auth.uid() AND verification_status = 'verified')
);
CREATE POLICY "Admins can manage all briefs" ON briefs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Brief documents: uploader + case participants
CREATE POLICY "Uploaders manage own docs" ON brief_documents FOR ALL USING (auth.uid() = uploader_id);
CREATE POLICY "Brief client can read docs" ON brief_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM briefs WHERE id = brief_id AND client_id = auth.uid())
);

-- Bids: lawyers manage own, clients read bids on their briefs
CREATE POLICY "Lawyers manage own bids" ON bids FOR ALL USING (auth.uid() = lawyer_id);
CREATE POLICY "Clients can read bids on their briefs" ON bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM briefs WHERE id = brief_id AND client_id = auth.uid())
);

-- Cases: only participants
CREATE POLICY "Case participants can access" ON cases FOR ALL USING (
  auth.uid() = client_id OR auth.uid() = lawyer_id
);
CREATE POLICY "Admins can access all cases" ON cases FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payments: only case participants
CREATE POLICY "Payment participants can access" ON payments FOR ALL USING (
  auth.uid() = client_id OR auth.uid() = lawyer_id
);

-- Case events: case participants
CREATE POLICY "Case event participants" ON case_events FOR ALL USING (
  EXISTS (SELECT 1 FROM cases WHERE id = case_id AND (client_id = auth.uid() OR lawyer_id = auth.uid()))
);

-- Messages: only case participants
CREATE POLICY "Message participants only" ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM cases WHERE id = case_id AND (client_id = auth.uid() OR lawyer_id = auth.uid()))
);

-- Reviews: clients write, public read
CREATE POLICY "Clients write reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Lawyers reply to reviews" ON reviews FOR UPDATE USING (auth.uid() = lawyer_id);
CREATE POLICY "Reviews are public" ON reviews FOR SELECT TO authenticated USING (true);

-- Notifications: own only
CREATE POLICY "Users see own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- AI usage: own only
CREATE POLICY "Users see own AI usage" ON ai_usage FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run separately or via dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brief-docs', 'brief-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lawyer-docs', 'lawyer-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Enable realtime for notifications and messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE bids;
