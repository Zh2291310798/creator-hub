-- CreatorHub v3 security hardening
--
-- Apply steps:
-- 1. Open Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire file into a new query.
-- 3. Click Run and confirm it completes without errors.
-- 4. Run the same query a second time to verify idempotency.
-- 5. Deploy the frontend only after the migration succeeds.

CREATE OR REPLACE FUNCTION current_username()
RETURNS text AS $$
  SELECT username FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY INVOKER;

REVOKE UPDATE (xp, level, trust_score) ON profiles FROM authenticated;
REVOKE UPDATE (xp, level, trust_score) ON profiles FROM anon;

DROP POLICY IF EXISTS "allow_insert_auth" ON posts;
DROP POLICY IF EXISTS "posts_insert_own_v2" ON posts;
CREATE POLICY "posts_insert_own_v2" ON posts FOR INSERT
  WITH CHECK (author = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON comments;
DROP POLICY IF EXISTS "comments_insert_own_v2" ON comments;
CREATE POLICY "comments_insert_own_v2" ON comments FOR INSERT
  WITH CHECK (author = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own_v2" ON chat_messages;
CREATE POLICY "chat_messages_insert_own_v2" ON chat_messages FOR INSERT
  WITH CHECK (sender = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON world_messages;
DROP POLICY IF EXISTS "world_messages_insert_own_v2" ON world_messages;
CREATE POLICY "world_messages_insert_own_v2" ON world_messages FOR INSERT
  WITH CHECK (sender = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own_v2" ON notifications;
CREATE POLICY "notifications_insert_own_v2" ON notifications FOR INSERT
  WITH CHECK (from_user = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON recruits;
DROP POLICY IF EXISTS "recruits_insert_own_v2" ON recruits;
CREATE POLICY "recruits_insert_own_v2" ON recruits FOR INSERT
  WITH CHECK (poster = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON match_demands;
DROP POLICY IF EXISTS "match_demands_insert_own_v2" ON match_demands;
CREATE POLICY "match_demands_insert_own_v2" ON match_demands FOR INSERT
  WITH CHECK (poster = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON local_demands;
DROP POLICY IF EXISTS "local_demands_insert_own_v2" ON local_demands;
CREATE POLICY "local_demands_insert_own_v2" ON local_demands FOR INSERT
  WITH CHECK (poster = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON friends;
DROP POLICY IF EXISTS "friends_insert_own_v2" ON friends;
CREATE POLICY "friends_insert_own_v2" ON friends FOR INSERT
  WITH CHECK (username = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert_own_v2" ON friend_requests;
CREATE POLICY "friend_requests_insert_own_v2" ON friend_requests FOR INSERT
  WITH CHECK (from_user = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON xp_records;
DROP POLICY IF EXISTS "xp_records_insert_own_v2" ON xp_records;
CREATE POLICY "xp_records_insert_own_v2" ON xp_records FOR INSERT
  WITH CHECK (username = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_auth" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own_v2" ON reviews;
CREATE POLICY "reviews_insert_own_v2" ON reviews FOR INSERT
  WITH CHECK (reviewer = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON invitation_codes;
DROP POLICY IF EXISTS "invite_insert_auth" ON invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_insert_own_v2" ON invitation_codes;
CREATE POLICY "invitation_codes_insert_own_v2" ON invitation_codes FOR INSERT
  WITH CHECK (inviter_username = current_username());

DROP POLICY IF EXISTS "allow_insert_auth" ON post_likes;
DROP POLICY IF EXISTS "likes_insert_auth" ON post_likes;
DROP POLICY IF EXISTS "post_likes_insert_own_v2" ON post_likes;
CREATE POLICY "post_likes_insert_own_v2" ON post_likes FOR INSERT
  WITH CHECK (username = current_username());

DROP POLICY IF EXISTS "track_read_own" ON tracking_events;
CREATE POLICY "track_read_own" ON tracking_events FOR SELECT
  USING (current_username() = username);

CREATE OR REPLACE FUNCTION is_username_allowed(p_username text)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(p_username, '') !~* '^(admin|root|官方|客服|支付宝|微信|抖音|小红书|creatorhub|系统)$';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION award_xp(p_amount int, p_reason text)
RETURNS jsonb AS $$
DECLARE
  caller text;
  total_today int;
  reason_today int;
  new_xp int;
  clean_reason text := COALESCE(p_reason, '');
BEGIN
  caller := current_username();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_today
  FROM xp_records
  WHERE username = caller
    AND created_at >= date_trunc('day', now());

  IF total_today + p_amount > 500 THEN
    RAISE EXCEPTION 'daily cap exceeded';
  END IF;

  IF clean_reason = '邀请好友注册' THEN
    SELECT COALESCE(SUM(amount), 0) INTO reason_today
    FROM xp_records
    WHERE username = caller
      AND reason = clean_reason
      AND created_at >= date_trunc('day', now());

    IF reason_today + p_amount > 250 THEN
      RAISE EXCEPTION 'daily cap exceeded';
    END IF;
  END IF;

  INSERT INTO xp_records (username, amount, reason)
  VALUES (caller, p_amount, clean_reason);

  UPDATE profiles
  SET xp = COALESCE(xp, 0) + p_amount,
      level = FLOOR((COALESCE(xp, 0) + p_amount) / 100) + 1
  WHERE username = caller
  RETURNING xp INTO new_xp;

  RETURN jsonb_build_object('username', caller, 'xp', new_xp, 'level', FLOOR(new_xp / 100) + 1);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION redeem_invite_code(p_code text)
RETURNS jsonb AS $$
DECLARE
  caller text;
  inviter text;
  existing_used_by text;
  day_total int;
  reason_total int;
BEGIN
  caller := current_username();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT inviter_username, used_by INTO inviter, existing_used_by
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF inviter IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF existing_used_by IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_used');
  END IF;
  IF inviter = caller THEN
    RETURN jsonb_build_object('status', 'self_invite');
  END IF;

  UPDATE invitation_codes
  SET used_by = caller,
      used_at = NOW()
  WHERE code = p_code AND used_by IS NULL;

  INSERT INTO friends (username, friend_name)
  VALUES (inviter, caller)
  ON CONFLICT (username, friend_name) DO NOTHING;

  INSERT INTO friends (username, friend_name)
  VALUES (caller, inviter)
  ON CONFLICT (username, friend_name) DO NOTHING;

  SELECT COALESCE(SUM(amount), 0) INTO day_total
  FROM xp_records
  WHERE username = inviter
    AND created_at >= date_trunc('day', now());

  SELECT COALESCE(SUM(amount), 0) INTO reason_total
  FROM xp_records
  WHERE username = inviter
    AND reason = '邀请好友注册'
    AND created_at >= date_trunc('day', now());

  IF day_total + 50 <= 500 AND reason_total + 50 <= 250 THEN
    INSERT INTO xp_records (username, amount, reason)
    VALUES (inviter, 50, '邀请好友注册');

    UPDATE profiles
    SET xp = COALESCE(xp, 0) + 50,
        level = FLOOR((COALESCE(xp, 0) + 50) / 100) + 1
    WHERE username = inviter;
  END IF;

  INSERT INTO notifications (username, type, content, from_user)
  VALUES (inviter, '好友', caller || ' 通过你的邀请链接注册了！', caller);

  RETURN jsonb_build_object('status', 'ok', 'inviter', inviter, 'friend', caller);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION follow_mentor(p_mentor text)
RETURNS jsonb AS $$
DECLARE
  caller text;
BEGIN
  caller := current_username();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_mentor IS NULL OR btrim(p_mentor) = '' OR p_mentor = caller THEN
    RETURN jsonb_build_object('status', 'noop');
  END IF;

  INSERT INTO friends (username, friend_name)
  VALUES (caller, p_mentor)
  ON CONFLICT (username, friend_name) DO NOTHING;

  INSERT INTO friends (username, friend_name)
  VALUES (p_mentor, caller)
  ON CONFLICT (username, friend_name) DO NOTHING;

  RETURN jsonb_build_object('status', 'ok', 'mentor', p_mentor, 'follower', caller);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION recompute_trust_score(p_username text)
RETURNS integer AS $$
DECLARE
  score integer;
BEGIN
  IF pg_trigger_depth() <= 0 THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT calc_trust_score(p_username) INTO score;
  UPDATE profiles SET trust_score = score WHERE username = p_username;
  RETURN score;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION reviews_recompute_trust_score()
RETURNS trigger AS $$
BEGIN
  PERFORM recompute_trust_score(NEW.reviewee);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS reviews_recompute_trust_score_after_insert ON reviews;
CREATE TRIGGER reviews_recompute_trust_score_after_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION reviews_recompute_trust_score();

CREATE OR REPLACE FUNCTION confirm_deal(p_deal_id text, p_partner text)
RETURNS text AS $$
DECLARE
  caller text;
  deal_poster text;
  current_status text;
BEGIN
  caller := current_username();
  SELECT poster, deal_status INTO deal_poster, current_status FROM match_demands WHERE id = p_deal_id;

  IF caller IS NULL OR deal_poster IS NULL OR caller != deal_poster THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF current_status != 'negotiating' AND current_status != 'open' THEN
    RETURN 'error: invalid status';
  END IF;

  UPDATE match_demands SET deal_status = 'active', deal_partner = p_partner, deal_confirmed_at = now()
  WHERE id = p_deal_id;
  INSERT INTO notifications (username, type, content, from_user)
  VALUES (p_partner, '对接', '合作已确认！', deal_poster);
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION complete_deal(p_deal_id text)
RETURNS text AS $$
DECLARE
  caller text;
  deal_poster text;
  partner text;
BEGIN
  caller := current_username();
  SELECT poster, deal_partner INTO deal_poster, partner FROM match_demands WHERE id = p_deal_id;

  IF caller IS NULL OR deal_poster IS NULL OR (caller != deal_poster AND caller != partner) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE match_demands SET deal_status = 'completed', deal_closed_at = now()
  WHERE id = p_deal_id AND deal_status = 'active';
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_review(p_reviewer text, p_reviewee text, p_deal_id text)
RETURNS boolean AS $$
DECLARE
  caller text;
  msg_count integer;
  already_reviewed boolean;
BEGIN
  caller := current_username();
  IF caller IS NULL OR p_reviewer != caller THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO msg_count FROM chat_messages
  WHERE (sender = p_reviewer AND recipient = p_reviewee)
     OR (sender = p_reviewee AND recipient = p_reviewer);

  SELECT EXISTS(
    SELECT 1 FROM reviews WHERE deal_id = p_deal_id AND reviewer = p_reviewer
  ) INTO already_reviewed;

  RETURN msg_count >= 5 AND NOT already_reviewed;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_poll_updates(
  since_ts timestamptz,
  username_query text,
  post_ids text[]
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  caller text;
BEGIN
  caller := current_username();
  IF caller IS NULL OR username_query != caller THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'new_posts', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM posts WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 20
    ) t), '[]'::jsonb),
    'notifs', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM notifications WHERE username = username_query AND created_at > since_ts ORDER BY created_at DESC LIMIT 20
    ) t), '[]'::jsonb),
    'chat_msgs', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM chat_messages WHERE (sender = username_query OR recipient = username_query) AND created_at > since_ts ORDER BY created_at ASC LIMIT 50
    ) t), '[]'::jsonb),
    'new_comments', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM comments WHERE post_id = ANY(post_ids) AND created_at > since_ts ORDER BY created_at ASC LIMIT 30
    ) t), '[]'::jsonb),
    'likes_sync', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT id AS post_id, likes FROM posts WHERE id = ANY(post_ids) AND updated_at > since_ts
    ) t), '[]'::jsonb),
    'new_recruits', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM recruits WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb),
    'new_matches', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM match_demands WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb),
    'new_local', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM local_demands WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tracking_events_stamp_username()
RETURNS trigger AS $$
DECLARE
  caller text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    caller := current_username();
    NEW.username := COALESCE(caller, 'anonymous');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tracking_events_stamp_username_before_insert ON tracking_events;
CREATE TRIGGER tracking_events_stamp_username_before_insert
  BEFORE INSERT ON tracking_events
  FOR EACH ROW EXECUTE FUNCTION tracking_events_stamp_username();

CREATE OR REPLACE FUNCTION check_chat_message_rate()
RETURNS trigger AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM chat_messages
  WHERE sender = NEW.sender
    AND created_at > now() - interval '60 seconds';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS chat_messages_rate_before_insert ON chat_messages;
CREATE TRIGGER chat_messages_rate_before_insert
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION check_chat_message_rate();

CREATE OR REPLACE FUNCTION check_world_message_rate()
RETURNS trigger AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM world_messages
  WHERE sender = NEW.sender
    AND created_at > now() - interval '60 seconds';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS world_messages_rate_before_insert ON world_messages;
CREATE TRIGGER world_messages_rate_before_insert
  BEFORE INSERT ON world_messages
  FOR EACH ROW EXECUTE FUNCTION check_world_message_rate();
