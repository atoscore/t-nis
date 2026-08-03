-- ==========================================
-- TENNIS OS - CORE SUPABASE SCHEMA
-- Phase 1 & 2: Foundations, Tournaments, Marketplace, AI Coach
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    elo_rating INTEGER DEFAULT 1200,
    class_level TEXT,
    avatar_url TEXT,
    is_pro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. MATCHES
CREATE TYPE match_status AS ENUM ('LIVE', 'COMPLETED', 'SCHEDULED');

CREATE TABLE public.matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player1_id UUID REFERENCES public.users(id),
    player2_id UUID REFERENCES public.users(id),
    status match_status DEFAULT 'SCHEDULED',
    winner_id UUID REFERENCES public.users(id),
    match_duration INTERVAL,
    court_surface TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Players can create and update matches" ON public.matches 
    FOR ALL USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- 3. MATCH EVENTS (The Goldmine)
CREATE TYPE event_type AS ENUM ('ACE', 'FAULT', 'DOUBLE_FAULT', 'WINNER', 'UNFORCED_ERROR', 'FORCED_ERROR');
CREATE TYPE stroke_type AS ENUM ('FOREHAND', 'BACKHAND', 'VOLLEY', 'SMASH', 'SERVE');

CREATE TABLE public.match_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) NOT NULL,
    player_id UUID REFERENCES public.users(id) NOT NULL,
    event_type event_type NOT NULL,
    stroke_type stroke_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Events
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Players in match can insert events" ON public.match_events 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.matches 
            WHERE id = match_id AND (player1_id = auth.uid() OR player2_id = auth.uid())
        )
    );

-- 4. MARKETPLACE STORES (Phase 2)
CREATE TABLE public.marketplace_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    brand_name TEXT NOT NULL,
    is_verified_brand BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stores viewable by everyone" ON public.marketplace_stores FOR SELECT USING (true);

-- 5. FEED POSTS / MARKETPLACE LISTINGS
CREATE TABLE public.feed_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    store_id UUID REFERENCES public.marketplace_stores(id),
    content TEXT,
    media_url TEXT,
    is_marketplace_item BOOLEAN DEFAULT FALSE,
    price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by everyone" ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. COMMUNITIES
CREATE TABLE public.communities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public communities viewable by everyone" ON public.communities FOR SELECT USING (is_private = FALSE);

-- 7. TOURNAMENTS (Phase 2)
CREATE TYPE tournament_format AS ENUM ('KNOCKOUT', 'ROUND_ROBIN');

CREATE TABLE public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    start_date DATE,
    end_date DATE,
    format tournament_format DEFAULT 'KNOCKOUT',
    status TEXT DEFAULT 'UPCOMING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);

-- 8. TOURNAMENT MATCHES (Brackets - Phase 2)
CREATE TABLE public.tournament_matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) NOT NULL,
    match_id UUID REFERENCES public.matches(id) NOT NULL,
    round_name TEXT NOT NULL, -- e.g., 'Quarterfinals', 'Semifinals'
    round_order INTEGER NOT NULL, -- To help sort rounds (e.g., 1 for QF, 2 for SF, 3 for Final)
    next_match_id UUID REFERENCES public.tournament_matches(id),
    is_player1_source BOOLEAN DEFAULT TRUE, -- TRUE if winner goes to player1 slot in next match
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament matches viewable by everyone" ON public.tournament_matches FOR SELECT USING (true);

-- 9. PRO INSIGHTS LIBRARY (Phase 2)
CREATE TABLE public.pro_insights_library (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    insight_trigger TEXT NOT NULL UNIQUE, -- e.g. 'LOW_FIRST_SERVE_PCT', 'HIGH_BACKHAND_UF_ERROR'
    video_url TEXT,
    tip_title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.pro_insights_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insights viewable by everyone" ON public.pro_insights_library FOR SELECT USING (true);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- ELO Rating Calculation
CREATE OR REPLACE FUNCTION update_elo_after_match()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED' AND NEW.winner_id IS NOT NULL THEN
        UPDATE public.users SET elo_rating = elo_rating + 25 WHERE id = NEW.winner_id;
        UPDATE public.users SET elo_rating = GREATEST(elo_rating - 25, 0)
        WHERE (id = NEW.player1_id OR id = NEW.player2_id) AND id != NEW.winner_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_elo
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION update_elo_after_match();

-- Tournament Bracket Advancement Logic (Phase 2)
CREATE OR REPLACE FUNCTION advance_tournament_bracket()
RETURNS TRIGGER AS $$
DECLARE
    tm_record RECORD;
    next_tm_record RECORD;
BEGIN
    -- If a match is completed, check if it is part of a tournament
    IF OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED' AND NEW.winner_id IS NOT NULL THEN
        -- Find the tournament match link
        SELECT * INTO tm_record FROM public.tournament_matches WHERE match_id = NEW.id;
        
        IF tm_record.id IS NOT NULL AND tm_record.next_match_id IS NOT NULL THEN
            -- Advance winner to the next match
            SELECT * INTO next_tm_record FROM public.tournament_matches WHERE id = tm_record.next_match_id;
            IF tm_record.is_player1_source THEN
                UPDATE public.matches SET player1_id = NEW.winner_id WHERE id = next_tm_record.match_id;
            ELSE
                UPDATE public.matches SET player2_id = NEW.winner_id WHERE id = next_tm_record.match_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_advance_bracket
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION advance_tournament_bracket();

