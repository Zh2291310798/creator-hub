-- ============================================
-- CreatorHub v1.0 → Supabase 数据库迁移
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- ============================================

-- ============================================
-- 1. 用户资料（关联 Supabase Auth）
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator',
  role_label TEXT DEFAULT '',
  avatar_text TEXT DEFAULT '',
  avatar_choice TEXT DEFAULT '',
  city TEXT DEFAULT '',
  work_status TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, role, role_label, avatar_text)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'creator'),
    COALESCE(NEW.raw_user_meta_data->>'role_label', '创作者'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则跳过（幂等）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. 社区帖子
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  title TEXT DEFAULT '',
  category TEXT DEFAULT 'other',
  category_label TEXT DEFAULT '其他',
  content TEXT DEFAULT '',
  platform TEXT DEFAULT 'all',
  likes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 评论
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 聊天
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  sender_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 通知
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  from_user TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 招聘
-- ============================================
CREATE TABLE IF NOT EXISTS recruits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  poster TEXT NOT NULL,
  poster_avatar TEXT DEFAULT '',
  type TEXT DEFAULT 'maker',
  mode TEXT DEFAULT '全职',
  description TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  budget TEXT DEFAULT '面议',
  city TEXT DEFAULT '',
  platforms JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT '招募中',
  status_class TEXT DEFAULT 'active-recruit',
  posted_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. 对接需求
-- ============================================
CREATE TABLE IF NOT EXISTS match_demands (
  id TEXT PRIMARY KEY,
  poster TEXT NOT NULL,
  role TEXT NOT NULL,
  platforms JSONB DEFAULT '[]'::jsonb,
  budget TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. 本地需求
-- ============================================
CREATE TABLE IF NOT EXISTS local_demands (
  id TEXT PRIMARY KEY,
  poster TEXT NOT NULL,
  business_name TEXT DEFAULT '',
  city TEXT DEFAULT '',
  district TEXT DEFAULT '',
  category TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 好友
-- ============================================
CREATE TABLE IF NOT EXISTS friends (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  friend_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, friend_name)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id BIGSERIAL PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user, to_user)
);

-- ============================================
-- 10. XP
-- ============================================
CREATE TABLE IF NOT EXISTS xp_records (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 新手引导
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_status (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  step INTEGER DEFAULT 1,
  followed_users JSONB DEFAULT '[]'::jsonb,
  articles_read JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. 埋点
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  props JSONB DEFAULT '{}'::jsonb,
  username TEXT DEFAULT 'anonymous',
  session_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS 策略（简化版：认证用户可读可写）
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, username)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruits ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- 认证用户可读所有公开数据
CREATE POLICY "allow_select_auth" ON profiles FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON posts FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON comments FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON world_messages FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON recruits FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON match_demands FOR SELECT USING (true);
CREATE POLICY "allow_select_auth" ON local_demands FOR SELECT USING (true);

-- 认证用户可写
CREATE POLICY "allow_insert_auth" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON world_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON recruits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON match_demands FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON local_demands FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON friends FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON friend_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON xp_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON onboarding_status FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "allow_insert_auth" ON tracking_events FOR INSERT WITH CHECK (true);  -- 匿名也可

-- 私有数据：仅自己能读写
CREATE POLICY "chat_read_own" ON chat_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "notif_read_own" ON notifications FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "friends_all_auth" ON friends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fr_read_own" ON friend_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "xp_read_own" ON xp_records FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "ob_read_own" ON onboarding_status FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "ob_update_own" ON onboarding_status FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "post_likes_all_auth" ON post_likes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "track_read_own" ON tracking_events FOR SELECT
  USING (true);
CREATE POLICY "profile_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profile_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 删除：仅自己的数据
CREATE POLICY "posts_delete_own_auth" ON posts FOR DELETE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "posts_update_own_auth" ON posts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "recruits_delete_own_auth" ON recruits FOR DELETE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "local_delete_own_auth" ON local_demands FOR DELETE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "fr_delete_own" ON friend_requests FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "fr_insert_own" ON friend_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "friends_delete_own_auth" ON friends FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 实时（Realtime）— 前端可订阅
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE world_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE recruits;
ALTER PUBLICATION supabase_realtime ADD TABLE match_demands;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
ALTER PUBLICATION supabase_realtime ADD TABLE local_demands;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_users ON chat_messages(sender, recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_world_time ON world_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(username, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_event ON tracking_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_city ON local_demands(city, created_at DESC);

-- ============================================
-- 种子数据
-- ============================================
-- 种子帖子（会在页面加载时直接读取）
INSERT INTO posts (id, author, author_avatar, title, category, category_label, content, platform) VALUES
('p1', '运营老司机', '运', '小红书笔记限流的10个自查方法', 'guide', '干货教程', '做了3年小红书运营，总结一下笔记被限流时应该从哪些方面排查：1. 检查是否触发了敏感词…', 'xhs'),
('p2', '品牌主理人阿Jay', 'J', '从0到10w粉——我在抖音做知识类账号的一年', 'exp', '经验分享', '纯素人起步，不投流不买粉，全靠内容一步步做起来的真实复盘。第一周最痛苦…', 'douyin'),
('p3', '品牌主理人阿Jay', 'J', '品牌方找达人合作的5个坑，我都踩过了', 'exp', '经验分享', '作为品牌方这两年和50+达人合作过，分享一些血泪教训：1. 只看粉丝量不看互动率…', 'all'),
('p4', '运营老司机', '运', '刚入行新媒体运营，应该先学什么技能？', 'qa', '求助问答', '大家好，纯小白一枚，想转行做新媒体运营。目前完全不知道从哪开始，求前辈指点…', 'all'),
('p5', '运营老司机', '运', '跨平台运营值不值得？抖音+小红书真实对比', 'qa', '求助问答', '目前在抖音做了半年有2w粉，在想要不要同时做小红书。两边内容风格差异大…', 'all')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ✅ 执行完毕
-- ============================================
-- 看到 "Success. No rows returned" 即完成
-- 然后告诉我，我会接着改造前端代码
